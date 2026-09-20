import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Shield } from "lucide-react";
import { QRTab } from "../components/security/AnalysisTools";
import { connectPairing } from "../lib/qrPairing";
import { Button } from "../components/ui/button";

const labels = { connected: "Phone connected. Ready to scan.", ready: "Point your camera at the QR code", detected: "QR code detected. Sending to SafeNet…", analyzing: "Sent to desktop. Analyzing…", complete: "Analysis sent. View your result on the desktop.", failed: "Analysis failed on the desktop. Start a new scan there.", expired: "Session expired. Start a new scan on your desktop.", invalid: "Invalid session or phone already paired. Start a new scan on your desktop." };
export default function PhoneQR() {
  const { id } = useParams();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token"));
  const [state, setState] = useState("connecting");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const connection = useRef(null);
  const [content, setContent] = useState("");
  const pending = useRef("");
  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    let device;
    try { device = sessionStorage.getItem(`qr-device:${id}`); if (!device) { device = crypto.randomUUID(); sessionStorage.setItem(`qr-device:${id}`, device); } }
    catch { setError("Enable browser session storage to pair this phone securely."); return; }
    connection.current = connectPairing({ id, token, device }, "phone", (message, send) => {
      setState(message.state); setError("");
      if (pending.current && ["connected", "ready"].includes(message.state)) send({ type: "scan", content: pending.current });
      if (["complete", "failed", "expired", "invalid"].includes(message.state)) pending.current = "";
    }, setError);
    return () => { connection.current?.close(); connection.current = null; };
  }, [id, token, retry]);
  const scanningAllowed = ["connected", "ready"].includes(state) && !error;
  const submit = async (decoded) => {
    if (!scanningAllowed || !connection.current) throw new Error("Reconnect to the desktop before sending.");
    pending.current = decoded;
    setContent(decoded); setState("detected");
    if (!connection.current.send({ type: "scan", content: decoded })) setError("Could not send your scan. Check your connection and try again.");
    return true;
  };
  return <div className="max-w-2xl mx-auto px-4 py-6 security-workspace">
    <Link to="/" className="flex items-center gap-2 text-primary font-semibold"><Shield className="w-6 h-6" />SafeNet</Link>
    <h1 className="mt-6 text-2xl font-semibold tracking-tight">Scan the QR code you want to check</h1>
    <p role="status" className="mt-3 text-sm">{labels[state] || "Connecting to your desktop…"}</p>
    {error && <div className="mt-3"><p role="alert" className="text-sm text-red-700">{error}</p><Button variant="outline" className="mt-2" onClick={() => setRetry((n) => n + 1)}>Try again</Button></div>}
    {scanningAllowed && <div className="mt-5"><QRTab mobile onDecoded={submit} /></div>}
    {content && <p className="mt-4 text-xs text-muted-foreground break-all">Detected content: {content}</p>}
    <p className="mt-6 text-xs text-muted-foreground">SafeNet never opens the detected link automatically. Keep this page open until the analysis is sent.</p>
  </div>;
}
