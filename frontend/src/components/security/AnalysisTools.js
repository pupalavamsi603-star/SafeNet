import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, SendHorizonal, ScanSearch, User, Loader2, Sparkles, Timer, QrCode, Upload, Camera, X, MessageSquarePlus } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { API, api, getRetryAfterSeconds, formatApiErrorDetail } from "../../lib/api";
import { nativeAuthHeaders } from "../../lib/nativeAuth";
import { ScanResult } from "./ScanResult";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const SUGGESTIONS = [
  "How do I create a strong password?",
  "What is OTP fraud and how do I avoid it?",
  "Is public Wi-Fi safe for banking?",
  "How can I tell if a shopping website is fake?",
];

const sessionKey = (userId) => `safenet-chat-session:${userId || "guest"}`;

function newSessionId() {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// `override` comes from ?session=... (e.g. resuming a chat from the Dashboard);
// resuming makes that conversation the active one for this account.
function getSessionId(userId, override) {
  const key = sessionKey(userId);
  if (override) {
    localStorage.setItem(key, override);
    return override;
  }
  let id = localStorage.getItem(key);
  if (!id) {
    id = newSessionId();
    localStorage.setItem(key, id);
  }
  return id;
}

// Countdown state for AI rate limiting (HTTP 429). Returns [secondsLeft, start(seconds)].
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= until) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [until]);

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));
  const start = (seconds) => { const next = Date.now(); setNow(next); setUntil(next + seconds * 1000); };
  return [secondsLeft, start];
}

