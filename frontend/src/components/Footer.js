import { Link } from "react-router-dom";
import { Shield, Phone, Globe, AlertTriangle } from "lucide-react";

export const Footer = () => (
  <footer className="border-t mt-24 relative z-10" data-testid="main-footer">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-sky-500" />
          <span className="font-heading font-bold text-lg">Safe<span className="text-sky-500">Net</span></span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          AI-powered cyber safety platform helping you recognize scams, protect your data, and stay safe online.
          Knowledge is your strongest firewall.
        </p>
        <div className="mt-5 flex items-start gap-2 text-xs text-muted-foreground bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-w-md">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>Victim of cyber fraud? Report immediately: India — call 1930 / cybercrime.gov.in · USA — ic3.gov</span>
        </div>
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Learn</h4>
        <ul className="space-y-2.5 text-sm">
          <li><Link to="/scams" className="hover:text-sky-500 transition-colors duration-200">Scam Types</Link></li>
          <li><Link to="/tips" className="hover:text-sky-500 transition-colors duration-200">Safety Tips</Link></li>
          <li><Link to="/quiz" className="hover:text-sky-500 transition-colors duration-200">Cyber Quiz</Link></li>
          <li><Link to="/blog" className="hover:text-sky-500 transition-colors duration-200">Blog</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Act</h4>
        <ul className="space-y-2.5 text-sm">
          <li><Link to="/ai" className="hover:text-sky-500 transition-colors duration-200">AI Scam Detector</Link></li>
          <li><Link to="/report" className="hover:text-sky-500 transition-colors duration-200">Report a Scam</Link></li>
          <li><Link to="/about" className="hover:text-sky-500 transition-colors duration-200">About SafeNet</Link></li>
          <li><Link to="/contact" className="hover:text-sky-500 transition-colors duration-200">Contact</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t py-5 px-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
      <Globe className="w-3.5 h-3.5" /> © 2026 SafeNet · Stay alert. Stay secure. <Phone className="w-3.5 h-3.5 ml-2" /> Cyber Helpline (IN): 1930
    </div>
  </footer>
);
