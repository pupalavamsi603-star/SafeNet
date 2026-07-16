import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Bot, ScanSearch, QrCode, GraduationCap, AlertTriangle, Flag, Clock, ChevronRight, Sparkles, Loader2, User, TrendingUp, FileText, Activity, Quote, Zap, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const statIcons = { detections: ScanSearch, quizzes: GraduationCap, reports: Flag, qr_scans: QrCode };
const statColors = { detections: "text-rose-500 bg-rose-500/10", quizzes: "text-emerald-500 bg-emerald-500/10", reports: "text-amber-500 bg-amber-500/10", qr_scans: "text-violet-500 bg-violet-500/10" };
const statLabels = { detections: "Scams Detected", quizzes: "Quizzes Taken", reports: "Reports Filed", qr_scans: "QR Scans" };
const activityMeta = { detect: { icon: AlertTriangle, color: "text-rose-500 bg-rose-500/10" }, report: { icon: Flag, color: "text-amber-500 bg-amber-500/10" }, quiz: { icon: GraduationCap, color: "text-emerald-500 bg-emerald-500/10" }, qr: { icon: QrCode, color: "text-violet-500 bg-violet-500/10" } };

const quickActions = [
  { icon: Bot, label: "AI Chatbot", desc: "Ask about scams & safety", to: "/ai?tab=chat", gradient: "from-sky-500 to-blue-600" },
  { icon: ScanSearch, label: "Scam Detector", desc: "Analyze suspicious messages", to: "/ai?tab=detect", gradient: "from-red-500 to-rose-600" },
  { icon: QrCode, label: "QR Scanner", desc: "Check QR codes before scanning", to: "/ai?tab=qr", gradient: "from-violet-500 to-purple-600" },
  { icon: GraduationCap, label: "Take Quiz", desc: "Test your cybersecurity knowledge", to: "/quiz", gradient: "from-emerald-500 to-teal-600" },
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
    <div className="rounded-xl border bg-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
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
  const colors = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500"];
  const c = colors[(name || "").length % colors.length];
  return <div className={`w-14 h-14 rounded-2xl ${c} flex items-center justify-center text-white font-heading font-bold text-lg shadow-lg`}>{initials}</div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tips, setTips] = useState([]);
  const [chats, setChats] = useState([]);
  const [tipIdx, setTipIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get("/user/stats").then(r => setStats(r.data)).catch(() => {}),
      api.get("/user/activity").then(r => setActivities(r.data)).catch(() => {}),
      api.get("/safety-tips").then(r => setTips(r.data || [])).catch(() => {}),
      api.get("/user/chat-sessions").then(r => setChats(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (tips.length < 2) return;
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 8000);
    return () => clearInterval(t);
  }, [tips.length]);

  if (!user || loading) return <div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  const tip = tips[tipIdx];

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 -left-48 w-[30rem] h-[30rem] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-48 w-[30rem] h-[30rem] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-sky-400/5 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={user.name} />
          <div className="flex-1">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tighter">Welcome back, {user.name?.split(" ")[0] || "there"}<span className="text-sky-500">.</span></h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Member since {stats?.member_since ? new Date(stats.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "today"}</span>
              {stats && <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-sky-500" /> <span className="text-sky-500 font-semibold">{stats.total_activity}</span> total activities</span>}
            </p>
          </div>
          <Link to="/ai" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors">
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

        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Zap className="w-5 h-5 text-sky-500" /> Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(a => (
              <button key={a.to} onClick={() => navigate(a.to)} className="group relative overflow-hidden rounded-xl p-5 text-left text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ background: `linear-gradient(135deg, ${a.gradient.replace("from-", "#").replace("to-", "#")})` }}>
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <a.icon className="w-5 h-5" strokeWidth={1.6} />
                  </div>
                  <p className="font-heading text-base font-semibold mt-4">{a.label}</p>
                  <p className="text-sm text-white/70 mt-1">{a.desc}</p>
                  <ArrowRight className="w-4 h-4 mt-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Activity className="w-5 h-5 text-sky-500" /> Recent Activity</h2>
            {activities.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.2} />
                <p className="text-sm text-muted-foreground">No activity yet. Try scanning a QR or detecting a scam!</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card divide-y overflow-hidden">
                {activities.slice(0, 8).map((a, i) => {
                  const meta = activityMeta[a.type] || { icon: FileText, color: "text-sky-500 bg-sky-500/10" };
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
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${a.subtitle === "dangerous" ? "text-red-500 bg-red-500/10" : a.subtitle === "suspicious" ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10"}`}>{a.subtitle}</span>
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
                <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Sparkles className="w-5 h-5 text-sky-500" /> Safety Tip</h2>
                <div className="rounded-xl border bg-card p-5 relative overflow-hidden transition-all duration-500" key={tipIdx}>
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-sky-500/5 blur-2xl" />
                  <Quote className="w-6 h-6 text-sky-500/30 mb-3" />
                  <p className="text-sm font-medium leading-relaxed">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{tip.summary}</p>
                  <div className="flex gap-1.5 mt-4">
                    {tips.slice(0, 6).map((_, i) => (
                      <button key={i} onClick={() => setTipIdx(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === tipIdx ? "w-6 bg-sky-500" : "w-1.5 bg-border hover:bg-sky-500/50"}`} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {chats.length > 0 && (
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Bot className="w-5 h-5 text-sky-500" /> Recent Chats</h2>
                <div className="rounded-xl border bg-card divide-y overflow-hidden">
                  {chats.slice(0, 4).map((c, i) => (
                    <Link key={c.session_id || i} to={`/ai?session=${c.session_id}`} className="flex items-center gap-3 p-3.5 hover:bg-secondary/50 transition-colors group">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-sky-500" />
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
