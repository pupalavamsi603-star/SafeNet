import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, QrCode, GraduationCap, Flag, Clock, ArrowRight, Award, FileText, Activity, Sparkles, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { SafetyPlan } from "../components/SafetyPlan";

const metrics = [
  { key: "detections", label: "Messages analyzed", icon: FileText, tone: "blue" },
  { key: "qr_scans", label: "QR codes checked", icon: QrCode, tone: "green" },
  { key: "reports", label: "Reports filed", icon: Flag, tone: "orange" },
  { key: "quizzes", label: "Quiz attempts", icon: GraduationCap, tone: "purple" },
];
const types = { detect: { icon: FileText, label: "Message", tone: "blue" }, qr: { icon: QrCode, label: "QR code", tone: "green" }, report: { icon: Flag, label: "Report", tone: "orange" }, quiz: { icon: GraduationCap, label: "Quiz", tone: "purple" } };
const filters = [["all", "All activity"], ["detect", "Messages"], ["qr", "QR scans"], ["report", "Reports"], ["quiz", "Quizzes"]];
const dateLabel = (value) => new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

function ActivityTable({ records, history = false }) {
  if (!records) return <p className="dashboard-muted">Saved activity is unavailable. Use Retry to load your account records.</p>;
  if (!records.length) return <div className="dashboard-empty"><Activity size={30} aria-hidden="true" /><h3>No activity to show yet</h3><p>Your saved checks, reports and quiz attempts will appear here.</p><Link to="/ai?tab=url">Run your first check <ArrowRight size={15} aria-hidden="true" /></Link></div>;
  return <div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>Activity</th><th>Result / status</th><th>Date</th></tr></thead><tbody>{records.map((record, index) => {
    const meta = types[record.type] || { icon: Activity, label: "Activity", tone: "blue" };
    const Icon = meta.icon;
    const risk = ["safe", "suspicious", "dangerous", "malicious"].includes(record.subtitle) ? record.subtitle : "neutral";
    return <tr key={record.id || index}><td><div className="activity-target"><span className={`activity-icon ${meta.tone}`}><Icon size={17} aria-hidden="true" /></span><div><strong>{record.title}</strong>{history && <small>{meta.label}</small>}</div></div></td><td><span className={`activity-status status-${risk}`}>{record.subtitle || "Recorded"}</span></td><td><time dateTime={record.timestamp}>{dateLabel(record.timestamp)}</time></td></tr>;
  })}</tbody></table></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const history = params.get("view") === "history";
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState(null);
  const [tips, setTips] = useState([]);
  const [chats, setChats] = useState(null);
  const [certificate, setCertificate] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState("all");
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError("");
    Promise.allSettled([api.get("/user/stats"), api.get("/user/activity"), api.get("/safety-tips"), api.get("/user/chat-sessions"), api.get("/quiz/certificate")]).then(([counts, activity, safety, conversations, award]) => {
      if (!active) return;
      if (counts.status === "fulfilled") setStats(counts.value.data);
      if (activity.status === "fulfilled") setActivities(activity.value.data);
      if (safety.status === "fulfilled") setTips(safety.value.data || []);
      if (conversations.status === "fulfilled") setChats(conversations.value.data || []);
      if (award.status === "fulfilled") setCertificate(award.value.data.certificate);
      if (counts.status === "rejected" || activity.status === "rejected") setError("Some account activity could not load. Try again to see your latest records.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [user, retry]);
  useEffect(() => {
    if (tips.length < 2) return;
    const timer = setInterval(() => setTipIdx((index) => (index + 1) % tips.length), 8000);
    return () => clearInterval(timer);
  }, [tips.length]);
  if (!user || loading) return <div className="dashboard-loading" role="status"><Loader2 className="animate-spin" /><p>Loading your workspace…</p></div>;
  const tip = tips[tipIdx];
  const visible = activities?.filter((record) => filter === "all" || record.type === filter);
  const max = Math.max(1, ...metrics.map(({ key }) => stats?.[key] || 0));
  return <div className="dashboard-page" data-testid="dashboard-page">
    <div className="workspace-page-heading"><div><p className="page-overline">YOUR PERSONAL WORKSPACE</p><h1>{history ? "History" : "Dashboard"}</h1><p>{history ? "Your saved checks, reports and learning activity in one place." : `Welcome back, ${user.name?.split(" ")[0] || "there"}. Keep your next online decision a safer one.`}</p></div><Link to="/ai?tab=url" className="premium-button">Run a check <ArrowRight size={16} aria-hidden="true" /></Link></div>
    {error && <div className="dashboard-error" role="alert"><AlertCircle size={18} /><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Retry</button></div>}
    {!history && <>
      {stats && <div className="dashboard-stats">{metrics.map(({ key, label, icon: Icon, tone }) => <div className="dashboard-stat" key={key}><span className={`activity-icon ${tone}`}><Icon size={21} aria-hidden="true" /></span><div><strong>{stats[key] ?? 0}</strong><p>{label}</p></div></div>)}</div>}
      <div className="dashboard-overview-grid"><section className="dashboard-card"><div className="dashboard-card-heading"><h2>Recent activity</h2><Link to="/dashboard?view=history">View all <ArrowRight size={14} aria-hidden="true" /></Link></div><ActivityTable records={activities?.slice(0, 5)} /></section><section className="dashboard-card"><div className="dashboard-card-heading"><h2>Activity overview</h2><Activity size={17} aria-hidden="true" /></div>{stats ? <div className="activity-chart">{metrics.map(({ key, label, tone }) => <div className="activity-chart-row" key={key}><div><span>{label}</span><strong>{stats[key] ?? 0}</strong></div><div className="activity-bar-track"><span className={tone} style={{ width: `${((stats[key] || 0) / max) * 100}%` }} /></div></div>)}<p>Counts from your saved account activity.</p></div> : <p className="dashboard-muted">Activity counts are unavailable.</p>}</section></div>
      <SafetyPlan />
      <div className="dashboard-guidance-grid">{certificate !== undefined && <section className="dashboard-card certificate-card" data-testid="dashboard-certificate-card"><span className="activity-icon purple"><Award size={23} aria-hidden="true" /></span><div><h2>{certificate ? "Cyber Safety Certificate earned" : "Build your scam-spotting instincts"}</h2><p>{certificate ? `Scored ${certificate.score}/${certificate.total} on ${dateLabel(certificate.issued_at)}. Your certificate is ready to download from the quiz.` : "Practice with the Cyber Safety Quiz. Score 60% or higher to earn your certificate."}</p><Link to="/quiz" data-testid="dashboard-certificate-cta">{certificate ? "View certificate" : "Take the quiz"}<ArrowRight size={15} aria-hidden="true" /></Link></div></section>}{tip && <section className="dashboard-card dashboard-tip"><p className="page-overline"><Sparkles size={14} aria-hidden="true" /> SAFETY TIP</p><h2>{tip.title}</h2><p>{tip.summary}</p><div className="tip-pagination">{tips.slice(0, 6).map((_, index) => <button key={index} type="button" onClick={() => setTipIdx(index)} aria-label={`Show safety tip ${index + 1}`} aria-pressed={tipIdx === index} />)}</div></section>}</div>
    </>}
    {history && <section className="dashboard-card history-card"><div className="dashboard-card-heading"><h2>Saved activity</h2><span>{visible ? `${visible.length} records` : "Unavailable"}</span></div><div className="history-filters" aria-label="Filter history">{filters.map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}</button>)}</div><ActivityTable records={visible} history /><p className="history-note">Showing up to 20 recent records available from your account.</p></section>}
    <section className="dashboard-card"><div className="dashboard-card-heading"><h2>Conversations with SafeNet AI</h2><Link to="/ai?tab=chat">Ask AI <ArrowRight size={14} aria-hidden="true" /></Link></div>{chats === null ? <p className="dashboard-muted">Conversation history is unavailable right now.</p> : chats.length ? <div className="dashboard-chat-list">{chats.slice(0, history ? 10 : 4).map((chat) => <Link key={chat.session_id} to={`/ai?tab=chat&session=${encodeURIComponent(chat.session_id)}`}><span className="activity-icon purple"><Bot size={18} aria-hidden="true" /></span><div><strong>{chat.last_message?.slice(0, 100) || "Conversation"}</strong><small>{chat.message_count} messages · {dateLabel(chat.updated_at)}</small></div><ArrowRight size={16} aria-hidden="true" /></Link>)}</div> : <div className="dashboard-chat-empty"><Bot size={22} aria-hidden="true" /><p>Your conversations will appear here once you ask SafeNet AI a question.</p></div>}</section>
    <p className="dashboard-account-note"><Clock size={14} aria-hidden="true" />{stats?.member_since ? `Member since ${new Date(stats.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : "Personal account"} · Your activity is private to your account.</p>
  </div>;
}
