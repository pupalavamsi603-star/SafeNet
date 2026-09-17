import { act } from "react";
import { createRoot } from "react-dom/client";
import { URLTool, validateURL } from "./URLTool";
import { ChatTab, DetectTab, QRTab } from "./AnalysisTools";
import { ScanResult } from "./ScanResult";
import { api } from "../../lib/api";
import { Html5Qrcode } from "html5-qrcode";

jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("../../lib/api", () => ({
  api: { post: jest.fn(), get: jest.fn() },
  getRetryAfterSeconds: (e) => e.response?.status === 429 ? 2 : null,
  formatApiErrorDetail: (detail) => detail || "Unable to connect. Try again.",
}));
jest.mock("html5-qrcode", () => ({ Html5Qrcode: jest.fn() }));

let container, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
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

test("closing QR tool stops and clears the camera", async () => {
  const scanner = { start: jest.fn().mockResolvedValue(), stop: jest.fn().mockResolvedValue(), clear: jest.fn() };
  Html5Qrcode.mockImplementation(() => scanner);
  await render(<QRTab active />);
  await click('[data-testid="qr-camera-button"]');
  expect(scanner.start).toHaveBeenCalled();
  await render(<QRTab active={false} />);
  expect(scanner.stop).toHaveBeenCalled();
  expect(scanner.clear).toHaveBeenCalled();
});

test("camera denial leaves the upload fallback available and explains the error", async () => {
  Html5Qrcode.mockImplementation(() => ({ start: jest.fn().mockRejectedValue(new Error("denied")), clear: jest.fn() }));
  await render(<QRTab />);
  await click('[data-testid="qr-camera-button"]');
  expect(container.querySelector('[role="alert"]').textContent).toContain("Could not access the camera");
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
