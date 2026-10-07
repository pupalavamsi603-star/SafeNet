import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export const Footer = () => <footer className="border-t bg-card" data-testid="main-footer"><div className="site-footer-inner"><Link to="/"><Shield className="w-6 h-6 text-primary" aria-hidden="true" />SafeNet</Link><nav aria-label="Footer navigation"><Link to="/scams">Learn</Link><Link to="/#features">Tools</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/report#emergency-help">Urgent help</Link></nav><small>© 2026 SafeNet · Guidance supports your judgment.</small></div></footer>;
