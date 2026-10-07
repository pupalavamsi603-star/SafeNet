import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import { getIcon } from "../lib/icons";
import { Badge } from "../components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";

const severityStyle = {
  critical: "bg-red-500/15 text-red-700 border-red-500/30",
  high: "bg-amber-500/15 text-amber-800 border-amber-500/30",
};

export default function ScamTypes() {
  const [scams, setScams] = useState(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setScams(null);
    api.get("/scam-types").then((r) => setScams(r.data)).catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = scams?.filter((scam) => `${scam.title} ${scam.description}`.toLowerCase().includes(query.trim().toLowerCase()) && (severity === "all" || scam.severity === severity));
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12" data-testid="scam-types-page">
      <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">Recognize the warning signs</p>
      <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">Recognize the warning signs</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Understand common scam patterns, warning signs and protective steps. Open a guide for an example scenario and a relevant check.
      </p>

      <div className="guide-controls"><label><span className="sr-only">Search scam guides</span><input placeholder="Search scam guides" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label><span className="sr-only">Filter guide severity</span><select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="all">All guide severities</option>{[...new Set((scams || []).map((item) => item.severity))].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
      {error ? (
        <ErrorState message="We couldn't load the scam library. Check your connection and try again." onRetry={load} testId="scam-types-error" />
      ) : !scams ? (
        <LoadingState label="Loading scam types" />
      ) : scams.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No scam types published yet" message="Check back soon — new scam breakdowns are added regularly." testId="scam-types-empty" />
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((s, i) => {
            const Icon = getIcon(s.icon);
            return (
              <motion.div
                key={s.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.07 }}
              >
                <Link
                  to={`/scams/${s.slug}`}
                  data-testid={`scam-card-${s.slug}`}
                  className="group flex flex-col h-full rounded-xl border bg-card p-7 hover:border-primary/50 transition-colors duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" strokeWidth={1.6} />
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${severityStyle[s.severity] || severityStyle.high}`}>
                      {s.severity}
                    </Badge>
                  </div>
                  <h3 className="font-heading text-base font-semibold mt-5 tracking-tight">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3 flex-1">{s.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-primary mt-4 group-hover:gap-2.5 transition-[gap] duration-300">
                    Learn the tactics <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
      {scams?.length > 0 && visible?.length === 0 && <p className="dashboard-muted">No guides match your search. Try another phrase or clear the filters.</p>}
      <div className="learning-cta"><div><h2>Have something suspicious to check?</h2><p>Choose the scanner that fits your link, QR code or message.</p></div><Link className="premium-button" to="/#features">Choose a scanner →</Link></div>
    </div>
  );
}
