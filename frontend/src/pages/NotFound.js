import { Link } from "react-router-dom";
import { Compass, Home, ShieldAlert, Bot } from "lucide-react";
import { Button } from "../components/ui/button";

const SUGGESTIONS = [
  { to: "/scams", icon: ShieldAlert, label: "Scam Types", desc: "Learn how each con works" },
  { to: "/ai", icon: Bot, label: "AI Assistant", desc: "Check a message or QR code" },
  { to: "/tips", icon: Compass, label: "Safety Tips", desc: "Habits that block most attacks" },
];

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center" data-testid="not-found-page">
      <p className="font-heading text-7xl sm:text-8xl font-bold tracking-tighter text-sky-500">404</p>
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tighter mt-4">This page doesn't exist</h1>
      <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
        The link may be broken or the page may have moved. Nothing to worry about — here's the way back.
      </p>

      <Button asChild className="mt-8 rounded-full bg-sky-500 hover:bg-sky-600 text-white" data-testid="not-found-home-button">
        <Link to="/"><Home className="w-4 h-4 mr-2" /> Back to home</Link>
      </Button>

      <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {SUGGESTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            data-testid={`not-found-link-${s.to.slice(1)}`}
            className="group rounded-xl border bg-card p-5 hover:border-sky-500/50 transition-colors duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-sky-500" strokeWidth={1.6} />
            </div>
            <p className="font-heading text-sm font-semibold tracking-tight mt-4">{s.label}</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
