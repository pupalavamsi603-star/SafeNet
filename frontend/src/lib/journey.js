// Only navigation parameters are allowed in return URLs; scan contents stay out.
const paths = new Set(["/", "/ai", "/dashboard", "/quiz", "/report", "/scams", "/tips", "/about", "/contact", "/admin"]);
export function safeDestination(value, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value) || [...value].some((char) => char.charCodeAt(0) < 32)) return fallback;
  try {
    const url = new URL(value, "https://safenet.invalid");
    if (url.origin !== "https://safenet.invalid" || (!paths.has(url.pathname) && !/^\/scams\/[a-z0-9-]+$/.test(url.pathname))) return fallback;
    const clean = new URLSearchParams();
    if (url.pathname === "/ai") {
      if (["url", "qr", "detect", "chat"].includes(url.searchParams.get("tab"))) clean.set("tab", url.searchParams.get("tab"));
      if (/^[a-zA-Z0-9_-]{1,120}$/.test(url.searchParams.get("session") || "")) clean.set("session", url.searchParams.get("session"));
    }
    if (url.pathname === "/dashboard" && url.searchParams.get("view") === "history") clean.set("view", "history");
    const hash = url.pathname === "/" && ["#features", "#how-it-works", "#urgent-help"].includes(url.hash) ? url.hash : "";
    return url.pathname + (clean.toString() ? `?${clean}` : "") + hash;
  } catch { return fallback; }
}
export function authLink(page, destination) {
  return `/${page}?next=${encodeURIComponent(safeDestination(destination))}`;
}
export function authIntent(search) {
  const next = safeDestination(new URLSearchParams(search).get("next"));
  const context = next === "/quiz" ? "Sign in to take the safety quiz and keep your learning progress."
    : next.includes("view=history") ? "Sign in to review your saved activity."
    : next.startsWith("/ai?tab=chat") ? "Sign in to continue to SafeNet AI. Conversations stay with the account that created them."
    : next.startsWith("/ai") ? "Continue to your check after signing in. Your current result is not saved by signing in."
    : "Sign in to your safety plan, recent activity and learning progress.";
  return { next, context };
}
