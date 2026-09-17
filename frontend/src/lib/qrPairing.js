import { API } from "./api";

export function pairingSocket(id) {
  const url = new URL(`${API}/qr-pair/${encodeURIComponent(id)}`, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return new WebSocket(url.href);
}

// Credentials are sent in the first frame, never in the WebSocket URL/logs.
export function connectPairing(session, role, onMessage, onFailure) {
  let socket, timer, heartbeat, stopped = false;
  const send = (message) => { if (socket?.readyState !== WebSocket.OPEN) return false; socket.send(JSON.stringify(message)); return true; };
  const open = () => {
    if (stopped) return;
    socket = pairingSocket(session.id);
    socket.onopen = () => {
      send({ role, token: session.token, device: session.device });
      if (role === "phone") send({ type: "ready" });
      heartbeat = setInterval(() => send({ type: "ping" }), 15000);
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (["complete", "failed", "expired", "invalid"].includes(message.state)) { stopped = true; clearInterval(heartbeat); }
        onMessage(message, send);
      } catch { onFailure("Connection failed. Try again."); }
    };
    socket.onclose = (event) => {
      clearInterval(heartbeat);
      if (stopped) return;
      if ([1008, 4001, 4009].includes(event.code)) {
        onMessage({ state: event.code === 4001 ? "expired" : "invalid" }, send);
        return;
      }
      onFailure("Connection interrupted. Reconnecting…");
      timer = setTimeout(open, 2000);
    };
    socket.onerror = () => onFailure("Connection failed. Check your network.");
  };
  open();
  return { send, close: () => { stopped = true; clearTimeout(timer); clearInterval(heartbeat); if (role === "desktop") send({ type: "cancel" }); socket?.close(); } };
}
