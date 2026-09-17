import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { api, formatApiErrorDetail, getRetryAfterSeconds } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScanResult } from "./ScanResult";
import { useCooldown, CooldownBanner } from "./AnalysisTools";

export function validateURL(value) {
  const input = value.trim();
  if (!input) return "Enter a website or link to check.";
  if (input.length > 2000 || /\s/.test(input)) return "Enter a valid URL without spaces (up to 2,000 characters).";
  try {
    const parsed = new URL(input.includes(":") ? input : `https://${input}`);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error();
    return "";
  } catch { return "Enter a valid website, such as example.com or https://example.com."; }
}

// The original homepage URL checker, now presented alongside the other tools.
export function URLTool() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, startCooldown] = useCooldown();
  const check = async (event) => {
    event.preventDefault();
    if (loading || cooldown) return;
    const invalid = validateURL(url);
    setError(invalid);
    if (invalid) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/url-check", { url: url.trim() });
      setResult(data);
    } catch (err) {
      const seconds = getRetryAfterSeconds(err);
      if (seconds) startCooldown(seconds);
      else setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setLoading(false); }
  };
  return (
    <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5" id="url-check">
      <form onSubmit={check} className="rounded-xl border bg-card p-5 sm:p-6" noValidate>
        <h3 className="font-semibold text-lg flex gap-2 items-center"><Link2 className="w-5 h-5 text-primary" /> Check a suspicious link</h3>
        <p className="text-sm text-muted-foreground mt-2 mb-5">Check a website from an email, message or social post before you open it.</p>
        <label htmlFor="url-input" className="block text-sm font-medium mb-2">Website or URL</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input id="url-input" value={url} inputMode="url" autoComplete="off" spellCheck={false} maxLength={2000} disabled={loading} onChange={(e) => { setUrl(e.target.value); setError(""); setResult(null); }} onBlur={() => { if (url.trim()) setError(validateURL(url)); }} placeholder="https://example.com" className="h-11 min-w-0" aria-invalid={!!error} aria-describedby="url-help url-error" data-testid="url-check-input" />
          <Button type="submit" disabled={loading || !!cooldown} className="h-11 shrink-0 px-5" data-testid="url-check-button">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…</> : "Scan URL"}</Button>
        </div>
        <p id="url-error" role="alert" className="text-sm text-red-700 dark:text-red-400 mt-2">{error}</p>
        <p id="url-help" className="text-xs text-muted-foreground mt-3">Checks URL patterns with AI. SafeNet does not open or download the link.</p>
        <div className="mt-3"><CooldownBanner seconds={cooldown} label="URL scan limit reached." /></div>
      </form>
      <ScanResult result={result} loading={loading} />
    </div>
  );
}
