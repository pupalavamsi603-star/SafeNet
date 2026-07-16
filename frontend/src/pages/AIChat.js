import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, SendHorizonal, ScanSearch, User, Loader2, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, Timer, QrCode, Upload, Camera, X, Link2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { API, api, getRetryAfterSeconds } from "../lib/api";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";

const SUGGESTIONS = [
  "How do I create a strong password?",
  "What is OTP fraud and how do I avoid it?",
  "Is public Wi-Fi safe for banking?",
  "How can I tell if a shopping website is fake?",
];

function getSessionId() {
  let id = localStorage.getItem("safenet-chat-session");
  if (!id) {
    id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("safenet-chat-session", id);
  }
  return id;
}

// Countdown state for AI rate limiting (HTTP 429). Returns [secondsLeft, start(seconds)].
function useCooldown() {
  const [until, setUntil] = useState(0);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [until]);

  const secondsLeft = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  const start = (seconds) => setUntil(Date.now() + seconds * 1000);
  return [secondsLeft, start];
}

function CooldownBanner({ seconds, label }) {
  if (!seconds) return null;
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400"
      data-testid="rate-limit-banner"
      role="status"
    >
      <Timer className="w-4 h-4 shrink-0 animate-pulse" />
      <span>
        {label} You can try again in <span className="font-semibold tabular-nums">{seconds}s</span>.
      </span>
    </div>
  );
}

const riskConfig = {
  safe: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", bar: "bg-emerald-500", icon: ShieldCheck, label: "Looks Safe" },
  suspicious: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", bar: "bg-amber-500", icon: AlertTriangle, label: "Suspicious" },
  dangerous: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", bar: "bg-red-500", icon: ShieldAlert, label: "Dangerous" },
};

