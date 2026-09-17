import { act } from "react";
import { createRoot } from "react-dom/client";
import { PhonePairing } from "./PhonePairing";
import { api } from "../../lib/api";
import QRCode from "qrcode";
import { connectPairing } from "../../lib/qrPairing";
jest.mock("../../lib/api", () => ({ api: { post: jest.fn() } }));
jest.mock("qrcode", () => ({ toDataURL: jest.fn() }));
jest.mock("../../lib/qrPairing", () => ({ connectPairing: jest.fn() }));
let root, container, receive, close, send;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  api.post.mockResolvedValue({ data: { id: "temporary-id", phone_token: "phone-secret", desktop_token: "desktop-secret", expires_at: Date.now() / 1000 + 300 } });
  QRCode.toDataURL.mockResolvedValue("data:image/png;base64,qr");
  close = jest.fn(); send = jest.fn();
  connectPairing.mockImplementation((session, role, callback) => { receive = callback; return { close }; });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
test("pairing QR uses current application domain and only phone credential", async () => {
  await act(async () => root.render(<PhonePairing active onDecoded={jest.fn()} />));
  const link = QRCode.toDataURL.mock.calls[0][0];
  expect(link).toBe(`${window.location.origin}/qr/phone/temporary-id#token=phone-secret`);
  expect(link).not.toContain("desktop-secret");
  expect(container.querySelector("img").width).toBe(256);
  expect(container.textContent).toContain("Waiting for phone");
});
test("decoded content invokes existing scanner callback once and reports completion", async () => {
  const analyze = jest.fn().mockResolvedValue(true);
  await act(async () => root.render(<PhonePairing active onDecoded={analyze} />));
  await act(async () => receive({ state: "detected", content: "https://example.com" }, send));
  await act(async () => receive({ state: "analyzing", content: "https://example.com" }, send));
  expect(analyze).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith({ type: "complete" });
  await act(async () => receive({ state: "complete" }, send));
  expect(container.textContent).toContain("Result available");
  expect(container.querySelector("img")).toBeNull();
});
test("hidden scanner cancels pairing and analysis failure remains actionable", async () => {
  await act(async () => root.render(<PhonePairing active onDecoded={async () => false} />));
  await act(async () => receive({ state: "detected", content: "test" }, send));
  expect(send).toHaveBeenCalledWith({ type: "failed" });
  expect(container.textContent).toContain("Analysis failed");
  await act(async () => root.render(<PhonePairing active={false} onDecoded={jest.fn()} />));
  expect(close).toHaveBeenCalled();
});
