import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, ScanSearch, QrCode, GraduationCap, AlertTriangle, Flag, Clock, ChevronRight, Sparkles, Loader2, FileText, Activity, Quote, Zap, ArrowRight, Award } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const statIcons = { detections: ScanSearch, quizzes: GraduationCap, reports: Flag, qr_scans: QrCode };
const statColors = { detections: "text-primary bg-accent", quizzes: "text-primary bg-accent", reports: "text-primary bg-accent", qr_scans: "text-primary bg-accent" };
const statLabels = { detections: "Scams Detected", quizzes: "Quizzes Taken", reports: "Reports Filed", qr_scans: "QR Scans" };
const activityMeta = { detect: { icon: AlertTriangle, color: "text-primary bg-accent" }, report: { icon: Flag, color: "text-primary bg-accent" }, quiz: { icon: GraduationCap, color: "text-primary bg-accent" }, qr: { icon: QrCode, color: "text-primary bg-accent" } };

const quickActions = [
  { icon: Bot, label: "AI Chatbot", desc: "Ask about scams & safety", to: "/ai?tab=chat" },
  { icon: ScanSearch, label: "Scam Detector", desc: "Analyze suspicious messages", to: "/ai?tab=detect" },
  { icon: QrCode, label: "QR Scanner", desc: "Check QR codes before scanning", to: "/ai?tab=qr" },
  { icon: GraduationCap, label: "Take Quiz", desc: "Test your cybersecurity knowledge", to: "/quiz" },
];

function AnimatedCounter({ value, label, Icon, color }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => { current += increment; if (current >= value) { setDisplay(value); clearInterval(timer); } else setDisplay(Math.round(current)); }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" strokeWidth={1.6} />
      </div>
      <p className="font-heading text-3xl font-bold tracking-tighter mt-4 tabular-nums">{display}</p>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Avatar({ name }) {
  const initials = (name || "U").split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2);
  return <div className={`w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-heading font-bold text-lg shadow-sm`}>{initials}</div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tips, setTips] = useState([]);
  const [chats, setChats] = useState([]);
  const [tipIdx, setTipIdx] = useState(0);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get("/user/stats").then(r => setStats(r.data)).catch(() => {}),
      api.get("/user/activity").then(r => setActivities(r.data)).catch(() => {}),
      api.get("/safety-tips").then(r => setTips(r.data || [])).catch(() => {}),
      api.get("/user/chat-sessions").then(r => setChats(r.data || [])).catch(() => {}),
      api.get("/quiz/certificate").then(r => setCertificate(r.data.certificate)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (tips.length < 2) return;
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 8000);
    return () => clearInterval(t);
  }, [tips.length]);

  if (!user || loading) return <div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const tip = tips[tipIdx];

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden">


      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={user.name} />
          <div className="flex-1">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tighter">Welcome back, {user.name?.split(" ")[0] || "there"}<span className="text-primary">.</span></h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Member since {stats?.member_since ? new Date(stats.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "today"}</span>
              {stats && <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> <span className="text-primary font-semibold">{stats.total_activity}</span> total activities</span>}
            </p>
          </div>
          <Link to="/ai" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors">
            <Bot className="w-4 h-4" /> Ask SafeBot
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statIcons).map(([key, Icon]) => (
              <AnimatedCounter key={key} value={stats[key]} label={statLabels[key]} Icon={Icon} color={statColors[key]} />
            ))}
          </div>
        )}

        <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-5" data-testid="dashboard-certificate-card">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${certificate ? "bg-amber-500/10" : "bg-secondary"}`}>
            <Award className={`w-6 h-6 ${certificate ? "text-amber-800" : "text-muted-foreground"}`} strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-base font-semibold tracking-tight">
              {certificate ? "Cyber Safety Certificate earned" : "Earn your Cyber Safety Certificate"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {certificate
                ? `Scored ${certificate.score}/${certificate.total} on ${new Date(certificate.issued_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Issued once — open the quiz to download it again.`
                : "Score 60% or higher on the Cyber Safety Quiz to earn your certificate. It's issued once."}
            </p>
          </div>
          <Link
            to="/quiz"
            data-testid="dashboard-certificate-cta"
            className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
              certificate ? "border hover:border-amber-500/50" : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            <GraduationCap className="w-4 h-4" /> {certificate ? "View certificate" : "Take the quiz"}
          </Link>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(a => (
              <button key={a.to} onClick={() => navigate(a.to)} className="group rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center">
                    <a.icon className="w-5 h-5" strokeWidth={1.6} />
                  </div>
                  <p className="font-heading text-base font-semibold mt-4">{a.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.desc}</p>
                  <ArrowRight className="w-4 h-4 mt-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Recent Activity</h2>
            {activities.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.2} />
                <p className="text-sm text-muted-foreground">No activity yet. Try scanning a QR or detecting a scam!</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card divide-y overflow-hidden">
                {activities.slice(0, 8).map((a, i) => {
                  const meta = activityMeta[a.type] || { icon: FileText, color: "text-primary bg-sky-500/10" };
                  const Icon = meta.icon;
                  return (
                    <div key={a.id || i} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                        <Icon className="w-4 h-4" strokeWidth={1.6} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.subtitle && a.type === "detect" && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${a.subtitle === "dangerous" ? "text-red-700 bg-red-500/10" : a.subtitle === "suspicious" ? "text-primary bg-accent" : "text-primary bg-accent"}`}>{a.subtitle}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {tip && (
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Safety Tip</h2>
                <div className="rounded-xl border bg-card p-5 relative overflow-hidden transition-all duration-500" key={tipIdx}>
                  <Quote className="w-6 h-6 text-primary/30 mb-3" />
                  <p className="text-sm font-medium leading-relaxed">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{tip.summary}</p>
                  <div className="flex gap-1.5 mt-4">
                    {tips.slice(0, 6).map((_, i) => (
                      <button key={i} aria-label={`Show safety tip ${i + 1}`} onClick={() => setTipIdx(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === tipIdx ? "w-6 bg-sky-500" : "w-1.5 bg-border hover:bg-sky-500/50"}`} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {chats.length > 0 && (
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Recent Chats</h2>
                <div className="rounded-xl border bg-card divide-y overflow-hidden">
                  {chats.slice(0, 4).map((c, i) => (
                    <Link key={c.session_id || i} to={`/ai?session=${c.session_id}`} className="flex items-center gap-3 p-3.5 hover:bg-secondary/50 transition-colors group">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{c.last_message?.slice(0, 80) || "Chat session"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.message_count} messages · {new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
