import { useEffect, useRef, useState } from "react";

import QRCode from "qrcode";

import { Smartphone, RefreshCw } from "lucide-react";

import { api } from "../../lib/api";

import { connectPairing } from "../../lib/qrPairing";

import { Button } from "../ui/button";

const labels = { waiting: "Waiting for phone…", connected: "Phone connected", ready: "Ready to scan", detected: "QR code detected", analyzing: "Analyzing…", complete: "Result available", failed: "Analysis failed. Start a new scan.", expired: "Session expired", invalid: "Invalid session. Start a new scan.", disconnected: "Phone disconnected. Reopen the pairing link to reconnect." };

export function PhonePairing({ active, disabled, onDecoded }) {

  const [image, setImage] = useState("");

  const [phoneLink, setPhoneLink] = useState("");

  const [state, setState] = useState("waiting");

  const [error, setError] = useState("");

  const [generation, setGeneration] = useState(0);

  const callback = useRef(onDecoded);

  callback.current = onDecoded;

  const disabledRef = useRef(disabled);

  disabledRef.current = disabled;

  useEffect(() => {

    if (!active) return;

    let disposed = false, connection, expiry;

    let handled = false;

    setImage(""); setPhoneLink(""); setError(""); setState("waiting");

    api.post("/qr-pair").then(async ({ data }) => {

      const base = (process.env.REACT_APP_PUBLIC_URL || window.location.origin).replace(/\/$/, "");

      const link = `${base}/qr/phone/${data.id}#token=${encodeURIComponent(data.phone_token)}`;

      const generated = await QRCode.toDataURL(link, { width: 256, margin: 4, errorCorrectionLevel: "M", color: { dark: "#17243b", light: "#ffffff" } });

      if (disposed) return;

      setImage(generated); setPhoneLink(link);

      expiry = setTimeout(() => { setState("expired"); disposed = true; connection?.close(); }, Math.max(0, data.expires_at * 1000 - Date.now()));

      connection = connectPairing({ id: data.id, token: data.desktop_token }, "desktop", async (message, send) => {

        if (disposed) return;

        setError(""); setState(message.state);

        if (["complete", "failed", "expired", "invalid"].includes(message.state)) clearTimeout(expiry);

        if (message.content && !handled) {

          handled = true;

          if (disabledRef.current) { setState("failed"); send({ type: "failed" }); return; }

          setState("analyzing"); send({ type: "analyzing" });

          const success = await callback.current(message.content);

          if (!disposed) { send({ type: success ? "complete" : "failed" }); setState(success ? "complete" : "failed"); }

        }

      }, (message) => { if (!disposed) setError(message); });

    }).catch(() => { if (!disposed) setError("Could not create a phone session. Try again."); });

    return () => { disposed = true; clearTimeout(expiry); connection?.close(); };

  }, [active, generation]);

  return <section className="mt-5 rounded-xl border bg-accent/40 p-4 text-center" aria-label="Scan with your phone">

    <h4 className="font-semibold flex justify-center items-center gap-2"><Smartphone className="w-5 h-5 text-primary" />Scan with your phone</h4>

    <p className="text-sm text-muted-foreground mt-2">Open your phone camera and scan this code.</p>

    {image && !["expired", "complete", "failed", "invalid"].includes(state) && <img src={image} width="256" height="256" className="mx-auto mt-3 rounded-lg max-w-full" alt="SafeNet temporary phone pairing QR code" />}

    {phoneLink && !["expired", "complete", "failed", "invalid"].includes(state) && <a className="block mt-2 text-xs text-primary underline" href={phoneLink} target="_blank" rel="noopener noreferrer">Open mobile scanner</a>}

    <p className="text-xs text-muted-foreground mt-2">Opens SafeNet’s mobile scanner. No app installation needed. Expires in 5 minutes.</p>

    <p role="status" className="text-sm font-medium mt-3">{labels[state] || "Connecting…"}</p>

    {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}

    <Button variant="outline" className="mt-3" disabled={disabled} onClick={() => setGeneration((n) => n + 1)}><RefreshCw className="w-4 h-4 mr-2" />{error ? "Try again" : "Start a new scan"}</Button>

  </section>;

}
