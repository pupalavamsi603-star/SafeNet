import { useSearchParams } from "react-router-dom";
import { SecurityWorkspace } from "../components/security/SecurityWorkspace";
import { Link2, QrCode, FileText, Bot, ShieldCheck, ScanSearch, Lightbulb, LockKeyhole } from "lucide-react";

const tools = {
  url: { title: "URL Scanner", description: "Check a website or link for suspicious patterns before you visit.", icon: Link2 },
  qr: { title: "QR Scanner", description: "Decode a QR code and check its content before opening a link or making a payment.", icon: QrCode },
  detect: { title: "Text / Message Scanner", description: "Analyze messages, emails and text for phishing tactics and scam signals.", icon: FileText },
  chat: { title: "Ask AI", description: "Your space for practical answers about online safety and cybersecurity.", icon: Bot },
};

export default function AIChat() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = ["url", "qr", "detect", "chat"].includes(requested) ? requested : params.has("session") ? "chat" : "url";
  const tool = tools[tab];
  const Icon = tool.icon;
  const select = (value) => { const next = new URLSearchParams(params); next.set("tab", value); setParams(next, { replace: true }); };
  return (
    <div className={`scanner-page scanner-${tab}`} data-testid="ai-page">
      <div className="scanner-heading"><span className="scanner-heading-icon"><Icon size={27} strokeWidth={1.8} aria-hidden="true" /></span><div><h1>{tool.title}</h1><p>{tool.description}</p></div>{tab === "url" && <Link2 className="scanner-decoration" aria-hidden="true" />}</div>
      <SecurityWorkspace value={tab} onValueChange={select} presentation="page" initialURL={params.get("url") || ""} resumeSession={params.get("session") || ""} />
      {tab !== "chat" && <><div className="scanner-benefits">{[[ScanSearch, "AI-assisted analysis"], [ShieldCheck, "Risk indicators"], [Lightbulb, "Practical guidance"]].map(([Benefit, label]) => <div key={label}><Benefit size={22} aria-hidden="true" /><span>{label}</span></div>)}</div><div className="scanner-privacy"><LockKeyhole size={23} aria-hidden="true" /><div><strong>Check with care. Your data matters.</strong><p>Never submit passwords, OTPs or card details. AI analysis can miss threats; review the guidance before acting.</p></div></div></>}
    </div>
  );
}