function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const endRef = useRef(null);
  const sessionId = useRef(getSessionId());

  useEffect(() => {
    api.get(`/ai/chat/${sessionId.current}/history`)
      .then((r) => setMessages(r.data.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || streaming || cooldown) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId.current, message: msg }),
      });
      if (res.status === 429) {
        const secs = getRetryAfterSeconds(res);
        startCooldown(secs);
        setMessages((m) => m.slice(0, -2)); // drop the optimistic user + empty assistant bubbles
        setInput(msg); // give the user their message back
        toast.warning(`You're sending messages too fast — try again in ${secs}s.`);
        return;
      }
      if (!res.ok) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + chunk };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." };
        return copy;
      });
      toast.error("AI chat failed. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[600px]" data-testid="ai-chat-panel">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-5">
              <Bot className="w-8 h-8 text-sky-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-heading text-lg font-semibold tracking-tight">Hi, I'm SafeBot</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">Ask me anything about online scams, cybersecurity, or how to stay safe. I'm here 24/7.</p>
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  data-testid="chat-suggestion-button"
                  className="text-left text-xs rounded-lg border px-4 py-3 hover:border-sky-500/50 hover:text-sky-500 transition-colors duration-200"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-sky-500" /> {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5 text-sky-500 w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-sky-500 text-white" : "bg-secondary"
              }`}
              data-testid={m.role === "user" ? "chat-user-message" : "chat-assistant-message"}
            >
              {m.content || (
                <span className="inline-flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 typing-dot" />
                </span>
              )}
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t p-4 space-y-3">
        <CooldownBanner seconds={cooldown} label="SafeBot needs a short break — too many messages at once." />
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={cooldown ? `Please wait ${cooldown}s...` : "Ask about scams, passwords, safe browsing..."}
            className="min-h-[48px] max-h-32 resize-none"
            disabled={!!cooldown}
            data-testid="chat-input"
          />
          <Button onClick={() => send()} disabled={streaming || !!cooldown || !input.trim()} className="bg-sky-500 hover:bg-sky-600 text-white self-end rounded-full h-11 w-11 p-0" data-testid="chat-send-button" aria-label="Send">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : cooldown ? <Timer className="w-4 h-4" /> : <SendHorizonal className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetectTab() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, startCooldown] = useCooldown();

  const analyze = async () => {
    if (message.trim().length < 5) { toast.error("Paste a message with at least a few words."); return; }
    if (cooldown) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/detect", { message });
      setResult(data);
    } catch (e) {
      const secs = getRetryAfterSeconds(e);
      if (secs) {
        startCooldown(secs);
        toast.warning(`Too many analyses — try again in ${secs}s.`);
      } else {
        toast.error("Analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? riskConfig[result.risk_level] || riskConfig.suspicious : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="ai-detect-panel">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-heading text-base font-semibold tracking-tight flex items-center gap-2">
          <ScanSearch className="w-5 h-5 text-red-500" /> Paste the suspicious message
        </h3>
        <p className="text-sm text-muted-foreground mt-2">SMS, email, WhatsApp message, job offer — paste it exactly as you received it.</p>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={"Example: 'Dear customer, your bank account will be suspended today. Click http://bit.ly/xyz to verify your KYC immediately...'"}
          className="mt-4 min-h-[220px]"
          data-testid="detect-message-input"
        />
        <div className="mt-4 space-y-3">
          <CooldownBanner seconds={cooldown} label="Analysis limit reached." />
          <Button onClick={analyze} disabled={loading || !!cooldown} className="w-full rounded-full bg-red-500 hover:bg-red-600 text-white" data-testid="detect-analyze-button">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI...</>)
              : cooldown ? (<><Timer className="w-4 h-4 mr-2" /> Wait {cooldown}s</>)
              : (<><ScanSearch className="w-4 h-4 mr-2" /> Analyze for Scams</>)}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 flex flex-col" data-testid="detect-result-panel">
        {!result && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-16">
            <ScanSearch className="w-10 h-10 mb-4 opacity-40" strokeWidth={1.2} />
            <p className="text-sm">Analysis results will appear here — risk score, red flags, and what to do next.</p>
          </div>
        )}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-4" />
            <p className="text-sm text-muted-foreground">AI is scanning for scam patterns...</p>
          </div>
        )}
        {result && cfg && (
          <div className="space-y-5">
            <div className={`rounded-xl border p-5 ${cfg.bg}`} data-testid="detect-verdict">
              <div className="flex items-center gap-3">
                <cfg.icon className={`w-8 h-8 ${cfg.color}`} strokeWidth={1.6} />
                <div>
                  <p className={`font-heading text-lg font-bold tracking-tight ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{result.scam_type}</p>
                </div>
                <span className={`ml-auto font-heading text-2xl font-bold ${cfg.color}`} data-testid="detect-risk-score">{result.risk_score}<span className="text-sm">/100</span></span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${result.risk_score}%` }} />
              </div>
            </div>
            <p className="text-sm leading-relaxed">{result.explanation}</p>
            {result.red_flags?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2.5">Red flags detected</p>
                <ul className="space-y-2">
                  {result.red_flags.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.advice?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2.5">What you should do</p>
                <ul className="space-y-2">
                  {result.advice.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm"><ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QRResultPanel({ result, loading }) {
  const cfg = result ? riskConfig[result.risk_level] || riskConfig.suspicious : null;
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col" data-testid="qr-result-panel">
      {!result && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-16">
          <QrCode className="w-10 h-10 mb-4 opacity-40" strokeWidth={1.2} />
          <p className="text-sm">Scan or upload a QR code — we'll decode it and check if it's safe before you open it.</p>
        </div>
      )}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-4" />
          <p className="text-sm text-muted-foreground">AI is analyzing the QR content...</p>
        </div>
      )}
      {result && cfg && (
        <div className="space-y-5">
          <div className={`rounded-xl border p-5 ${cfg.bg}`} data-testid="qr-verdict">
            <div className="flex items-center gap-3">
              <cfg.icon className={`w-8 h-8 ${cfg.color}`} strokeWidth={1.6} />
              <div>
                <p className={`font-heading text-lg font-bold tracking-tight ${cfg.color}`}>{cfg.label}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{result.content_type}{result.scam_type && result.scam_type !== "None detected" ? ` · ${result.scam_type}` : ""}</p>
              </div>
              <span className={`ml-auto font-heading text-2xl font-bold ${cfg.color}`} data-testid="qr-risk-score">{result.risk_score}<span className="text-sm">/100</span></span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
              <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${result.risk_score}%` }} />
            </div>
          </div>
          {result.decoded && (
            <div className="rounded-lg border bg-secondary/50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Decoded content</p>
              <p className="text-sm font-mono break-all" data-testid="qr-decoded-content">{result.decoded}</p>
            </div>
          )}
          <p className="text-sm leading-relaxed">{result.explanation}</p>
          {result.red_flags?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2.5">Red flags detected</p>
              <ul className="space-y-2">
                {result.red_flags.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> {f}</li>
                ))}
              </ul>
            </div>
          )}
          {result.advice?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2.5">What you should do</p>
              <ul className="space-y-2">
                {result.advice.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QRTab() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const fileRef = useRef(null);
  const scannerRef = useRef(null);
  const readerId = "qr-camera-reader";

  const stopCamera = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => () => { stopCamera(); }, []);

  const analyze = async (decoded) => {
    if (cooldown) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/qr", { content: decoded });
      setResult({ ...data, decoded });
    } catch (e) {
      const secs = getRetryAfterSeconds(e);
      if (secs) {
        startCooldown(secs);
        toast.warning(`Too many scans — try again in ${secs}s.`);
      } else {
        toast.error("QR analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    await stopCamera();
    const scanner = new Html5Qrcode(readerId);
    try {
      const decoded = await scanner.scanFile(file, false);
      toast.success("QR code decoded!");
      await analyze(decoded);
    } catch {
      toast.error("No QR code found in that image. Try a clearer photo.");
    } finally {
      try { scanner.clear(); } catch {}
    }
  };

  const startCamera = async () => {
    setResult(null);
    setScanning(true);
    // wait a tick so the reader div is rendered
    setTimeout(async () => {
      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decoded) => {
            await stopCamera();
            toast.success("QR code detected!");
            analyze(decoded);
          },
          () => {}
        );
      } catch (e) {
        toast.error("Could not access the camera. Check browser permissions, or upload an image instead.");
        setScanning(false);
        scannerRef.current = null;
      }
    }, 50);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="ai-qr-panel">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-heading text-base font-semibold tracking-tight flex items-center gap-2">
          <QrCode className="w-5 h-5 text-violet-500" /> Scan a QR code
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Found a QR on a poster, parcel, payment request, or message? Check it here <span className="font-medium text-foreground">before</span> you open it.
        </p>

        {/* camera reader mounts here */}
        <div id={readerId} className={`mt-4 rounded-xl overflow-hidden ${scanning ? "border" : ""}`} />

        {!scanning && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`mt-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200 px-6 py-12 text-center ${dragOver ? "border-violet-500 bg-violet-500/5" : "hover:border-violet-500/50"}`}
            data-testid="qr-dropzone"
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" strokeWidth={1.4} />
            <p className="text-sm font-medium">Drop a QR image here, or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1.5">Screenshot, photo, or saved image — decoded locally in your browser</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="qr-file-input" />
          </div>
        )}

        <div className="mt-4 space-y-3">
          <CooldownBanner seconds={cooldown} label="Scan limit reached." />
          {!scanning ? (
            <Button onClick={startCamera} disabled={loading || !!cooldown} variant="outline" className="w-full rounded-full" data-testid="qr-camera-button">
              <Camera className="w-4 h-4 mr-2" /> Scan with camera
            </Button>
          ) : (
            <Button onClick={stopCamera} variant="outline" className="w-full rounded-full border-red-500/40 text-red-500 hover:text-red-600" data-testid="qr-stop-button">
              <X className="w-4 h-4 mr-2" /> Stop camera
            </Button>
          )}
        </div>
      </div>

      <QRResultPanel result={result} loading={loading} />
    </div>
  );
}

