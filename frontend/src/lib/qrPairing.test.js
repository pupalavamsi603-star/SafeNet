import { connectPairing } from "./qrPairing";
import { api } from "./api";
jest.mock("./api", () => ({ api: { post: jest.fn() } }));
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => jest.useRealTimers());
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
test("uses HTTPS exchange with body credentials and stops on completion", async () => {
  api.post.mockResolvedValueOnce({ data: { state: "connected" } }).mockResolvedValue({ data: { state: "complete" } });
  const receive = jest.fn(), failure = jest.fn();
  const connection = connectPairing({ id: "session", token: "phone-token", device: "device" }, "phone", receive, failure);
  await flush();
  expect(api.post).toHaveBeenCalledWith("/qr-pair/session/exchange", { role: "phone", token: "phone-token", device: "device", type: "ping" }, expect.any(Object));
  expect(connection.send({ type: "scan", content: "https://example.com" })).toBe(true);
  jest.advanceTimersByTime(0); await flush();
  expect(receive).toHaveBeenCalledWith({ state: "complete" }, expect.any(Function));
  const count = api.post.mock.calls.length;
  jest.advanceTimersByTime(5000); await flush();
  expect(api.post).toHaveBeenCalledTimes(count);
  expect(failure).not.toHaveBeenCalled();
  connection.close();
});
test("retries an unacknowledged scan without noisy transient connection warnings", async () => {
  api.post.mockResolvedValueOnce({ data: { state: "connected" } }).mockRejectedValueOnce(new Error("Network"))
    .mockResolvedValue({ data: { state: "detected" } });
  const receive = jest.fn(), failure = jest.fn();
  const connection = connectPairing({ id: "session", token: "phone-token", device: "device" }, "phone", receive, failure);
  await flush(); connection.send({ type: "scan", content: "payload" });
  jest.advanceTimersByTime(0); await flush();
  jest.advanceTimersByTime(2000); await flush();
  const scans = api.post.mock.calls.filter((call) => call[1].type === "scan");
  expect(scans).toHaveLength(2); expect(scans[0][1]).toEqual(scans[1][1]);
  expect(failure).not.toHaveBeenCalled(); connection.close();
});
test("expired credentials stop polling rather than reconnecting indefinitely", async () => {
  api.post.mockRejectedValue({ response: { status: 410 } });
  const receive = jest.fn(); connectPairing({ id: "session", token: "token" }, "phone", receive, jest.fn());
  await flush(); jest.advanceTimersByTime(10000); await flush();
  expect(receive).toHaveBeenCalledWith({ state: "expired" }, expect.any(Function));
  expect(api.post).toHaveBeenCalledTimes(1);
});
