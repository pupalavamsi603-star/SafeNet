import { AlertTriangle, ShieldCheck, ShieldAlert, CircleHelp, ScanSearch, Loader2, Check, ChevronDown } from "lucide-react";

const risks = {
  safe: { icon: ShieldCheck, label: "Looks safe", style: "text-emerald-800 bg-emerald-50 border-emerald-200" },
  suspicious: { icon: AlertTriangle, label: "Suspicious", style: "text-amber-800 bg-amber-50 border-amber-200" },
  dangerous: { icon: ShieldAlert, label: "High risk", style: "text-red-800 bg-red-50 border-red-200" },
  malicious: { icon: ShieldAlert, label: "Malicious", style: "text-red-800 bg-red-50 border-red-200" },
  unknown: { icon: CircleHelp, label: "Unable to verify", style: "text-slate-700 bg-slate-100 border-slate-200" },
};

export function riskCategory(score) {
  if (!Number.isFinite(score)) return null;
  if (score <= 30) return { label: "Safe", color: "text-emerald-700" };
  if (score <= 60) return { label: "Minimal risk", color: "text-amber-700" };
  return { label: "High risk", color: "text-red-700" };
}

function summaryOf(text) {
  if (!text) return "SafeNet completed the analysis. Review the verified signals and next steps below.";
  const match = String(text).trim().match(/^.*?[.!?](?:\s|$)/);
  return match?.[0]?.trim() || String(text).trim();
}

function RiskMeter({ score, kind }) {
  const category = riskCategory(score);
  if (!category) return null;
  return (
    <section className="result-section" aria-labelledby={`${kind}-risk-heading`}>
      <div className="flex items-end justify-between gap-4">
        <div><p className="result-kicker" id={`${kind}-risk-heading`}>AI risk score</p><p className={`text-sm font-semibold mt-1 ${category.color}`} data-testid={`${kind}-risk-category`}>{category.label}</p></div>
        <p className="text-3xl font-semibold tabular-nums" data-testid={`${kind}-risk-score`}>{score}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p>
      </div>
      <div className="risk-meter-wrap mt-5">
        <div className="risk-meter" role="meter" aria-label={`Risk score ${score} out of 100: ${category.label}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={score}>
          <span className="risk-segment risk-safe" /><span className="risk-segment risk-minimal" /><span className="risk-segment risk-high" />
          <span className="risk-marker" style={{ left: `${score}%` }} data-testid={`${kind}-risk-marker`} aria-hidden="true" />
        </div>
        <div className="risk-labels" aria-hidden="true"><span>Safe</span><span>Minimal risk</span><span>High risk</span></div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Higher scores indicate more risk. Boundaries: 0–30, 31–60, and 61–100.</p>
    </section>
  );
}

function SignalRow({ children, tone = "risk" }) {
  const Icon = tone === "risk" ? AlertTriangle : ShieldCheck;
  return <li className="result-row"><span className={`result-row-icon ${tone}`}><Icon className="w-4 h-4" aria-hidden="true" /></span><span>{children}</span></li>;
}

export function ScanResult({ result, loading, kind = "url", decoded }) {
  const cfg = risks[result?.risk_level] || risks.unknown;
  const score = Number.isFinite(result?.risk_score) ? Math.max(0, Math.min(100, result.risk_score)) : null;
  const metadata = [result?.content_type, result?.scam_type].filter(Boolean);
  return (
    <div className="scan-result rounded-xl border bg-card p-5 sm:p-6 min-w-0" data-testid={`${kind}-result-panel`} aria-live="polite" aria-busy={loading}>
      {loading ? (
        <div className="py-8 flex flex-col items-center text-center gap-3" role="status"><Loader2 className="w-7 h-7 animate-spin text-primary" /><p className="font-medium">Analyzing with AI…</p><p className="text-sm text-muted-foreground">Checking for risk indicators. Your result will appear here.</p></div>
      ) : result ? (
        <div className="space-y-5 break-words">
          <div className={`result-verdict border ${cfg.style}`} data-testid={`${kind}-verdict`}>
            <span className="result-verdict-icon"><cfg.icon className="w-6 h-6" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><p className="result-kicker opacity-80">SafeNet assessment</p><h3 className="text-xl font-semibold mt-0.5">{cfg.label}</h3><p className="text-sm mt-1 opacity-90">{summaryOf(result.explanation)}</p></div>
          </div>
          <RiskMeter score={score} kind={kind} />
          {(metadata.length > 0 || result.red_flags?.length > 0) && (
            <section className="result-section" aria-labelledby={`${kind}-signals-heading`}>
              <h4 className="result-section-title" id={`${kind}-signals-heading`}>Security signals</h4>
              {metadata.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{metadata.map((item) => <span key={item} className="result-chip">{item}</span>)}</div>}
              {Array.isArray(result.red_flags) && result.red_flags.length > 0 && <ul className="result-list mt-3">{result.red_flags.map((item, i) => <SignalRow key={i}>{item}</SignalRow>)}</ul>}
            </section>
          )}
          {Array.isArray(result.advice) && result.advice.length > 0 && <section className="result-section" aria-labelledby={`${kind}-recommendations-heading`}><h4 className="result-section-title" id={`${kind}-recommendations-heading`}>Recommended actions</h4><ul className="result-list mt-3">{result.advice.map((item, i) => <SignalRow key={i} tone="action">{item}</SignalRow>)}</ul></section>}
          {result.explanation && <details className="result-details"><summary><span>Analysis details</span><ChevronDown className="w-4 h-4" aria-hidden="true" /></summary><p className="text-sm leading-relaxed text-muted-foreground pt-3">{result.explanation}</p></details>}
          <p className="text-xs text-muted-foreground border-t pt-3 flex gap-2"><Check className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />AI analysis can miss threats. A low score is not a guarantee of safety.</p>
        </div>
      ) : (
        <div className="space-y-3 py-2"><ScanSearch className="w-7 h-7 text-primary" strokeWidth={1.5} /><h3 className="font-semibold">Understand the risk before you act</h3><p className="text-sm text-muted-foreground leading-relaxed">Your analysis will show a risk level, the reasons behind it, and practical next steps.</p><p className="text-xs text-muted-foreground">Nothing has been checked yet.</p></div>
      )}
      {(decoded || result?.decoded) && <div className="mt-4 border-t pt-3"><p className="text-xs font-semibold mb-1">Decoded QR content</p><p className="text-sm font-mono break-all" data-testid="qr-decoded-content">{decoded || result.decoded}</p><p className="text-xs text-muted-foreground mt-2">Decoded locally. Links are never opened automatically.</p></div>}
    </div>
  );
}
