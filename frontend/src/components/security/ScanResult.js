import { AlertTriangle, ShieldCheck, ShieldAlert, CircleHelp, ScanSearch, Loader2 } from "lucide-react";

const risks = {
  safe: { icon: ShieldCheck, label: "Looks safe", style: "text-emerald-800 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950" },
  suspicious: { icon: AlertTriangle, label: "Suspicious", style: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950" },
  dangerous: { icon: ShieldAlert, label: "High risk", style: "text-red-800 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950" },
  malicious: { icon: ShieldAlert, label: "Malicious", style: "text-red-800 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950" },
  unknown: { icon: CircleHelp, label: "Unable to verify", style: "text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-900" },
};

export function ScanResult({ result, loading, kind = "url", decoded }) {
  const cfg = risks[result?.risk_level] || risks.unknown;
  const score = Number.isFinite(result?.risk_score) ? Math.max(0, Math.min(100, result.risk_score)) : null;
  return (
    <div className="scan-result rounded-xl border bg-card p-5 sm:p-6 min-w-0" data-testid={`${kind}-result-panel`} aria-live="polite" aria-busy={loading}>
      {loading ? (
        <div className="py-8 flex flex-col items-center text-center gap-3" role="status">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="font-medium">Analyzing with AI…</p>
          <p className="text-sm text-muted-foreground">Checking for risk indicators. Your result will appear here.</p>
        </div>
      ) : result ? (
        <div className="space-y-4 break-words">
          <div className={`rounded-lg border p-4 ${cfg.style}`} data-testid={`${kind}-verdict`}>
            <div className="flex items-center gap-3">
              <cfg.icon className="w-6 h-6 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1"><h3 className="text-lg font-semibold">{cfg.label}</h3><p className="text-xs">{result.content_type || result.scam_type}</p></div>
              {score !== null && <span className="font-semibold text-xl shrink-0" data-testid={`${kind}-risk-score`}>{score}<span className="text-xs font-normal"> / 100</span></span>}
            </div>
            {score !== null && <p className="text-xs mt-2">AI risk score · higher means more risk</p>}
          </div>
          {result.explanation && <p className="text-sm leading-relaxed">{result.explanation}</p>}
          {[["Red flags detected", result.red_flags, AlertTriangle], ["What to do next", result.advice, ShieldCheck]].map(([title, items, Icon]) => Array.isArray(items) && items.length > 0 && (
            <div key={title}><h4 className="text-sm font-semibold mb-2">{title}</h4><ul className="space-y-2">{items.map((item, i) => <li key={i} className="flex gap-2 text-sm"><Icon className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" /><span>{item}</span></li>)}</ul></div>
          ))}
          <p className="text-xs text-muted-foreground border-t pt-3">AI analysis can miss threats. A low score is not a guarantee of safety.</p>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <ScanSearch className="w-7 h-7 text-primary" strokeWidth={1.5} />
          <h3 className="font-semibold">Understand the risk before you act</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">Your analysis will show a risk level, the reasons behind it, and practical next steps.</p>
          <p className="text-xs text-muted-foreground">Nothing has been checked yet.</p>
        </div>
      )}
      {(decoded || result?.decoded) && <div className="mt-4 border-t pt-3"><p className="text-xs font-semibold mb-1">Decoded QR content</p><p className="text-sm font-mono break-all" data-testid="qr-decoded-content">{decoded || result.decoded}</p><p className="text-xs text-muted-foreground mt-2">Decoded locally. Links are never opened automatically.</p></div>}
    </div>
  );
}
