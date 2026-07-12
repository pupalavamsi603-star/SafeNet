import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { getIcon } from "../lib/icons";
import { Badge } from "../components/ui/badge";

const severityStyle = {
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
  high: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};

export default function ScamTypes() {
  const [scams, setScams] = useState(null);

  useEffect(() => {
    api.get("/scam-types").then((r) => setScams(r.data)).catch(() => setScams([]));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20" data-testid="scam-types-page">
      <p className="text-xs uppercase tracking-[0.25em] text-red-500 mb-4">Know your enemy</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter">Online Scam Types</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Every scam follows a script. Learn the scripts, and you'll see the con coming from a mile away.
        Click any scam to see how it works, warning signs, and real cases.
      </p>

      {!scams ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
      ) : (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {scams.map((s, i) => {
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
                  className="group flex flex-col h-full rounded-xl border bg-card p-7 hover:border-red-500/40 transition-colors duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-red-500" strokeWidth={1.6} />
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${severityStyle[s.severity] || severityStyle.high}`}>
                      {s.severity}
                    </Badge>
                  </div>
                  <h3 className="font-heading text-base font-semibold mt-5 tracking-tight">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3 flex-1">{s.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-sky-500 mt-4 group-hover:gap-2.5 transition-[gap] duration-300">
                    Learn the tactics <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
