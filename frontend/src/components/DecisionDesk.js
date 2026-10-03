import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Link2, MessageSquareWarning, QrCode, ShieldAlert } from "lucide-react";

const situations = [
  { id: "link", icon: Link2, title: "I received a link", detail: "Email, DM or shopping page", action: "Check the address before opening it.", tool: "url" },
  { id: "qr", icon: QrCode, title: "Someone sent a QR", detail: "Payment, poster or parcel", action: "Preview what the code contains before continuing.", tool: "qr" },
  { id: "message", icon: MessageSquareWarning, title: "A message feels urgent", detail: "OTP, job offer or bank warning", action: "Check its language and request before replying.", tool: "detect" },
  { id: "acted", icon: ShieldAlert, title: "I already shared details", detail: "Or sent money", action: "Act now: contact your bank through its official channel, secure affected accounts and report the incident.", tool: null },
];

export function DecisionDesk({ onChooseTool }) {
  const [selected, setSelected] = useState(null);
  const openTool = () => {
    onChooseTool(selected.tool);
    document.getElementById("tools-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="decision-desk" aria-labelledby="decision-title" data-reveal>
      <div className="home-container decision-desk-inner">
        <div className="decision-desk-intro">
          <p className="decision-kicker">IN THE MOMENT</p>
          <h2 id="decision-title">Not sure what to do next?</h2>
          <p>Start with what happened. SafeNet takes you to the right check or response.</p>
        </div>
        <div className="decision-options">
          {situations.map((item) => {
            const Icon = item.icon;
            return (
              <button className={`decision-option ${selected?.id === item.id ? "is-selected" : ""}`} key={item.id} type="button" onClick={() => setSelected(item)} aria-pressed={selected?.id === item.id} data-testid={`decision-${item.id}`}>
                <span className="decision-option-icon"><Icon size={19} aria-hidden="true" /></span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        {selected && <div className="decision-answer" role="status" data-testid="decision-answer">
          <div><span>YOUR NEXT STEP</span><p>{selected.action}</p></div>
          {selected.tool ? <button type="button" onClick={openTool}>Open {selected.tool === "url" ? "URL check" : selected.tool === "qr" ? "QR scanner" : "message scanner"} <ArrowRight size={16} aria-hidden="true" /></button> : <Link to="/report">Report to SafeNet <ArrowRight size={16} aria-hidden="true" /></Link>}
        </div>}
        <div className="decision-note" aria-live="polite">
          <ShieldAlert size={20} aria-hidden="true" />
          <p><strong>If you have already sent money or shared a code, time matters.</strong> Contact your bank first. In India, call <a href="tel:1930">1930</a> or use the <a href="https://www.cybercrime.gov.in/" target="_blank" rel="noreferrer">official cybercrime portal <ExternalLink size={12} aria-hidden="true" /></a>. Elsewhere, contact your local reporting authority.</p>
        </div>
      </div>
    </section>
  );
}
