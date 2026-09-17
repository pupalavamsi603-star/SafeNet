import { Link } from "react-router-dom";
import { Shield, ShieldCheck, ScanSearch, Bot } from "lucide-react";

// Split-screen auth layout: brand panel (left, hidden on mobile) + form (right).
// `standalone` = rendered without the site navbar above it, so it owns the full
// viewport height and must provide its own way back to the site.
export function AuthLayout({ children, testId, standalone = false }) {
  return (
    <div
      className={`${standalone ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"} grid grid-cols-1 lg:grid-cols-2`}
      data-testid={testId}
    >
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-accent/50 border-r p-12 text-foreground">
        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <Shield className="w-7 h-7 text-primary" strokeWidth={1.5} />
          <span className="font-heading text-lg font-bold tracking-tight">SafeNet</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-heading text-3xl xl:text-4xl font-bold tracking-tighter leading-tight">
            Stay one step ahead of every scam.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Learn to spot phishing, OTP fraud, fake shopping sites and more — with AI-powered tools built for everyone.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Bot, text: "AI safety assistant" },
              { icon: ScanSearch, text: "Instant scam message analysis" },
              { icon: ShieldCheck, text: "QR code safety scanner" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-foreground">
                <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" strokeWidth={1.6} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} SafeNet — Cyber safety for everyone.</p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-4 sm:px-8 py-10 overflow-hidden">
        <div className="relative w-full max-w-[400px]">
          {standalone && (
            <Link to="/" className="lg:hidden mb-8 flex items-center gap-2 w-fit" data-testid="auth-home-link">
              <Shield className="w-6 h-6 text-primary" strokeWidth={1.6} />
              <span className="font-heading text-base font-bold tracking-tight">
                Safe<span className="text-primary">Net</span>
              </span>
            </Link>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
