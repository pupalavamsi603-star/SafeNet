import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Cog, AlertTriangle, ShieldCheck, FileText, Loader2, MessageSquareWarning } from "lucide-react";
import { api } from "../lib/api";
import { getIcon } from "../lib/icons";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function ScamDetail() {
  const { slug } = useParams();
  const [scam, setScam] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    // Reset both, or navigating from a missing scam to a valid one keeps
    // showing "not found" forever.
    let active = true;
    setError("");
    setScam(null);
    api.get(`/scam-types/${slug}`).then((r) => { if (active) setScam(r.data); }).catch((err) => { if (active) setError(err.response?.status === 404 ? "missing" : "unavailable"); });
    return () => { active = false; };
  }, [slug, retry]);

  if (error)
    return <div className="max-w-4xl mx-auto px-4 py-24 text-center text-muted-foreground" data-testid="scam-not-found">{error === "missing" ? "This guide could not be found." : "This guide could not load. Check your connection and try again."} {error === "unavailable" && <Button type="button" variant="outline" onClick={() => setRetry((value) => value + 1)}>Retry</Button>} <Link to="/scams" className="text-primary">Back to all scams</Link></div>;
  if (!scam)
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const Icon = getIcon(scam.icon);
  const scanner = /qr/i.test(slug) ? ["qr", "QR Scanner"] : /shopping|website|investment/i.test(slug) ? ["url", "URL Scanner"] : ["detect", "Message Scanner"];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16" data-testid="scam-detail-page">
      <Link to="/scams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200" data-testid="back-to-scams-link">
        <ArrowLeft className="w-4 h-4" /> All scam types
      </Link>

      <div className="mt-8 flex items-start gap-5">
        <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
          <Icon className="w-8 h-8 text-red-700" strokeWidth={1.5} />
        </div>
        <div>
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30 text-[10px] uppercase tracking-wider mb-2">{scam.severity} risk</Badge>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tighter">{scam.title}</h1>
        </div>
      </div>

      <p className="mt-7 text-base leading-relaxed text-muted-foreground">{scam.description}</p>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold tracking-tight flex items-center gap-2.5"><Cog className="w-5 h-5 text-primary" /> How the scam works</h2>
        <p className="mt-4 text-sm md:text-base leading-relaxed text-muted-foreground border-l-2 border-sky-500/40 pl-5">{scam.how_it_works}</p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold tracking-tight flex items-center gap-2.5"><AlertTriangle className="w-5 h-5 text-red-700" /> Warning signs</h2>
        <ul className="mt-5 space-y-3">
          {scam.warning_signs?.map((w, i) => (
            <li key={i} className="flex items-start gap-3 text-sm md:text-base rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold tracking-tight flex items-center gap-2.5"><ShieldCheck className="w-5 h-5 text-emerald-700" /> How to protect yourself</h2>
        <ul className="mt-5 space-y-3">
          {scam.prevention_tips?.map((p, i) => (
            <li key={i} className="flex items-start gap-3 text-sm md:text-base rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" /> {p}
            </li>
          ))}
        </ul>
      </section>

      {scam.real_example && (
        <section className="mt-8">
          <h2 className="font-heading text-lg font-semibold tracking-tight flex items-center gap-2.5"><FileText className="w-5 h-5 text-amber-800" /> Example scenario</h2>
          <div className="mt-4 rounded-xl border bg-card p-6 text-sm md:text-base leading-relaxed text-muted-foreground italic">
            "{scam.real_example}"
          </div>
        </section>
      )}

      <div className="mt-14 rounded-xl border border-sky-500/30 bg-sky-500/5 p-7 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1">
          <h3 className="font-heading text-base font-semibold tracking-tight">Have something suspicious to check?</h3>
          <p className="text-sm text-muted-foreground mt-1">Review the contents with the relevant tool before taking action.</p>
        </div>
        <Button asChild className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shrink-0" data-testid="scam-detail-detect-cta">
          <Link to={`/ai?tab=${scanner[0]}`}><MessageSquareWarning className="w-4 h-4 mr-1.5" /> Open {scanner[1]}</Link>
        </Button>
      </div>
    </div>
  );
}
