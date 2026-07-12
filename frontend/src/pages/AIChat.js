import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, SendHorizonal, ScanSearch, User, Loader2, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { API, api } from "../lib/api";
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

const riskConfig = {
  safe: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", bar: "bg-emerald-500", icon: ShieldCheck, label: "Looks Safe" },
  suspicious: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", bar: "bg-amber-500", icon: AlertTriangle, label: "Suspicious" },
  dangerous: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", bar: "bg-red-500", icon: ShieldAlert, label: "Dangerous" },
};

function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
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
    if (!msg || streaming) return;
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
      <div className="border-t p-4 flex gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about scams, passwords, safe browsing..."
          className="min-h-[48px] max-h-32 resize-none"
          data-testid="chat-input"
        />
        <Button onClick={() => send()} disabled={streaming || !input.trim()} className="bg-sky-500 hover:bg-sky-600 text-white self-end rounded-full h-11 w-11 p-0" data-testid="chat-send-button" aria-label="Send">
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function DetectTab() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (message.trim().length < 5) { toast.error("Paste a message with at least a few words."); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/detect", { message });
      setResult(data);
    } catch (e) {
      toast.error("Analysis failed. Please try again.");
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
        <Button onClick={analyze} disabled={loading} className="mt-4 w-full rounded-full bg-red-500 hover:bg-red-600 text-white" data-testid="detect-analyze-button">
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI...</>) : (<><ScanSearch className="w-4 h-4 mr-2" /> Analyze for Scams</>)}
        </Button>
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

export default function AIChat() {
  const [params] = useSearchParams();
  const defaultTab = params.get("tab") === "detect" ? "detect" : "chat";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="ai-page">
      <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-4">AI protection tools</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter">AI Assistant & Scam Detector</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Chat with SafeBot about anything cybersecurity, or paste a suspicious message for an instant AI risk analysis.
      </p>

      <Tabs defaultValue={defaultTab} className="mt-10">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full h-11">
          <TabsTrigger value="chat" className="rounded-full" data-testid="tab-chat"><Bot className="w-4 h-4 mr-1.5" /> AI Chatbot</TabsTrigger>
          <TabsTrigger value="detect" className="rounded-full" data-testid="tab-detect"><ScanSearch className="w-4 h-4 mr-1.5" /> Scam Detector</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-6"><ChatTab /></TabsContent>
        <TabsContent value="detect" className="mt-6"><DetectTab /></TabsContent>
      </Tabs>
    </div>
  );
}
