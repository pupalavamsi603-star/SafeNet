import { useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { ChatTab } from "./security/AnalysisTools";

export const OPEN_ASSISTANT_EVENT = "safenet:open-assistant";

export function FloatingSafeNetAI() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const hidden = pathname.startsWith("/qr/phone/") || ["/login", "/register"].includes(pathname);
  const show = () => { setMounted(true); setOpen(true); };
  const close = () => { setOpen(false); requestAnimationFrame(() => buttonRef.current?.focus()); };

  useEffect(() => {
    const onOpen = () => show();
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);
  useEffect(() => {
    if (pathname === "/ai" && (!params.get("tab") || params.get("tab") === "chat")) show();
  }, [pathname, params]);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  if (hidden) return null;

  return (
    <div className="floating-ai-root">
      {mounted && (
        <section ref={panelRef} tabIndex={-1} className={`floating-ai-panel ${open ? "is-open" : ""}`} aria-label="SafeNet AI assistant" aria-hidden={!open} data-testid="floating-ai-panel">
          <header className="floating-ai-header">
            <div className="flex items-center gap-3 min-w-0"><span className="floating-ai-brand"><ShieldCheck className="w-5 h-5" aria-hidden="true" /></span><div className="min-w-0"><h2 className="font-semibold leading-tight">SafeNet AI</h2><p className="text-xs text-emerald-700 flex items-center gap-1.5"><span className="online-dot" />Online · Ready</p></div></div>
            <button className="floating-ai-close" onClick={close} aria-label="Minimize SafeNet AI"><ChevronDown className="w-5 h-5" /></button>
          </header>
          <div className="floating-ai-body"><ChatTab compact resumeSession={params.get("session") || ""} /></div>
        </section>
      )}
      <button ref={buttonRef} type="button" className={`floating-ai-button ${open ? "is-hidden" : ""}`} onClick={show} aria-label="Open SafeNet AI assistant" aria-expanded={open} data-testid="floating-ai-button">
        <span className="floating-ai-button-icon"><Bot className="w-5 h-5" aria-hidden="true" /><span className="online-dot button-dot" /></span>
        <span><strong>Ask SafeNet AI</strong><small>Online safety help</small></span><Sparkles className="w-4 h-4 opacity-70" aria-hidden="true" />
      </button>
    </div>
  );
}
