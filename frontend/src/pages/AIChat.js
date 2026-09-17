import { useSearchParams } from "react-router-dom";
import { SecurityWorkspace } from "../components/security/SecurityWorkspace";

export default function AIChat() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = ["url", "qr", "detect", "chat"].includes(requested) ? requested : "chat";
  const select = (value) => { const next = new URLSearchParams(params); next.set("tab", value); setParams(next, { replace: true }); };
  return (
    <div className="home-container py-8 sm:py-12" data-testid="ai-page">
      <p className="eyebrow">SafeNet security tools</p>
      <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-3">AI Assistant & Scam Detector</h1>
      <p className="text-muted-foreground text-sm mt-3 mb-7 max-w-2xl">Check links, QR codes and messages, or talk to SafeBot about phishing, account security and online safety.</p>
      <SecurityWorkspace value={tab} onValueChange={select} resumeSession={params.get("session") || ""} />
    </div>
  );
}
