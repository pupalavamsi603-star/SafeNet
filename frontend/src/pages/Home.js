import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Shield, Bot, ScanSearch, GraduationCap, BookOpenCheck, ArrowRight,
  MessageSquareWarning, Lock, AlertTriangle, ChevronRight, Globe,
  ShieldCheck, ShieldAlert, Loader2, ExternalLink, CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { api, formatApiErrorDetail } from "../lib/api";

const HERO_IMG = "https://images.unsplash.com/photo-1750969185331-e03829f72c7d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1800";

const features = [
  { icon: ScanSearch, title: "AI Scam Detection", desc: "Paste any suspicious message and our AI instantly rates its risk, exposes red flags, and tells you what to do.", to: "/ai", span: "md:col-span-7", accent: "text-red-500", testid: "feature-card-detection" },
  { icon: Bot, title: "AI Assistant", desc: "Ask anything about online safety — SafeBot answers in plain language, 24/7.", to: "/ai", span: "md:col-span-5", accent: "text-sky-500", testid: "feature-card-assistant" },
  { icon: BookOpenCheck, title: "Cyber Safety Tips", desc: "10 essential defense habits — passwords, 2FA, banking, Wi-Fi and more.", to: "/tips", span: "md:col-span-5", accent: "text-emerald-500", testid: "feature-card-tips" },
  { icon: GraduationCap, title: "Cyber Safety Quiz", desc: "Test your scam-spotting skills with 15 real-world scenarios and earn your certificate.", to: "/quiz", span: "md:col-span-7", accent: "text-amber-500", testid: "feature-card-quiz" },
];

const stats = [
  { value: "11", label: "Scam types decoded" },
  { value: "24/7", label: "AI protection" },
  { value: "10", label: "Safety practices" },
  { value: "1930", label: "Cyber helpline (IN)" },
];

const faqs = [
  { q: "What should I do first if I've been scammed?", a: "Act fast. Call your bank immediately to freeze cards/accounts, change passwords for affected accounts, and report to your national cybercrime portal (call 1930 or cybercrime.gov.in in India, ic3.gov in the USA). Speed matters — banks can sometimes reverse transfers reported within hours." },
  { q: "How does the AI scam detector work?", a: "Paste any suspicious SMS, email, or WhatsApp message into our detector. The AI analyzes language patterns, urgency tactics, links, and known scam signatures, then gives you a risk score, the likely scam type, and specific next steps." },
  { q: "Is it ever safe to share an OTP?", a: "No. Never. Not with your bank, not with 'customer support', not with the police. OTPs authorize transactions — anyone asking for one is trying to move your money. Banks will never ask for OTPs, PINs, or passwords." },
  { q: "Is SafeNet free to use?", a: "Yes. All learning resources, the AI assistant, scam detector, quiz, and scam reporting are completely free. Our mission is making cyber safety knowledge accessible to everyone." },
  { q: "Can I report a scam anonymously?", a: "Yes. The report form works without an account, and contact details are optional. Your report helps us track scam trends and warn others." },
];

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

const riskCfg = {
  safe: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", bar: "bg-emerald-500", icon: ShieldCheck, label: "Looks Safe" },
  suspicious: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", bar: "bg-amber-500", icon: AlertTriangle, label: "Suspicious" },
  dangerous: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", bar: "bg-red-500", icon: ShieldAlert, label: "Dangerous" },
};

