import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Loader2, RotateCw, ShieldCheck } from "lucide-react";
import { api, formatApiErrorDetail } from "../lib/api";

const steps = [
  { id: "verify_sender", title: "Verify before you respond", detail: "Contact the organization through a number or website you found yourself.", to: "/scams", action: "See warning signs" },
  { id: "strong_passwords", title: "Use a unique password", detail: "Protect important accounts with a long, unique password and a password manager.", to: "/tips", action: "Read safety tips" },
  { id: "mfa", title: "Turn on extra sign-in protection", detail: "Enable multi-factor authentication on email, banking and social accounts.", to: "/tips", action: "See how" },
  { id: "updates", title: "Keep devices up to date", detail: "Install security updates on your phone, browser and computer.", to: "/tips", action: "Read safety tips" },
];

export function SafetyPlan() {
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/user/safety-plan")
      .then(({ data }) => { if (active) setPlan(data); })
      .catch(() => { if (active) setError("Your safety plan could not load. Try again."); });
    return () => { active = false; };
  }, []);

  const retry = async () => {
    setError("");
    setBusy("retry");
    try { setPlan((await api.get("/user/safety-plan")).data); }
    catch { setError("Your safety plan could not load. Try again."); }
    finally { setBusy(""); }
  };

  const toggle = async (id) => {
    if (!plan || busy) return;
    setError("");
    setBusy(id);
    try {
      const { data } = await api.patch("/user/safety-plan", { step: id, completed: !plan.steps[id] });
      setPlan(data);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setBusy(""); }
  };

  const completed = plan?.completed_count || 0;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <section className="safety-plan" aria-labelledby="safety-plan-title" data-testid="safety-plan">
      <div className="safety-plan-heading">
        <div>
          <p className="safety-plan-kicker"><ShieldCheck size={15} aria-hidden="true" /> PRIVATE SAFETY WORKSPACE</p>
          <h2 id="safety-plan-title">Your next safer move</h2>
          <p>Make a few practical changes at your own pace. Your checklist is saved to your account.</p>
        </div>
        <div className="safety-plan-progress" aria-label={`${completed} of ${steps.length} steps complete`}>
          <strong>{completed}<span> / {steps.length}</span></strong>
          <small>steps complete</small>
        </div>
      </div>
      <div className="safety-plan-track" role="progressbar" aria-label="Safety plan progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={steps.length}>
        <span style={{ width: `${progress}%` }} />
      </div>
      {error && <div className="safety-plan-error" role="alert">{error}{!plan && <button type="button" onClick={retry} disabled={!!busy}><RotateCw size={14} /> Retry</button>}</div>}
      <div className="safety-plan-list">
        {steps.map((step, index) => {
          const checked = Boolean(plan?.steps[step.id]);
          return (
            <div className={`safety-plan-step ${checked ? "is-done" : ""}`} key={step.id}>
              <button type="button" className="safety-plan-check" disabled={!plan || !!busy} onClick={() => toggle(step.id)} aria-label={`${checked ? "Mark incomplete" : "Mark complete"}: ${step.title}`} aria-pressed={checked} data-testid={`safety-step-${step.id}`}>
                {busy === step.id ? <Loader2 size={16} className="animate-spin" /> : checked ? <Check size={17} /> : <span>{String(index + 1).padStart(2, "0")}</span>}
              </button>
              <div className="safety-plan-step-copy"><h3>{step.title}</h3><p>{step.detail}</p></div>
              <Link to={step.to} className="safety-plan-step-link">{step.action} <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
          );
        })}
      </div>
      <p className="safety-plan-footnote">A completed checklist is a record of your actions, not a security guarantee.</p>
    </section>
  );
}
