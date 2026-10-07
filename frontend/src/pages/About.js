import { Link } from "react-router-dom";
import { ShieldCheck, Target, Eye, HeartHandshake, ArrowRight } from "lucide-react";

const values = [
  { icon: Target, title: "Awareness first", desc: "Recognize the warning signs of phishing, OTP fraud, payment scams and more, in language anyone can understand." },
  { icon: Eye, title: "AI-powered insights", desc: "Check suspicious links, messages and QR content. Review the signals and get practical guidance for your next step." },
  { icon: HeartHandshake, title: "Free for everyone", desc: "Every tool, guide and quiz is free. Cyber safety knowledge should be accessible to everyone." },
];

export default function About() {
  return <div className="about-page" data-testid="about-page">
    <div className="workspace-page-heading"><div><p className="page-overline">OUR PURPOSE</p><h1>About SafeNet</h1><p>Empowering a safer digital world through clarity, awareness and AI.</p></div></div>
    <div className="about-story"><div className="about-visual"><img src="/assets/safenet-hero-shield-640.webp" width="640" height="427" alt="Blue SafeNet protection shield" loading="lazy" decoding="async" /><span><ShieldCheck size={17} aria-hidden="true" /> Protection through knowledge</span></div><div className="about-copy"><h2>A clearer view of online risk.</h2><p>Scammers exploit trust, urgency and fear. SafeNet helps individuals recognize those tactics and choose a safer next step.</p><p>We combine practical education with AI-powered tools: a security assistant, link and message checks, a QR scanner, a quiz that trains your instincts and a community reporting system.</p><p>Our mission is to create a safer, smarter digital world where everyone can access useful cybersecurity guidance.</p><Link className="premium-button" to="/#features">Explore the tools <ArrowRight size={16} aria-hidden="true" /></Link></div></div>
    <div className="about-values">{values.map(({ icon: Icon, title, desc }) => <section key={title}><span><Icon size={23} aria-hidden="true" /></span><h3>{title}</h3><p>{desc}</p></section>)}</div>
    <div className="about-note"><ShieldCheck size={24} aria-hidden="true" /><div><h2>Guidance that supports your judgment.</h2><p>AI analysis can miss threats. SafeNet helps you understand warning signs; it cannot guarantee that a website, message or QR code is safe.</p></div></div>
  </div>;
}
