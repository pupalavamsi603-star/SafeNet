#!/usr/bin/env node
/**
 * Build the SafeNet Android APK end to end:
 *   web build (pointed at the live API) -> capacitor sync -> gradle assemble
 *
 *   yarn apk                          # uses .env.mobile
 *   yarn apk https://api.example.com  # one-off override
 *   yarn apk --debug                  # unsigned debug build
 *
 * The API URL is baked into the JS bundle at build time, so changing it means
 * rebuilding — that is what this script is for.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ANDROID = path.join(ROOT, "android");
const isWin = process.platform === "win32";

const args = process.argv.slice(2);
const debug = args.includes("--debug");
const urlArg = args.find((a) => a.startsWith("http"));

// --- resolve the API URL: CLI arg > env > .env.mobile ---
function fromEnvFile() {
  const file = path.join(ROOT, ".env.mobile");
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("REACT_APP_BACKEND_URL="));
  return line ? line.split("=").slice(1).join("=").trim() : null;
}

const apiUrl = urlArg || process.env.SAFENET_API_URL || fromEnvFile();
if (!apiUrl) {
  console.error(
    "\nNo backend URL. Set one in frontend/.env.mobile:\n" +
    "  REACT_APP_BACKEND_URL=https://your-backend.onrender.com\n" +
    "or pass it directly:  yarn apk https://your-backend.onrender.com\n"
  );
  process.exit(1);
}
if (apiUrl.startsWith("http://") && !apiUrl.includes("localhost")) {
  console.error(`\nRefusing to build against plain http: ${apiUrl}`);
  console.error("Android blocks cleartext traffic by default — use https.\n");
  process.exit(1);
}

// --- the Android SDK and a JDK 21 toolchain Gradle can actually use ---
function findJdk() {
  for (const dir of [process.env.CAPACITOR_ANDROID_STUDIO_JDK, process.env.JAVA_HOME]) {
    if (dir && /\b(17|21)\b/.test(dir) && fs.existsSync(dir)) return dir;
  }
  // Forward slashes throughout — Node accepts them on Windows and they survive
  // every layer of quoting without turning into escape sequences.
  const candidates = [
    "C:/Program Files/Android/Android Studio/jbr",
    "C:/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot",
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    "/usr/lib/jvm/java-21-openjdk-amd64",
  ];
  return candidates.find((d) => fs.existsSync(d)) || null;
}

const jdk = findJdk();
if (!jdk) {
  console.error("\nNo JDK 17/21 found. Android Gradle Plugin does not support newer JDKs.");
  console.error("Install one, or set JAVA_HOME to Android Studio's bundled jbr.\n");
  process.exit(1);
}

const run = (cmd, cmdArgs, cwd, env) =>
  execFileSync(cmd, cmdArgs, { cwd, stdio: "inherit", shell: isWin, env: { ...process.env, ...env } });

console.log(`\n[1/3] Building web assets against ${apiUrl}`);
run("node", ["scripts/build.js"], ROOT, { REACT_APP_BACKEND_URL: apiUrl });

console.log("\n[2/3] Syncing web assets into the Android project");
run("npx", ["cap", "sync", "android"], ROOT);

const task = debug ? "assembleDebug" : "assembleRelease";
console.log(`\n[3/3] Gradle ${task} (JDK: ${jdk})`);
// Absolute + quoted: cmd.exe will not resolve a bare gradlew.bat from cwd, and
// either path may sit under "Program Files".
const gradlew = path.join(ANDROID, isWin ? "gradlew.bat" : "gradlew");
run(`"${gradlew}"`, [task], ANDROID, { JAVA_HOME: jdk });

const variant = debug ? "debug" : "release";
const built = path.join(ANDROID, "app", "build", "outputs", "apk", variant, `app-${variant}.apk`);
if (!fs.existsSync(built)) {
  console.error(`\nGradle finished but no APK at ${built}`);
  process.exit(1);
}

const distDir = path.join(ROOT, "dist-apk");
fs.mkdirSync(distDir, { recursive: true });
const out = path.join(distDir, `SafeNet-${variant}.apk`);
fs.copyFileSync(built, out);

const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`\nAPK ready: ${out}  (${mb} MB)`);
console.log(`API baked in: ${apiUrl}`);
if (!debug) console.log("Signed with android/safenet-release.keystore");
