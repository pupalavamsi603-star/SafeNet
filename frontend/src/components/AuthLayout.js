import { Link } from "react-router-dom";
import { Shield, ShieldCheck, ScanSearch, Bot } from "lucide-react";
import { StarField } from "./StarField";

// Split-screen auth layout: brand panel (left, hidden on mobile) + form (right).
export function AuthLayout({ children, testId }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2" data-testid={testId}>
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#050b16] p-12 text-white">
        {/* background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-violet-600/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(56,189,248,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.25) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>
        {/* cursor-following starfield */}
        <StarField density={150} />

        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <Shield className="w-7 h-7 text-sky-400" strokeWidth={1.5} />
          <span className="font-heading text-lg font-bold tracking-tight">SafeNet</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-heading text-3xl xl:text-4xl font-bold tracking-tighter leading-tight">
            Stay one step ahead of every scam.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-slate-300">
            Join thousands learning to spot phishing, OTP fraud, fake shopping sites and more — with AI-powered tools built for everyone.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Bot, text: "24/7 AI safety assistant" },
              { icon: ScanSearch, text: "Instant scam message analysis" },
              { icon: ShieldCheck, text: "QR code safety scanner" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-sky-400" strokeWidth={1.6} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} SafeNet — Cyber safety for everyone.</p>
      </div>

      {/* Form panel — subtle starfield in dark mode only */}
      <div className="relative flex items-center justify-center px-4 sm:px-8 py-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none hidden dark:block">
          <StarField density={70} color="147, 197, 253" />
        </div>
        <div className="relative w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
