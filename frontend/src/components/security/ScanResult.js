import {
  AlertTriangle, ShieldCheck, ShieldAlert, CircleHelp, ScanSearch,
  Loader2, Check, ChevronDown, ChartNoAxesColumnIncreasing, Tag, AlertCircle, FileText, Lightbulb, ArrowLeft, RotateCw, Flag, Link2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authLink } from "../../lib/journey";
import { readDraft, selectResult, writeDraft } from "../../lib/scanDraft";

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
  if (!text) return "SafeNet completed the analysis. Review the returned indicators and next steps below.";
  const match = String(text).trim().match(/^.*?[.!?](?:\s|$)/);
  return match?.[0]?.trim() || String(text).trim();
}

function StatusCard({ result, score, kind }) {
  const cfg = risks[result?.risk_level] || risks.unknown;
  return (
    <div className={`result-verdict verdict-${result?.risk_level || "unknown"} border ${cfg.style}`} data-testid={`${kind}-verdict`}>
      <span className="result-verdict-icon"><cfg.icon className="w-7 h-7" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="result-kicker opacity-80">SafeNet assessment</p>
        <h3 className="text-xl font-semibold mt-0.5">{cfg.label}</h3>
        <p className="text-sm mt-1 opacity-90">{summaryOf(result.explanation)}</p>
      </div>
      {score !== null && <div className="result-score-ring" aria-label={`AI risk score: ${score} out of 100`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="score-ring-track" cx="50" cy="50" r="43" /><circle className="score-ring-value" cx="50" cy="50" r="43" strokeDasharray={`${score * 2.702} 270.2`} /></svg><p className="result-verdict-score tabular-nums" data-testid={`${kind}-risk-score`}>{score}<span> / 100</span><small>Risk score</small></p></div>}
    </div>
  );
}

function RiskMeter({ score, kind }) {
  const category = riskCategory(score);
  if (!category) return null;
  return (
    <section className="result-section risk-meter-card" aria-labelledby={`${kind}-risk-heading`}>
      <p className="result-kicker" id={`${kind}-risk-heading`}>AI risk score</p>
      <p className={`text-lg font-semibold mt-1 ${category.color}`} data-testid={`${kind}-risk-category`}>{category.label}</p>
      <div className="risk-meter-wrap mt-3">
        <div className="risk-meter" role="meter" aria-label={`Risk score ${score} out of 100: ${category.label}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={score}>
          <span className="risk-segment risk-safe" /><span className="risk-segment risk-minimal" /><span className="risk-segment risk-high" />
          <span className="risk-marker" style={{ left: `${score}%` }} data-testid={`${kind}-risk-marker`} aria-hidden="true" />
        </div>
        <div className="risk-band-grid" aria-hidden="true">
          <div className="risk-band safe"><strong>0 – 30</strong><span>Safe</span><small>Generally safe to use</small></div>
          <div className="risk-band minimal"><strong>31 – 60</strong><span>Minimal risk</span><small>Use caution</small></div>
          <div className="risk-band high"><strong>61 – 100</strong><span>High risk</span><small>Potentially dangerous</small></div>
        </div>
      </div>
    </section>
  );
}

function SecuritySignals({ result, kind }) {
  const metadata = [
    result?.content_type && { label: "Content type", value: result.content_type, tone: "neutral" },
    result?.scam_type && { label: "Classification", value: result.scam_type, tone: "neutral" },
  ].filter(Boolean);
  const flags = Array.isArray(result?.red_flags) ? result.red_flags : [];
  const rows = [
    ...metadata,
    ...flags.map((flag) => {
      const clear = /^(none|none detected|no (risk|red flag|signal)s? detected)$/i.test(String(flag).trim());
      return { label: flag, value: clear ? "Clear" : "Detected", tone: clear ? "safe" : "risk" };
    }),
  ];
  return (
    <section className="result-section security-signals-card" aria-labelledby={`${kind}-signals-heading`}>
      <h4 className="result-section-title" id={`${kind}-signals-heading`}><ChartNoAxesColumnIncreasing className="w-5 h-5 text-primary" aria-hidden="true" />Security signals</h4>
      {rows.length > 0 ? <ul className="signal-list">{rows.map((row, i) => (
        <li className="signal-row" key={`${row.label}-${i}`}><span className="signal-icon"><Tag className="w-4 h-4" aria-hidden="true" /></span><span className="signal-label">{row.label}</span><span className={`signal-value ${row.tone}`}>{row.value}</span></li>
      ))}</ul> : <p className="text-sm text-muted-foreground mt-4">No security signals were returned for this analysis.</p>}
    </section>
  );
}

function Recommendations({ advice, kind }) {
  if (!Array.isArray(advice) || advice.length === 0) return null;
  return (
    <section className="result-section recommendations-card" aria-labelledby={`${kind}-recommendations-heading`}>
      <h4 className="result-section-title" id={`${kind}-recommendations-heading`}><ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />What to do next</h4>
      <ul className="result-list mt-3">{advice.map((item, i) => <li key={i} className="result-row"><span className="result-row-icon action"><ShieldCheck className="w-4 h-4" aria-hidden="true" /></span><span>{item}</span></li>)}</ul>
    </section>
  );
}

function Details({ result }) {
  return result.explanation ? <details className="result-details"><summary><span>Analysis details</span><ChevronDown className="w-4 h-4" aria-hidden="true" /></summary><p className="text-sm leading-relaxed text-muted-foreground pt-3">{result.explanation}</p></details> : null;
}

function LoadingState() {
  return <div className="py-8 flex flex-col items-center text-center gap-3" role="status"><Loader2 className="w-7 h-7 animate-spin text-primary" /><p className="font-medium">Analyzing with AI…</p><p className="text-sm text-muted-foreground">Checking for risk indicators. Your result will appear here.</p></div>;
}

function EmptyState() {
  return <div className="empty-result"><div className="empty-result-heading"><span><ScanSearch aria-hidden="true" /></span><div><h3 className="font-semibold">Understand the risk before you act</h3><p className="text-sm text-muted-foreground leading-relaxed">Your analysis will show a risk level, the reasons behind it, and practical next steps.</p></div></div><div className="empty-result-grid"><div><span className="rose"><AlertCircle /></span><p><strong>Risk level</strong><small>Safe, Suspicious or Dangerous</small></p></div><div><span className="blue"><FileText /></span><p><strong>Reasons</strong><small>Why it might be a scam</small></p></div><div><span className="green"><Lightbulb /></span><p><strong>Guidance</strong><small>What you should do next</small></p></div></div></div>;
}

function Disclaimer() {
  return <p className="result-disclaimer"><Check className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />AI analysis can miss threats. A low score is not a guarantee of safety.</p>;
}

function DecodedContent({ value }) {
  return value ? <div className="decoded-content"><p className="text-xs font-semibold mb-1">Decoded QR content</p><p className="text-sm font-mono break-all" data-testid="qr-decoded-content">{value}</p><p className="text-xs text-muted-foreground mt-2">Decoded locally. Links are never opened automatically.</p></div> : null;
}

export function ScanResult({ result, loading, kind = "url", decoded, inputPanel, standalone = false, target, onRescan, savedFor }) {
  const { user } = useAuth();
  const score = Number.isFinite(result?.risk_score) ? Math.max(0, Math.min(100, result.risk_score)) : null;
  const decodedValue = decoded || result?.decoded;
  const returnTo = `/ai?tab=${kind}`;
  const reportContext = () => {
    const current = readDraft("report");
    const source = `${kind}:${(target || decodedValue || "").slice(0, 6000)}`;
    // A new result supplies only editable evidence, never an accusation/category.
    const form = current?.source === source ? current.form : { ...(kind === "url" || /^https?:\/\//i.test(decodedValue || "") ? { scammer_url: (target || decodedValue || "").slice(0, 2000) } : {}), ...(kind === "detect" ? { description: (target || "").slice(0, 5000) } : {}) };
    writeDraft("report", { form, returnTo, source });
  };

  if (standalone) return <div className={`standalone-analysis ${result ? "has-result" : ""}`} data-testid={`${kind}-result-panel`} aria-live="polite" aria-busy={loading}>
    {!result && inputPanel}
    {loading ? <div className="scan-result result-state-card"><LoadingState /></div> : result ? <div className="result-page-card">
      <div className="result-toolbar">{onRescan && <button type="button" onClick={onRescan}><ArrowLeft size={15} aria-hidden="true" /> Back to scanner</button>}<div><a href="/report" onClick={reportContext}><Flag size={14} aria-hidden="true" /> Report a concern</a></div></div>
      <StatusCard result={result} score={score} kind={kind} />
      {kind === "qr" && <DecodedContent value={decodedValue} />}
      {target && <div className="result-target"><Link2 size={17} aria-hidden="true" /><span>{kind === "url" ? "Scanned URL" : "Analyzed content"}</span><p>{kind === "detect" && target.length > 400 ? `${target.slice(0, 400)}…` : target}</p></div>}
      {kind === "detect" && target?.length > 400 && <details className="result-details"><summary>View the full message</summary><p className="text-sm whitespace-pre-wrap break-words">{target}</p></details>}
      <div className="result-evidence-grid"><div><SecuritySignals result={result} kind={kind} /></div><div><Recommendations advice={result.advice} kind={kind} /><Details result={result} /></div></div>
      {["dangerous", "malicious"].includes(result.risk_level) && <aside className="result-protect"><ShieldAlert size={22} aria-hidden="true" /><div><strong>Pause before taking action.</strong><p>Do not share passwords or codes. If you already sent money or shared details, contact your bank and review the emergency steps.</p><a href="/report#emergency-help" onClick={reportContext}>Get protective steps and reporting help <ArrowLeft size={14} aria-hidden="true" /></a></div></aside>}
      <div className="result-save-state" data-testid="result-save-state">{kind === "url" ? <p>URL assessments are not stored in account history. This result can be restored in this tab for 15 minutes.</p> : savedFor === "unconfirmed" ? <p>Account saving could not be confirmed for this check. Your assessment is still valid. If you are signed in, review your activity before running another check.</p> : savedFor && savedFor === user?.id ? <p><Check size={16} aria-hidden="true" /> Saved automatically when analyzed while signed in. <a href="/dashboard?view=history">View activity</a></p> : <><p>This check is not saved to an account. Signing in does not save or repeat this assessment. Future signed-in message and QR checks save automatically.</p>{!user && <a href={authLink("login", returnTo)} onClick={() => selectResult(kind)}>Sign in for future history</a>}</>}</div>
      {onRescan && <button type="button" className="premium-button result-next-check" onClick={onRescan}><RotateCw size={15} aria-hidden="true" />Check another {kind === "url" ? "link" : kind === "qr" ? "QR code" : "message"}</button>}
      {kind !== "qr" && <DecodedContent value={decodedValue} />}<Disclaimer />
    </div> : null}
  </div>;

  if (inputPanel) {
    return (
      <div id="url-check" className={`analysis-dashboard ${result ? "has-result" : ""}`} data-testid={`${kind}-result-panel`} aria-live="polite" aria-busy={loading}>
        <div className="analysis-column analysis-input-column">{inputPanel}{result && <SecuritySignals result={result} kind={kind} />}</div>
        <div className="analysis-column analysis-result-column">
          {loading ? <div className="scan-result result-state-card"><LoadingState /></div> : result ? <><StatusCard result={result} score={score} kind={kind} /><RiskMeter score={score} kind={kind} /><Recommendations advice={result.advice} kind={kind} /><Details result={result} /><Disclaimer /><DecodedContent value={decodedValue} /></> : <div className="scan-result result-state-card"><EmptyState /></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="scan-result rounded-xl border bg-card p-5 sm:p-6 min-w-0" data-testid={`${kind}-result-panel`} aria-live="polite" aria-busy={loading}>
      {loading ? <LoadingState /> : result ? <div className="space-y-4 break-words"><StatusCard result={result} score={score} kind={kind} /><RiskMeter score={score} kind={kind} /><SecuritySignals result={result} kind={kind} /><Recommendations advice={result.advice} kind={kind} /><Details result={result} /><Disclaimer /></div> : <EmptyState />}
      <DecodedContent value={decodedValue} />
    </div>
  );
}