export default function AIChat() {
  const [params] = useSearchParams();
  const tabParam = params.get("tab");
  const defaultTab = tabParam === "detect" ? "detect" : tabParam === "qr" ? "qr" : "chat";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="ai-page">
      <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-4">AI protection tools</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter">AI Assistant & Scam Detector</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Chat with SafeBot about anything cybersecurity, paste a suspicious message for an instant AI risk analysis, or scan a QR code before you trust it.
      </p>

      <Tabs defaultValue={defaultTab} className="mt-10">
        <TabsList className="grid w-full max-w-xl grid-cols-3 rounded-full h-11">
          <TabsTrigger value="chat" className="rounded-full" data-testid="tab-chat"><Bot className="w-4 h-4 mr-1.5" /> AI Chatbot</TabsTrigger>
          <TabsTrigger value="detect" className="rounded-full" data-testid="tab-detect"><ScanSearch className="w-4 h-4 mr-1.5" /> Scam Detector</TabsTrigger>
          <TabsTrigger value="qr" className="rounded-full" data-testid="tab-qr"><QrCode className="w-4 h-4 mr-1.5" /> QR Scanner</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-6"><ChatTab /></TabsContent>
        <TabsContent value="detect" className="mt-6"><DetectTab /></TabsContent>
        <TabsContent value="qr" className="mt-6"><QRTab /></TabsContent>
      </Tabs>
    </div>
  );
}
