import { api } from "./api";

const terminal = ["complete", "failed", "expired", "invalid"];

// Short HTTPS requests work through the same API/CORS path as session creation.
// Credentials stay in POST bodies; no persistent socket or URL credential is used.
export function connectPairing(session, role, onMessage, onFailure) {
  const auth = { role, token: session.token, ...(role === "phone" ? { device: session.device } : {}) };
  let stopped = false, running = false, timer, failures = 0, controller;
  const queue = [];
  const send = (message) => {
    if (stopped) return false;
    if (!queue.some((item) => item.type === message.type && item.content === message.content)) queue.push(message);
    if (!running) { clearTimeout(timer); timer = setTimeout(run, 0); }
    return true;
  };
  const run = async () => {
    if (stopped || running) return;
    running = true;
    const action = queue[0] || { type: "ping" };
    controller = new AbortController();
    try {
      const { data } = await api.post(`/qr-pair/${encodeURIComponent(session.id)}/exchange`, { ...auth, ...action }, { signal: controller.signal, timeout: 10000 });
      if (stopped) return;
      if (queue[0] === action) queue.shift();
      failures = 0;
      if (terminal.includes(data.state)) stopped = true;
      Promise.resolve(onMessage(data, send)).catch(() => onFailure("Could not process the scan. Try again."));
    } catch (error) {
      if (stopped) return;
      const status = error.response?.status;
      if ([403, 404, 410, 422].includes(status)) {
        stopped = true;
        onMessage({ state: status === 410 || status === 404 ? "expired" : "invalid" }, send);
      } else if (++failures >= 3) {
        onFailure("Could not reach SafeNet. Check your connection or try again.");
      }
      // Keep unacknowledged actions queued; backend transitions are idempotent.
    } finally {
      running = false;
      if (!stopped) timer = setTimeout(run, queue.length ? (failures ? 2000 : 0) : 1500);
    }
  };
  run();
  return { send, close: () => {
    stopped = true; clearTimeout(timer); controller?.abort();
    if (role === "desktop") api.post(`/qr-pair/${encodeURIComponent(session.id)}/exchange`, { ...auth, type: "cancel" }, { timeout: 10000 }).catch(() => {});
  } };
}
