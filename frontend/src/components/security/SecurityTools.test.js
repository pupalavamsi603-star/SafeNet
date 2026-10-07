import { act } from "react";
import { createRoot } from "react-dom/client";
import { URLTool, validateURL } from "./URLTool";
import { ChatTab, DetectTab, QRTab } from "./AnalysisTools";
import { ScanResult, riskCategory } from "./ScanResult";
import { api } from "../../lib/api";
import { Html5Qrcode } from "html5-qrcode";

jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("../../lib/api", () => ({
  api: { post: jest.fn(), get: jest.fn() },
  getRetryAfterSeconds: (e) => e.response?.status === 429 ? 2 : null,
  formatApiErrorDetail: (detail) => detail || "Unable to connect. Try again.",
}));
jest.mock("./PhonePairing", () => ({ PhonePairing: () => null }));
jest.mock("html5-qrcode", () => ({ Html5Qrcode: jest.fn() }));

let container, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  sessionStorage.clear();
  api.get.mockResolvedValue({ data: [] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.useRealTimers(); });
const render = async (ui) => act(async () => root.render(ui));
const click = async (selector) => act(async () => container.querySelector(selector).click());
const fill = async (selector, value) => act(async () => {
  const input = container.querySelector(selector);
  const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

test.each(["example.com", "https://example.com/path?q=1", "http://127.0.0.1/path"])("accepts a URL without opening it: %s", (url) => expect(validateURL(url)).toBe(""));
test.each(["", "not a link", "javascript:alert(1)", "https://", "ftp://example.com"])("rejects invalid or unsupported URL: %s", (url) => expect(validateURL(url)).not.toBe(""));

test("URL submission uses the existing endpoint and prevents duplicate submissions during loading", async () => {
  let complete;
  api.post.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  await render(<URLTool />);
  await fill("input", "https://example.com");
  await click("button");
  expect(api.post).toHaveBeenCalledWith("/ai/url-check", { url: "https://example.com" });
  expect(container.textContent).toContain("Analyzing with AI");
  await click("button");
  expect(api.post).toHaveBeenCalledTimes(1);
  await act(async () => complete({ data: { risk_level: "safe", risk_score: 5, explanation: "Provider explanation" } }));
  expect(container.textContent).toContain("Looks safe");
  expect(container.textContent).toContain("Provider explanation");
  await fill("input", "https://different.example");
  expect(container.textContent).not.toContain("Provider explanation");
});

test("API failure produces a persistent accessible error and allows retry", async () => {
  api.post.mockRejectedValue({ response: { data: { detail: "Analysis unavailable. Try again." } } });
  await render(<URLTool />);
  await fill("input", "example.com");
  await click("button");
  expect(container.querySelector('[role="alert"]').textContent).toContain("Analysis unavailable");
  expect(container.querySelector("button").disabled).toBe(false);
  expect(container.textContent).not.toContain("Looks safe");
});

test("rate limit disables submission until the actual retry interval expires", async () => {
  jest.useFakeTimers();
  api.post.mockRejectedValue({ response: { status: 429 } });
  await render(<URLTool />);
  await fill("input", "example.com");
  await click("button");
  expect(container.querySelector("button").disabled).toBe(true);
  expect(container.textContent).toContain("2s");
  await act(async () => jest.advanceTimersByTime(2100));
  expect(container.querySelector("button").disabled).toBe(false);
});

test("message validation prevents empty calls and sends the entered message", async () => {
  api.post.mockResolvedValue({ data: { risk_level: "dangerous", risk_score: 90, red_flags: ["Requests OTP"], advice: ["Contact your bank"] } });
  await render(<DetectTab />);
  await click("button");
  expect(api.post).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain("at least 5");
  await fill("textarea", "Share your OTP to prevent account suspension.");
  await click("button");
  expect(api.post).toHaveBeenCalledWith("/ai/detect", { message: "Share your OTP to prevent account suspension." });
  expect(container.textContent).toContain("High risk");
  expect(container.textContent).toContain("Requests OTP");
});

test("unrecognized verdicts display unable to verify without inventing a score", async () => {
  await render(<ScanResult result={{ explanation: "Incomplete provider response" }} />);
  expect(container.textContent).toContain("Unable to verify");
  expect(container.textContent).not.toContain("/ 100");
});

test("dedicated URL result preserves the entered URL and supports returning to the scanner", async () => {
  api.post.mockResolvedValue({ data: { risk_level: "safe", risk_score: 8, explanation: "Returned analysis.", red_flags: [], advice: ["Verify before sharing details"] } });
  await render(<URLTool standalone initialURL="https://example.com" />);
  expect(container.querySelector("input").value).toBe("https://example.com");
  await click('[data-testid="url-check-button"]');
  expect(container.querySelector("input")).toBeNull();
  expect(container.textContent).toContain("Scanned URL");
  expect(container.textContent).toContain("https://example.com");
  expect(container.querySelector('[aria-label="AI risk score: 8 out of 100"]')).not.toBeNull();
  expect(container.querySelector('[role="meter"]')).toBeNull();
  expect(container.textContent).not.toContain("SSL Certificate");
  await click(".result-toolbar > button");
  expect(container.querySelector("input").value).toBe("https://example.com");
  expect(container.textContent).not.toContain("Returned analysis.");
});

test("dedicated scanner does not present an empty result as a completed check", async () => {
  await render(<DetectTab standalone />);
  expect(container.querySelector('[data-testid="detect-verdict"]')).toBeNull();
  expect(container.textContent).toContain("0 / 6,000");
  await fill("textarea", "This is a test message.");
  api.post.mockRejectedValue({ response: { data: { detail: "Provider unavailable" } } });
  await click('[data-testid="detect-analyze-button"]');
  expect(container.querySelector('[role="alert"]').textContent).toContain("Provider unavailable");
  expect(container.querySelector("textarea").value).toBe("This is a test message.");
});

test("risk meter uses the real score and exact category boundaries", async () => {
  expect(riskCategory(30).label).toBe("Safe");
  expect(riskCategory(31).label).toBe("Minimal risk");
  expect(riskCategory(60).label).toBe("Minimal risk");
  expect(riskCategory(61).label).toBe("High risk");
  await render(<ScanResult kind="message" result={{ risk_level: "suspicious", risk_score: 47, explanation: "Review this message.", red_flags: ["Urgent request"], advice: ["Verify the sender"] }} />);
  expect(container.querySelector('[role="meter"]').getAttribute("aria-valuenow")).toBe("47");
  expect(container.querySelector('[data-testid="message-risk-marker"]').style.left).toBe("47%");
  expect(container.textContent).toContain("Urgent request");
  expect(container.textContent).toContain("Verify the sender");
});

test("closing QR tool stops and clears the camera", async () => {
  const scanner = { start: jest.fn().mockResolvedValue(), stop: jest.fn().mockResolvedValue(), clear: jest.fn() };
  Html5Qrcode.mockImplementation(() => scanner);
  await render(<QRTab active />);
  await click('.qr-methods button:nth-child(2)');
  await click('[data-testid="qr-camera-button"]');
  expect(scanner.start).toHaveBeenCalled();
  await render(<QRTab active={false} />);
  expect(scanner.stop).toHaveBeenCalled();
  expect(scanner.clear).toHaveBeenCalled();
});

test("camera denial leaves the upload fallback available and explains the error", async () => {
  Html5Qrcode.mockImplementation(() => ({ start: jest.fn().mockRejectedValue(new Error("denied")), clear: jest.fn() }));
  await render(<QRTab />);
  await click('.qr-methods button:nth-child(2)');
  await click('[data-testid="qr-camera-button"]');
  expect(container.querySelector('[role="alert"]').textContent).toContain("Could not access the camera");
  await click('.qr-methods button:first-child');
  expect(container.querySelector('[data-testid="qr-dropzone"]').getAttribute("aria-disabled")).toBe("false");
});

test("chat waits for conversation history before allowing a new message", async () => {
  let resolveHistory;
  api.get.mockImplementation(() => new Promise((resolve) => { resolveHistory = resolve; }));
  await render(<ChatTab />);
  expect(container.querySelector("textarea").disabled).toBe(true);
  await act(async () => resolveHistory({ data: [{ role: "assistant", content: "Earlier response" }] }));
  expect(container.textContent).toContain("Earlier response");
  expect(container.querySelector("textarea").disabled).toBe(false);
});

test("failed chat preserves the question for retry and presents a persistent error", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = jest.fn().mockRejectedValue(new Error("Network unavailable"));
  try {
    await render(<ChatTab />);
    await fill("textarea", "What is phishing?");
    await click('[data-testid="chat-send-button"]');
    expect(container.querySelector("textarea").value).toBe("What is phishing?");
    expect(container.querySelector('[role="alert"]').textContent).toContain("ready to retry");
  } finally { globalThis.fetch = previousFetch; }
});


test("phone camera reuses the decoder and delivers content without duplicate AI calls", async () => {
  let detected;
  const scanner = { start: jest.fn(async (camera, options, callback) => { detected = callback; }), stop: jest.fn().mockResolvedValue(), clear: jest.fn() };
  Html5Qrcode.mockImplementation(() => scanner);
  const deliver = jest.fn().mockResolvedValue(true);
  await render(<QRTab mobile onDecoded={deliver} />);
  await click('[data-testid="qr-mobile-camera-button"]');
  await act(async () => detected("https://example.com"));
  expect(deliver).toHaveBeenCalledWith("https://example.com");
  expect(api.post).not.toHaveBeenCalled();
  expect(scanner.stop).toHaveBeenCalled();
});

test("QR image upload still decodes locally and uses the original analysis endpoint", async () => {
  const scanner = { scanFile: jest.fn().mockResolvedValue("https://example.com"), clear: jest.fn() };
  Html5Qrcode.mockImplementation(() => scanner);
  api.post.mockResolvedValue({ data: { risk_level: "safe", explanation: "Real endpoint response" } });
  await render(<QRTab />);
  const file = new File(["image"], "qr.png", { type: "image/png" });
  await act(async () => {
    const input = container.querySelector('[data-testid="qr-file-input"]');
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(scanner.scanFile).toHaveBeenCalledWith(file, false);
  expect(api.post).toHaveBeenCalledWith("/ai/qr", { content: "https://example.com" });
  expect(container.textContent).toContain("Real endpoint response");
});


test("a restored assessment renders without a second analysis or save request", async () => {
  api.post.mockResolvedValue({ data: { risk_level: "safe", risk_score: 10, explanation: "Previously returned assessment" } });
  await render(<URLTool standalone />);
  await fill("input", "https://example.com");
  await click('[data-testid="url-check-button"]');
  await render(<div />);
  await render(<URLTool standalone />);
  expect(container.textContent).toContain("Previously returned assessment");
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("not stored in account history");
});

test("report action transfers only supported editable context", async () => {
  sessionStorage.setItem("safenet-journey:report", JSON.stringify({ expires: Date.now() + 10000, value: { source: "url:https://unrelated.example", form: { scammer_url: "https://unrelated.example", amount_lost: "100" } } }));
  await render(<ScanResult standalone kind="detect" target="Harmless sample message" result={{ risk_level: "suspicious", risk_score: 40 }} />);
  const report = container.querySelector('a[href="/report"]');
  report.addEventListener("click", (event) => event.preventDefault());
  await act(async () => report.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  const raw = JSON.parse(sessionStorage.getItem("safenet-journey:report"));
  expect(raw.value.form).toEqual({ description: "Harmless sample message" });
  expect(raw.value.returnTo).toBe("/ai?tab=detect");
  expect(api.post).not.toHaveBeenCalled();
});

test("conversation retrieval failure is explicit and retry restores the existing messages", async () => {
  api.get.mockRejectedValue(new Error("Offline"));
  await render(<ChatTab />);
  expect(container.querySelector('[role="alert"]').textContent).toContain("could not load");
  expect(container.querySelector("textarea").disabled).toBe(true);
  api.get.mockResolvedValue({ data: [{ role: "assistant", content: "Stored reply" }] });
  await click(".support-link");
  expect(container.textContent).toContain("Stored reply");
  expect(container.querySelector("textarea").disabled).toBe(false);
});


test("expired chat session provides contextual sign-in instead of silently starting an empty conversation", async () => {
  api.get.mockRejectedValue({ response: { status: 401 } });
  await render(<ChatTab />);
  expect(container.querySelector('[role="alert"]').textContent).toContain("session expired");
  expect(container.querySelector('a[href^="/login?next="]').textContent).toContain("Sign in to continue");
  expect(container.querySelector("textarea").disabled).toBe(true);
});


test("long message results retain full contents while report context respects the existing report limit", async () => {
  const message = "Harmless sample text. ".repeat(270);
  await render(<ScanResult standalone kind="detect" target={message} result={{ risk_level: "safe", risk_score: 2 }} />);
  const details = [...container.querySelectorAll("details")].find((detail) => detail.textContent.includes("View the full message"));
  expect(details.querySelector("p").textContent).toBe(message);
  const report = container.querySelector('a[href="/report"]');
  report.addEventListener("click", (event) => event.preventDefault());
  await act(async () => report.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  expect(JSON.parse(sessionStorage.getItem("safenet-journey:report")).value.form.description).toBe(message.slice(0, 5000));
  expect(api.post).not.toHaveBeenCalled();
});
