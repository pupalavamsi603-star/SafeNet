import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, BookOpenCheck, GraduationCap, Flag, Fingerprint, ScanSearch, ListChecks, LockKeyhole, Zap, Link2, QrCode, MessageSquareWarning, Sparkles } from "lucide-react";
import { SecurityWorkspace } from "../components/security/SecurityWorkspace";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

const faqs = [
  { q: "What should I do first if I've been scammed?", a: "Act fast. Call your bank immediately to freeze cards/accounts, change passwords for affected accounts, and report to your national cybercrime portal (call 1930 or cybercrime.gov.in in India, ic3.gov in the USA). Speed matters — banks can sometimes reverse transfers reported within hours." },
  { q: "How does the AI scam detector work?", a: "Paste any suspicious SMS, email, or WhatsApp message into our detector. The AI analyzes language patterns, urgency tactics, links, and known scam signatures, then gives you a risk score, the likely scam type, and specific next steps." },
  { q: "Is it ever safe to share an OTP?", a: "No. Never. Not with your bank, not with 'customer support', not with the police. OTPs authorize transactions — anyone asking for one is trying to move your money. Banks will never ask for OTPs, PINs, or passwords." },
  { q: "Is SafeNet free to use?", a: "Yes. All learning resources, the AI assistant, scam detector, quiz, and scam reporting are completely free. Our mission is making cyber safety knowledge accessible to everyone." },
  { q: "Can I report a scam anonymously?", a: "Yes. The report form works without an account, and contact details are optional. Your report helps us track scam trends and warn others." },
];


const resources = [
  { icon: Fingerprint, title: "Recognize the scam", text: "Learn the warning signs of phishing, OTP fraud, fake jobs and more.", to: "/scams", action: "Explore scam types" },
  { icon: BookOpenCheck, title: "Build safer habits", text: "Practical steps for protecting your accounts, payments and personal data.", to: "/tips", action: "Read safety tips" },
  { icon: GraduationCap, title: "Test your instincts", text: "Practice spotting scams with real-world scenarios in the cyber safety quiz.", to: "/quiz", action: "Take the quiz" },
];

export default function Home() {
  const [tool, setTool] = useState("url");
  useEffect(() => {
    const items = document.querySelectorAll(".safenet-home [data-reveal]");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return (
    <div data-testid="home-page" className="safenet-home">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-container hero-grid">
          <div className="hero-copy" data-reveal>
            <p className="eyebrow"><ShieldCheck className="w-4 h-4" /> AI-Powered Cybersecurity Platform</p>
            <h1 id="home-title">Check for scams <span>before you click.</span></h1>
            <p className="intro-copy">Suspicious link, QR code or message? Analyze it with SafeNet, or ask our AI assistant what to do next.</p>
            <div className="hero-trust-row" aria-label="SafeNet benefits">
              <div><span className="hero-trust-icon blue"><ShieldCheck /></span><p><strong>Stay Safe Online</strong><small>AI powered analysis</small></p></div>
              <div><span className="hero-trust-icon violet"><LockKeyhole /></span><p><strong>Your Privacy First</strong><small>No data is stored</small></p></div>
              <div><span className="hero-trust-icon amber"><Zap /></span><p><strong>Fast & Accurate</strong><small>Get clear guidance</small></p></div>
            </div>
          </div>
          <div className="hero-visual" data-reveal aria-hidden="true">
            <picture>
              <img src="/assets/safenet-hero-shield-960.webp" srcSet="/assets/safenet-hero-shield-640.webp 640w, /assets/safenet-hero-shield-960.webp 960w" sizes="(max-width: 767px) 330px, 470px" width="960" height="640" fetchPriority="high" decoding="async" alt="" />
            </picture>
            <div className="hero-orbit-card link"><span><Link2 /></span><p><strong>Web Links</strong><small>Scan for threats</small></p></div>
            <div className="hero-orbit-card qr"><span><QrCode /></span><p><strong>QR Codes</strong><small>Detect hidden risks</small></p></div>
            <div className="hero-orbit-card message"><span><MessageSquareWarning /></span><p><strong>Messages</strong><small>Spot scam signals</small></p></div>
            <div className="hero-orbit-card assistant"><span><Sparkles /></span><p><strong>AI Assistant</strong><small>Get instant guidance</small></p></div>
          </div>
        </div>
      </section>
      <section className="home-container security-section" aria-labelledby="tools-title" data-reveal>
        <div className="section-heading"><h2 id="tools-title">What would you like to check?</h2><span className="tools-tagline hidden sm:flex"><i />Four powerful tools. One safer internet.</span></div>
        <SecurityWorkspace value={tool} onValueChange={setTool} />
        <p className="workspace-note"><ShieldCheck className="w-4 h-4 shrink-0" /> AI guidance to help you decide. Never submit passwords, OTPs or card details.</p>
      </section>
      <section className="how-section" aria-label="How SafeNet helps" data-reveal>
        <div className="home-container how-grid">
          {[[ScanSearch, "Check before you click", "Analyze a link, QR code or message."], [ListChecks, "Understand the signals", "See risk indicators and plain-language reasons."], [ShieldCheck, "Know your next step", "Use the guidance to make a safer decision."]].map(([Icon, title, text], index) => (
            <div className="how-item" key={title}><span className="step-number">0{index + 1}</span><div><h3><Icon className="w-4 h-4" />{title}</h3><p>{text}</p></div></div>
          ))}
        </div>
      </section>
      <section className="home-container resources-section" aria-labelledby="learn-title" data-reveal>
        <div className="section-heading"><div><p className="eyebrow">Stay a step ahead</p><h2 id="learn-title">A little knowledge. A stronger defense.</h2></div><Link to="/about" className="text-sm text-primary inline-flex gap-1 items-center">About SafeNet <ArrowRight className="w-4 h-4" /></Link></div>
        <div className="resource-grid">{resources.map(({ icon: Icon, title, text, to, action }) => <Link className="resource-card" to={to} key={to}><Icon className="w-6 h-6 text-primary" strokeWidth={1.5} /><h3>{title}</h3><p>{text}</p><span>{action}<ArrowRight className="w-4 h-4" /></span></Link>)}</div>
      </section>
      <section className="home-container" data-reveal>
        <div className="report-callout"><div className="report-icon"><Flag className="w-6 h-6" /></div><div className="flex-1"><h2>Seen a scam? Help others spot it.</h2><p>Share what happened. You can report anonymously, without an account.</p></div><Link to="/report" className="report-link" data-testid="home-report-cta">Report a Scam <ArrowRight className="w-4 h-4" /></Link></div>
      </section>
      <section className="home-container faq-section" data-testid="faq-section" aria-labelledby="faq-title" data-reveal>
        <div><p className="eyebrow">Good to know</p><h2 id="faq-title">Your safety questions, answered.</h2><p className="text-sm text-muted-foreground mt-3">Simple guidance for the moments that matter.</p></div>
        <Accordion type="single" collapsible>{faqs.map((f,i) => <AccordionItem value={`faq-${i}`} key={f.q}><AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent></AccordionItem>)}</Accordion>
      </section>
    </div>
  );
}
