import { Users, Flag, Mail, ShieldAlert, GraduationCap, ScanSearch, Loader2, ClipboardCheck, Lightbulb } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const cards = [
  { key: "users", label: "Users", icon: Users, accent: "text-sky-500 bg-sky-500/10" },
  { key: "reports", label: "Scam Reports", icon: Flag, accent: "text-red-500 bg-red-500/10" },
  { key: "pending_reports", label: "Pending Reports", icon: ClipboardCheck, accent: "text-amber-500 bg-amber-500/10" },
  { key: "messages", label: "Contact Messages", icon: Mail, accent: "text-violet-500 bg-violet-500/10" },
  { key: "scam_types", label: "Scam Articles", icon: ShieldAlert, accent: "text-orange-500 bg-orange-500/10" },
  { key: "safety_tips", label: "Safety Tips", icon: Lightbulb, accent: "text-emerald-500 bg-emerald-500/10" },
  { key: "quiz_taken", label: "Quizzes Taken", icon: GraduationCap, accent: "text-pink-500 bg-pink-500/10" },
  { key: "detections", label: "AI Detections Run", icon: ScanSearch, accent: "text-cyan-500 bg-cyan-500/10" },
];

export const Overview = ({ stats }) => {
  if (!stats) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  return (
    <div data-testid="admin-overview-panel">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border bg-card p-5" data-testid={`stat-card-${c.key}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.accent}`}>
              <c.icon className="w-4.5 h-4.5 w-5 h-5" />
            </div>
            <p className="font-heading text-2xl font-bold mt-3">{stats[c.key] ?? 0}</p>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-card p-6">
        <h3 className="font-heading text-base font-semibold tracking-tight mb-6">Reported scams by category</h3>
        {stats.reports_by_category?.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.reports_by_category} margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 65% / 0.15)" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }} width={30} />
              <Tooltip cursor={{ fill: "rgba(59,130,246,0.08)" }} contentStyle={{ background: "hsl(222 47% 7%)", border: "1px solid hsl(222 40% 15%)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-10 text-center">No scam reports yet — the chart will populate as reports come in.</p>
        )}
      </div>
    </div>
  );
};
