import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Bot, ScanSearch, QrCode, GraduationCap, AlertTriangle, Flag, Clock, ChevronRight, Sparkles, Loader2, User, TrendingUp, FileText, Activity, Quote, Zap, ArrowRight, Award } from "lucide-react";
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

function KineticGridBackground() {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!host || !canvas || !ctx) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? false;
    // Touch devices have no cursor for the grid to react to, so animating it is
    // pure cost with nothing to show. Those get a single static paint.
    const interactive = finePointer && !prefersReduced;

    const gap = 34;
    const radius = 300;
    const pull = 1.25;
    const NEAR = 0.02;            // above this, a dot gets its own styled draw
    const MAX_PIXELS = 4000000;   // cap on the canvas backing store

    let width = 1;
    let height = 1;
    let dots = [];
    let cols = [];
    let raf = 0;
    let running = false;
    let trail = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const build = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      // The dashboard runs several screens tall; at native DPR a full-height
      // canvas reaches tens of millions of pixels, which is what makes phones
      // crawl. Clamp the backing store and let it scale instead.
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width * height * dpr * dpr > MAX_PIXELS) {
        dpr = Math.sqrt(MAX_PIXELS / (width * height));
      }
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = [];
      dots = [];
      const colCount = Math.floor(width / gap) + 2;
      const rowCount = Math.floor(height / gap) + 2;
      for (let c = 0; c < colCount; c += 1) {
        const col = [];
        for (let r = 0; r < rowCount; r += 1) {
          const dot = { hx: c * gap, hy: r * gap, x: c * gap, y: r * gap, vx: 0, vy: 0, p: 0 };
          col.push(dot);
          dots.push(dot);
        }
        cols.push(col);
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const dot of dots) {
        if (!mouse.active) { dot.p = 0; continue; }
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        dot.p = d < radius ? 1 - d / radius : 0;
      }

      // Everything away from the cursor shares one style, so it goes into a
      // single path and a single stroke instead of thousands of draw calls.
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 0.45;
      ctx.globalAlpha = 0.035;
      ctx.beginPath();
      for (let c = 0; c < cols.length; c += 1) {
        for (let r = 0; r < cols[c].length; r += 1) {
          const dot = cols[c][r];
          if (dot.p > NEAR) continue;
          const right = cols[c + 1]?.[r];
          const down = cols[c]?.[r + 1];
          if (right) { ctx.moveTo(dot.x, dot.y); ctx.lineTo(right.x, right.y); }
          if (down) { ctx.moveTo(dot.x, dot.y); ctx.lineTo(down.x, down.y); }
        }
      }
      ctx.stroke();

      // Only the ring of dots near the cursor needs individual styling.
      for (let c = 0; c < cols.length; c += 1) {
        for (let r = 0; r < cols[c].length; r += 1) {
          const dot = cols[c][r];
          if (dot.p <= NEAR) continue;
          const right = cols[c + 1]?.[r];
          const down = cols[c]?.[r + 1];
          ctx.lineWidth = 0.45 + dot.p * 1.1;
          ctx.globalAlpha = 0.035 + dot.p * 0.26;
          ctx.beginPath();
          if (right) { ctx.moveTo(dot.x, dot.y); ctx.lineTo(right.x, right.y); }
          if (down) { ctx.moveTo(dot.x, dot.y); ctx.lineTo(down.x, down.y); }
          ctx.stroke();
        }
      }

      ctx.fillStyle = "#e0f2fe";
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      for (const dot of dots) {
        if (dot.p > NEAR) continue;
        ctx.moveTo(dot.x + 0.8, dot.y);   // keeps the arcs from joining up
        ctx.arc(dot.x, dot.y, 0.8, 0, 2 * Math.PI);
      }
      ctx.fill();

      for (const dot of dots) {
        if (dot.p <= NEAR) continue;
        ctx.globalAlpha = 0.18 + dot.p * 0.48;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 0.8 + dot.p * 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }

      if (interactive && trail.length > 1) {
        const now = performance.now();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0ea5e9";
        ctx.lineWidth = 1.8;
        for (let i = 1; i < trail.length; i += 1) {
          const a = trail[i - 1];
          const b = trail[i];
          const age = now - b.t;
          if (age > 260) continue;
          ctx.globalAlpha = Math.max(0, 1 - age / 260) * 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    };

    const step = () => {
      let moving = false;
      for (const dot of dots) {
        let ax = (dot.hx - dot.x) * 0.075;
        let ay = (dot.hy - dot.y) * 0.075;
        if (mouse.active) {
          const dx = mouse.x - dot.x;
          const dy = mouse.y - dot.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < radius && d > 0.001) {
            const force = (1 - d / radius) * pull;
            ax += (dx / d) * force;
            ay += (dy / d) * force;
          }
        }
        dot.vx = (dot.vx + ax) * 0.82;
        dot.vy = (dot.vy + ay) * 0.82;
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (!moving && (Math.abs(dot.vx) > 0.01 || Math.abs(dot.vy) > 0.01
          || Math.abs(dot.x - dot.hx) > 0.05 || Math.abs(dot.y - dot.hy) > 0.05)) moving = true;
      }
      return moving;
    };

    const draw = () => {
      const moving = step();
      if (trail.length) {
        const now = performance.now();
        trail = trail.filter((pt) => now - pt.t <= 260);
      }
      render();
      // The old loop ran forever once the mouse had moved even once, repainting
      // an identical static grid every frame. Park it when nothing is moving.
      if (mouse.active || moving || trail.length) {
        raf = requestAnimationFrame(draw);
      } else {
        running = false;
      }
    };

    const ensureRunning = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // Ignore the pointer when it is nowhere near the grid, otherwise the loop
      // keeps running while the cursor sits elsewhere on the page.
      if (x < -radius || y < -radius || x > width + radius || y > height + radius) {
        if (mouse.active) { mouse.active = false; trail = []; ensureRunning(); }
        return;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
      trail.push({ x, y, t: performance.now() });
      if (trail.length > 60) trail.shift();
      ensureRunning();
    };

    const onLeave = () => {
      mouse.active = false;
      trail = [];
      ensureRunning();   // let the dots spring home, then park
    };

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { build(); render(); }, 150);
    };

    build();
    render();   // one paint; non-interactive devices stop right here

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);

    if (interactive) {
      window.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("mouseleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.16),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.10),rgba(2,6,23,0.36))]" />
    </div>
  );
}

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

  if (!user || loading) return <div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  const tip = tips[tipIdx];

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <KineticGridBackground />

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

        <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-5" data-testid="dashboard-certificate-card">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${certificate ? "bg-amber-500/10" : "bg-secondary"}`}>
            <Award className={`w-6 h-6 ${certificate ? "text-amber-500" : "text-muted-foreground"}`} strokeWidth={1.6} />
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
              certificate ? "border hover:border-amber-500/50" : "bg-amber-500 hover:bg-amber-600 text-white"
            }`}
          >
            <GraduationCap className="w-4 h-4" /> {certificate ? "View certificate" : "Take the quiz"}
          </Link>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight mb-5 flex items-center gap-2"><Zap className="w-5 h-5 text-sky-500" /> Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(a => (
              <button key={a.to} onClick={() => navigate(a.to)} className={`group relative overflow-hidden rounded-xl p-5 text-left text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gradient-to-br ${a.gradient}`}>
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