function URLTool() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  const check = async () => {
    const u = url.trim();
    if (!u) { setError("Enter a URL to check"); return; }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/url-check", { url: u });
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || "Check failed. Try again.");
    }
    setLoading(false);
  };

  const cfg = result ? riskCfg[result.risk_level] || riskCfg.suspicious : null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24" id="url-check">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" /> URL Safety Checker
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tighter">Is that link safe to click?</h2>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-md">
            Paste any suspicious link — SMS, email, social media — and get an instant AI safety analysis before you click.
          </p>
          <div className="mt-7 flex gap-3">
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="https://suspicious-link.com/..."
              className="h-12 rounded-xl flex-1 text-sm"
              data-testid="url-check-input"
            />
            <Button onClick={check} disabled={loading} className="h-12 rounded-xl bg-sky-500 hover:bg-sky-600 text-white px-6 shrink-0" data-testid="url-check-button">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4 mr-1.5" /> Check URL</>}
            </Button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </motion.div>

        <motion.div ref={resultRef} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
          {!result && !loading && (
            <div className="rounded-xl border bg-card p-10 text-center">
              <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.2} />
              <p className="text-sm text-muted-foreground">Enter a URL above and we'll check it for phishing, malware, or scam indicators — powered by AI.</p>
            </div>
          )}
          {loading && (
            <div className="rounded-xl border bg-card p-10 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
              <p className="text-sm text-muted-foreground">AI is analyzing this URL...</p>
            </div>
          )}
          {result && cfg && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-6 space-y-5">
              <div className={`rounded-xl border p-5 ${cfg.bg}`}>
                <div className="flex items-center gap-3">
                  <cfg.icon className={`w-8 h-8 ${cfg.color}`} strokeWidth={1.6} />
                  <div>
                    <p className={`font-heading text-lg font-bold tracking-tight ${cfg.color}`}>{cfg.label}</p>
                    {result.scam_type && result.scam_type !== "None detected" && (
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{result.scam_type}</p>
                    )}
                  </div>
                  <span className={`ml-auto font-heading text-2xl font-bold ${cfg.color}`}>{result.risk_score}<span className="text-sm">/100</span></span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div className={`h-full rounded-full ${cfg.bar}`} initial={{ width: 0 }} animate={{ width: `${result.risk_score}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                </div>
              </div>
              {result.explanation && <p className="text-sm leading-relaxed">{result.explanation}</p>}
              {result.red_flags?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2.5">Red flags</p>
                  <ul className="space-y-2">
                    {result.red_flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.advice?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2.5">What to do</p>
                  <ul className="space-y-2">
                    {result.advice.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={() => { setResult(null); setUrl(""); }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Check another URL
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Abstract digital network" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-950/75" />
          <div className="absolute inset-0 hero-grid-bg opacity-40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-36 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }}>
              <p className="text-xs uppercase tracking-[0.25em] text-sky-400 mb-5 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Cyber Safety · Scam Awareness · AI Protection
              </p>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-white leading-[1.08]">
                Stay Safe Online with <span className="text-sky-400">AI-Powered</span> Cyber Protection
              </h1>
              <p className="mt-6 text-base md:text-lg text-slate-300 max-w-xl leading-relaxed">
                Learn how scammers operate, detect suspicious messages instantly, and build habits that make you
                nearly impossible to fool. Your knowledge is the firewall.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-sky-500 hover:bg-sky-600 text-white px-7" data-testid="hero-cta-learn">
                  <Link to="/tips">Learn Cyber Safety <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-red-400/50 text-red-300 hover:bg-red-500/15 hover:text-red-200 bg-transparent px-7" data-testid="hero-cta-detect">
                  <Link to="/ai?tab=detect"><MessageSquareWarning className="w-4 h-4 mr-1.5" /> Detect a Scam</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-slate-500/60 text-slate-200 hover:bg-white/10 hover:text-white bg-transparent px-7" data-testid="hero-cta-chat">
                  <Link to="/ai"><Bot className="w-4 h-4 mr-1.5" /> Start AI Chat</Link>
                </Button>
              </div>
            </motion.div>
          </div>
          <motion.div
            className="lg:col-span-5 hidden lg:flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative w-72 h-72 float-slow" data-testid="hero-illustration">
              <div className="absolute inset-0 rounded-2xl border border-sky-400/30 bg-sky-500/5 backdrop-blur-sm overflow-hidden">
                <div className="absolute left-0 right-0 h-0.5 bg-sky-400/60 scan-line" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Shield className="w-28 h-28 text-sky-400" strokeWidth={1.2} />
                  <Lock className="w-9 h-9 text-white absolute inset-0 m-auto" strokeWidth={1.6} />
                  <div className="absolute -inset-6 rounded-full border border-sky-400/40 pulse-ring" />
                </div>
              </div>
              <div className="absolute -top-3 -right-3 glass-panel rounded-lg px-3 py-2 text-xs text-sky-300 border-sky-400/30">Threat blocked</div>
              <div className="absolute -bottom-3 -left-3 glass-panel rounded-lg px-3 py-2 text-xs text-emerald-300 border-emerald-400/30">Connection secure</div>
            </div>
          </motion.div>
        </div>
      </section>

      <URLTool />

      {/* STATS */}
      <section className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`py-8 px-4 ${i !== 0 ? "md:border-l" : ""} ${i % 2 !== 0 ? "border-l md:border-l" : ""}`}>
              <p className="font-heading text-3xl font-bold text-sky-500">{s.value}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-3">What SafeNet gives you</p>
        <h2 className="font-heading text-base md:text-lg font-semibold tracking-tight max-w-lg">
          Four tools that turn you from an easy target into a hard one.
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className={`${f.span}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link
                to={f.to}
                data-testid={f.testid}
                className="group block h-full rounded-xl border bg-card p-8 hover:border-sky-500/50 transition-colors duration-300"
              >
                <f.icon className={`w-9 h-9 ${f.accent}`} strokeWidth={1.5} />
                <h3 className="font-heading text-lg font-semibold mt-5 tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm text-sky-500 mt-5 group-hover:gap-2.5 transition-[gap] duration-300">
                  Explore <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ALERT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
          <AlertTriangle className="w-10 h-10 text-red-500 shrink-0" strokeWidth={1.5} />
          <div className="flex-1">
            <h3 className="font-heading text-lg font-semibold tracking-tight">Been targeted by a scam?</h3>
            <p className="text-sm text-muted-foreground mt-1.5">Report it now — every report helps protect thousands of others. Get emergency steps and file your report in under 2 minutes.</p>
          </div>
          <Button asChild className="rounded-full bg-red-500 hover:bg-red-600 text-white px-7 shrink-0" data-testid="home-report-cta">
            <Link to="/report">Report a Scam</Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24" data-testid="faq-section">
        <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-3">FAQ</p>
        <h2 className="font-heading text-base md:text-lg font-semibold tracking-tight mb-8">Common questions, straight answers.</h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-5 bg-card" data-testid={`faq-item-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
