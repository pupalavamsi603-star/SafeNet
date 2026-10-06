import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Link2, QrCode, FileText, Bot } from "lucide-react";
import { validateURL } from "../lib/urlValidation";

const features = [
  { id: "url", icon: Link2, title: "URL Scanner", description: "Check a website or link for suspicious patterns before you visit.", action: "Scan URL" },
  { id: "qr", icon: QrCode, title: "QR Scanner", description: "Reveal what a QR code contains and check for hidden risks.", action: "Scan QR Code" },
  { id: "detect", icon: FileText, title: "Text / Message Scanner", description: "Analyze messages and emails for phishing and scam signals.", action: "Scan Text" },
  { id: "chat", icon: Bot, title: "Ask AI", description: "Get practical answers about online safety and cybersecurity.", action: "Ask Now" },
];

export function FeatureCards() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const startURL = (event) => {
    event.preventDefault();
    const invalid = url.trim() ? validateURL(url) : "";
    setError(invalid);
    if (!invalid) navigate(`/ai?tab=url${url.trim() ? `&url=${encodeURIComponent(url.trim())}` : ""}`);
  };
  return <div className="home-feature-grid">{features.map(({ id, icon: Icon, title, description, action }) => <article key={id} className={`home-feature-card feature-${id}`}>
    <span className="feature-icon"><Icon size={25} strokeWidth={1.8} aria-hidden="true" /></span>
    <h3>{title}</h3><p>{description}</p>
    {id === "url" ? <form onSubmit={startURL} noValidate><label className="sr-only" htmlFor="home-url">Website or URL</label><input id="home-url" aria-invalid={!!error} aria-describedby={error ? "home-url-error" : undefined} value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="Enter a URL to check…" autoComplete="off" inputMode="url" maxLength={2000} /><button type="submit" data-testid="home-url-cta">{action}<ArrowRight size={15} aria-hidden="true" /></button>{error && <p id="home-url-error" role="alert" className="feature-error">{error}</p>}</form> : <Link to={`/ai?tab=${id}`} className="feature-action" data-testid={`home-${id}-cta`}>{action}<ArrowRight size={15} aria-hidden="true" /></Link>}
  </article>)}</div>;
}
