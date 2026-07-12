import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { getIcon } from "../lib/icons";
import { Badge } from "../components/ui/badge";

export default function SafetyTips() {
  const [tips, setTips] = useState(null);

  useEffect(() => {
    api.get("/safety-tips").then((r) => setTips(r.data)).catch(() => setTips([]));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20" data-testid="safety-tips-page">
      <p className="text-xs uppercase tracking-[0.25em] text-emerald-500 mb-4">Build your defenses</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter">Cyber Safety Tips</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Ten habits that block the vast majority of attacks. Master these and you're safer than 95% of internet users.
      </p>

      {!tips ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
      ) : (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5.5 h-5.5 text-emerald-500 w-6 h-6" strokeWidth={1.6} />
                    </div>
                    <h3 className="font-heading text-base font-semibold tracking-tight">{t.title}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{t.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{t.summary}</p>
                <ul className="mt-5 space-y-2.5">
                  {t.points?.map((p, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {p}
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