export function CooldownBanner({ seconds, label }) {
  if (!seconds) return null;
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600"
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

export function ChatTab({ resumeSession }) {
  const { user } = useAuth();
  const uid = user?.id || "";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [cooldown, startCooldown] = useCooldown();
  const endRef = useRef(null);
  const requestRef = useRef(null);
  const [sessionId, setSessionId] = useState(() => getSessionId(uid, resumeSession));
  const activeSessionRef = useRef(sessionId);

  useEffect(() => {
    activeSessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const nextSessionId = getSessionId(uid, resumeSession);
    activeSessionRef.current = nextSessionId;
    setSessionId(nextSessionId);
    setMessages([]);
    setInput("");
    setStreaming(false);
    setHistoryLoading(true);
    setChatError("");

    let cancelled = false;
    api.get(`/ai/chat/${nextSessionId}/history`)
      .then((r) => {
        if (!cancelled && activeSessionRef.current === nextSessionId) {
          setMessages(r.data.map((m) => ({ role: m.role, content: m.content })));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // 403 = this session belongs to another account (e.g. a stale id left in
        // localStorage after switching users). Start a clean one instead of
        // leaving the user on a session every send will reject.
        if (err.response?.status === 403) {
          const fresh = newSessionId();
          localStorage.setItem(sessionKey(uid), fresh);
          activeSessionRef.current = fresh;
          setSessionId(fresh);
        }
      })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });

    return () => {
      cancelled = true;
      activeSessionRef.current = null;
      requestRef.current?.abort();
    };
  }, [uid, resumeSession]);

  useEffect(() => {
    if (endRef.current?.parentElement) {
      const log = endRef.current.parentElement;
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, streaming]);

  // Sessions persist per account, so without this there was no way to leave a
  // long conversation behind and start fresh.
  const startNewChat = () => {
    if (streaming || historyLoading) return;
    const fresh = newSessionId();
    localStorage.setItem(sessionKey(uid), fresh);
    activeSessionRef.current = fresh;
    setSessionId(fresh);
    setMessages([]);
    setInput("");
    setChatError("");
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || streaming || historyLoading || cooldown) return;
    const activeSessionId = sessionId;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    setChatError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      // Streaming needs raw fetch, so the axios refresh-on-401 interceptor does
      // not apply here — refresh and retry once by hand.
      const post = () => fetch(`${API}/ai/chat`, {
        method: "POST",
        // Raw fetch skips the axios interceptors, so the native bearer header
        // (a no-op on web) has to be attached by hand here too.
        headers: { "Content-Type": "application/json", ...nativeAuthHeaders() },
        credentials: "include",
        signal: controller.signal,
        // user_id is intentionally not sent — the server derives it from the session
        // (auth cookie on web, bearer token on native).
        body: JSON.stringify({ session_id: activeSessionId, message: msg }),
      });
      let res = await post();
      if (res.status === 401) {
        try {
          await api.post("/auth/refresh");
          res = await post();
        } catch {
          /* refresh failed — fall through and surface the original error */
        }
      }
      if (res.status === 429) {
        const secs = getRetryAfterSeconds(res);
        startCooldown(secs);
        if (activeSessionRef.current === activeSessionId) {
          setMessages((m) => m.slice(0, -2)); // drop the optimistic user + empty assistant bubbles
          setInput(msg); // give the user their message back
        }
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
          if (activeSessionRef.current !== activeSessionId) return m;
          const copy = [...m];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + chunk };
          return copy;
        });
      }
    } catch (e) {
      if (activeSessionRef.current !== activeSessionId) return;
      setChatError("SafeBot couldn't respond. Your question is ready to retry.");
      setInput(msg);
      setMessages((m) => {
        if (activeSessionRef.current !== activeSessionId) return m;
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." };
        return copy;
      });
      toast.error("AI chat failed. Please try again.");
    } finally {
      clearTimeout(timeout);
      if (activeSessionRef.current === activeSessionId) {
        setStreaming(false);
      }
    }
  };

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[520px]" data-testid="ai-chat-panel">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SafeBot</p>
        <Button
          onClick={startNewChat}
          disabled={streaming || historyLoading || messages.length === 0}
          variant="ghost"
          size="sm"
          className="rounded-lg text-xs gap-1.5 h-8"
          data-testid="chat-new-button"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-5" role="log" aria-live="polite" aria-atomic="false" aria-label="Conversation with SafeBot">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-5">
              <Bot className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="font-heading text-lg font-semibold tracking-tight">Hi, I'm SafeBot</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">Ask me anything about online scams, cybersecurity, or how to stay safe. I'm here 24/7.</p>
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={streaming || historyLoading || !!cooldown}
                  data-testid="chat-suggestion-button"
                  className="text-left text-xs rounded-lg border px-4 py-3 hover:border-sky-500/50 hover:text-primary transition-colors duration-200"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-primary" /> {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5 text-primary w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0 ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
              data-testid={m.role === "user" ? "chat-user-message" : "chat-assistant-message"}
            >
              {m.content || (
                <span className="inline-flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 rounded-lg bg-sky-500 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-lg bg-sky-500 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-lg bg-sky-500 typing-dot" />
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
        {historyLoading && <p role="status" className="text-xs text-muted-foreground">Loading conversation…</p>}
        {chatError && <p role="alert" className="text-sm text-red-700">{chatError}</p>}
        <CooldownBanner seconds={cooldown} label="SafeBot needs a short break — too many messages at once." />
        <div className="flex gap-3">
          <Textarea
            aria-label="Ask SafeBot a cybersecurity question"
            maxLength={4000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder={cooldown ? `Please wait ${cooldown}s...` : "Ask about scams, passwords, safe browsing..."}
            className="min-h-[48px] max-h-32 resize-none"
            disabled={streaming || historyLoading || !!cooldown}
            data-testid="chat-input"
          />
          <Button onClick={() => send()} disabled={streaming || historyLoading || !!cooldown || !input.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground self-end rounded-lg h-11 w-11 p-0" data-testid="chat-send-button" aria-label="Send">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : cooldown ? <Timer className="w-4 h-4" /> : <SendHorizonal className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DetectTab() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, startCooldown] = useCooldown();

  const analyze = async () => {
    if (message.trim().length < 5) { setError("Enter at least 5 characters to analyze a message."); return; }
    if (cooldown || loading) return;
    setLoading(true);
    setError("");
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
        setError(formatApiErrorDetail(e.response?.data?.detail));
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="ai-detect-panel">
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <h3 className="font-heading text-base font-semibold tracking-tight flex items-center gap-2">
          <ScanSearch className="w-5 h-5 text-primary" /> Paste the suspicious message
        </h3>
        <p className="text-sm text-muted-foreground mt-2">SMS, email, WhatsApp message, job offer — paste it exactly as you received it.</p>
        <Textarea
          id="detect-message"
          aria-label="Suspicious text or message"
          aria-describedby="detect-help detect-error"
          aria-invalid={!!error}
          maxLength={6000}
          value={message}
          onChange={(e) => { setMessage(e.target.value); setResult(null); setError(""); }}
          disabled={loading}
          placeholder={"Example: 'Dear customer, your bank account will be suspended today. Click http://bit.ly/xyz to verify your KYC immediately...'"}
          className="mt-4 min-h-[150px]"
          data-testid="detect-message-input"
        />
        <p id="detect-help" className="text-xs text-muted-foreground mt-2">Remove passwords, OTPs and personal details before submitting. Minimum 5 characters.</p>
        <p id="detect-error" role="alert" className="text-sm text-red-700 mt-2">{error}</p>
        <div className="mt-4 space-y-3">
          <CooldownBanner seconds={cooldown} label="Analysis limit reached." />
          <Button onClick={analyze} disabled={loading || !!cooldown} className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="detect-analyze-button">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI...</>)
              : cooldown ? (<><Timer className="w-4 h-4 mr-2" /> Wait {cooldown}s</>)
              : (<><ScanSearch className="w-4 h-4 mr-2" /> Analyze for Scams</>)}
          </Button>
        </div>
      </div>

      <ScanResult result={result} loading={loading} kind="detect" />
    </div>
  );
}

export function QRTab({ active = true }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [decodedContent, setDecodedContent] = useState("");
  const [decoding, setDecoding] = useState(false);
  const busyRef = useRef(false);
  const activeRef = useRef(active);
  const [dragOver, setDragOver] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const fileRef = useRef(null);
  const scannerRef = useRef(null);
  const readerId = "qr-camera-reader";

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { await scanner.stop(); } catch {}
      try { scanner.clear(); } catch {}
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    activeRef.current = active;
    if (!active) stopCamera();
    return () => { activeRef.current = false; stopCamera(); };
  }, [active, stopCamera]);

  const analyze = async (decoded) => {
    if (cooldown || loading) return;
    setLoading(true);
    setError("");
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
        setError(formatApiErrorDetail(e.response?.data?.detail));
      }
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file) => {
    if (!file || busyRef.current || loading || cooldown || !active) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose an image smaller than 10 MB."); return; }
    busyRef.current = true;
    setDecoding(true);
    setError("");
    setResult(null);
    setDecodedContent("");
    await stopCamera();
    const scanner = new Html5Qrcode(readerId);
    try {
      const decoded = await scanner.scanFile(file, false);
      setDecodedContent(decoded);
      setDecoding(false);
      if (activeRef.current) await analyze(decoded);
    } catch {
      setError("No QR code found in that image. Try a clearer photo.");
    } finally {
      try { scanner.clear(); } catch {}
      busyRef.current = false;
      setDecoding(false);
    }
  };

  const startCamera = async () => {
    if (busyRef.current || loading || cooldown || scanning) return;
    busyRef.current = true;
    setError("");
    setResult(null);
    setDecodedContent("");
    setScanning(true);
    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;
    let detected = false;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          if (detected || !activeRef.current) return;
          detected = true;
          setDecodedContent(decoded);
          await stopCamera();
          await analyze(decoded);
        },
        () => {}
      );
      if (!activeRef.current || scannerRef.current !== scanner) {
        try { await scanner.stop(); scanner.clear(); } catch {}
      }
    } catch {
      if (activeRef.current) setError("Could not access the camera. Check browser permissions, or upload an image instead.");
      try { scanner.clear(); } catch {}
      setScanning(false);
      scannerRef.current = null;
    } finally { busyRef.current = false; }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="ai-qr-panel">
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <h3 className="font-heading text-base font-semibold tracking-tight flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" /> Scan a QR code
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Found a QR on a poster, parcel, payment request, or message? Check it here <span className="font-medium text-foreground">before</span> you open it.
        </p>

        {/* camera reader mounts here */}
        <div id={readerId} className={`mt-4 rounded-xl overflow-hidden ${scanning ? "border" : ""}`} />

        {!scanning && (
          <div
            role="button"
            tabIndex={loading || decoding || cooldown ? -1 : 0}
            aria-label="Upload a QR code image"
            aria-disabled={loading || decoding || !!cooldown}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!loading && !decoding && !cooldown) fileRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
            onClick={() => { if (!loading && !decoding && !cooldown) fileRef.current?.click(); }}
            className={`mt-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200 px-5 py-6 text-center ${dragOver ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
            data-testid="qr-dropzone"
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" strokeWidth={1.4} />
            <p className="text-sm font-medium">Drop a QR image here, or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1.5">Screenshot, photo, or saved image — decoded locally in your browser</p>
            <input onClick={(e) => e.stopPropagation()} aria-label="QR image file" disabled={loading || decoding || !!cooldown} ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="qr-file-input" />
          </div>
        )}

        <p role="alert" className="text-sm text-red-700 mt-3">{error}</p>
        {decoding && <p role="status" className="text-sm mt-3">Decoding QR image…</p>}
        <p className="text-xs text-muted-foreground mt-3">Images up to 10 MB. Decoded content is sent for AI analysis.</p>
        <div className="mt-4 space-y-3">
          <CooldownBanner seconds={cooldown} label="Scan limit reached." />
          {!scanning ? (
            <Button onClick={startCamera} disabled={loading || decoding || !!cooldown} variant="outline" className="w-full rounded-lg" data-testid="qr-camera-button">
              <Camera className="w-4 h-4 mr-2" /> Scan with camera
            </Button>
          ) : (
            <Button onClick={stopCamera} variant="outline" className="w-full rounded-lg border-red-500/40 text-red-500 hover:text-red-600" data-testid="qr-stop-button">
              <X className="w-4 h-4 mr-2" /> Stop camera
            </Button>
          )}
        </div>
      </div>

      <ScanResult result={result} loading={loading} kind="qr" decoded={decodedContent} />
    </div>
  );
}

