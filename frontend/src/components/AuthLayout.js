import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";

export function AuthLayout({ children, testId, returnTo = "/" }) {
  return (
    <div className="auth-shell" data-testid={testId}>
      <aside className="auth-story" aria-label="About SafeNet">
        <Link to="/" className="auth-brand"><ShieldCheck size={27} strokeWidth={1.8} aria-hidden="true" /><span>Safe<span>Net</span></span></Link>
        <div className="auth-story-content">
          <p className="auth-eyebrow">A CALMER WAY TO DECIDE</p>
          <h2>Keep safer habits <em>in one</em> place.</h2>
          <p>Review signed-in message and QR activity, continue your conversations and build your personal safety plan.</p>
          <div className="auth-case" aria-label="Illustrative scam check example">
            <div className="auth-case-top"><span>ILLUSTRATIVE CASE</span><span>MESSAGE CHECK · 01</span></div>
            <p className="auth-case-message">“Your bank account will be locked today. Verify your details immediately.”</p>
            <div className="auth-case-bottom"><span><LockKeyhole size={17} aria-hidden="true" /> Pause and verify</span><small>Urgency + request for details are warning signs</small></div>
          </div>
        </div>
        <div className="auth-story-footer"><span>01 / Check</span><span>02 / Understand</span><span>03 / Act</span></div>
      </aside>
      <div className="auth-form-panel">
        <div className="auth-form-frame">
          <Link to={returnTo} className="auth-back"><ArrowLeft size={16} aria-hidden="true" /> {returnTo.startsWith("/ai") ? "Back to your check" : "Back to SafeNet"}</Link>
          <div className="auth-mobile-brand"><ShieldCheck size={27} aria-hidden="true" /><span>Safe<span>Net</span></span></div>
          <div className="auth-form-content">{children}</div>
          <div className="auth-form-footer"><span>Check with confidence. Act with clarity.</span><Link to="/scams">Explore scam types <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        </div>
      </div>
    </div>
  );
}
