import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Lightbulb } from "lucide-react";
import { api } from "../lib/api";
import { getIcon } from "../lib/icons";
import { Badge } from "../components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";

export default function SafetyTips() {
  const [tips, setTips] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setTips(null);
    api.get("/safety-tips").then((r) => setTips(r.data)).catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12" data-testid="safety-tips-page">
      <p className="text-xs uppercase tracking-[0.25em] text-emerald-700 mb-4">Build your defenses</p>
      <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">Cyber Safety Tips</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Practical habits to help you recognize threats and protect your accounts.
      </p>

      {error ? (
        <ErrorState message="We couldn't load the safety tips. Check your connection and try again." onRetry={load} testId="safety-tips-error" />
      ) : !tips ? (
        <LoadingState label="Loading safety tips" />
      ) : tips.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No safety tips published yet" message="Check back soon — new guidance is added regularly." testId="safety-tips-empty" />
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {tips.map((t, i) => {
            const Icon = getIcon(t.icon);
            return (
              <motion.div
                key={t.slug}
                data-testid={`tip-card-${t.slug}`}
                className="rounded-xl border bg-card p-7"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: (i % 2) * 0.08 }}
              >
                <div className="flex flex-wrap gap-3 items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5.5 h-5.5 text-emerald-700 w-6 h-6" strokeWidth={1.6} />
                    </div>
                    <h3 className="font-heading text-base font-semibold tracking-tight">{t.title}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{t.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{t.summary}</p>
                <ul className="mt-5 space-y-2.5">
                  {t.points?.map((p, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
