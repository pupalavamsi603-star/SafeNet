import { useEffect, useState } from "react";
import { Flag, Upload, Phone, ShieldAlert, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const EMERGENCY_STEPS = [
  "Call your bank immediately to freeze cards and block transactions.",
  "Change passwords for email, banking, and any compromised accounts.",
  "Call the cyber helpline: 1930 (India) or report at ic3.gov (USA).",
  "File a complaint at cybercrime.gov.in with screenshots and details.",
  "Preserve evidence — don't delete messages, emails, or call logs.",
  "Warn family and friends; scammers often re-target contacts.",
];

export default function ReportScam() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ scam_category: "", description: "", scammer_phone: "", scammer_url: "", amount_lost: "", reporter_name: "", reporter_email: "" });
  const [screenshot, setScreenshot] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get("/scam-types").then((r) => setCategories(r.data.map((s) => s.title))).catch(() => {});
  }, []);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Screenshot must be under 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setScreenshot(reader.result); setFileName(file.name); };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.scam_category) { toast.error("Please select a scam category."); return; }
    if (form.description.trim().length < 10) { toast.error("Please describe what happened (at least 10 characters)."); return; }
    setSubmitting(true);
    try {
      await api.post("/reports", { ...form, screenshot });
      setSubmitted(true);
      toast.success("Report submitted. Thank you for helping others stay safe.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted)
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center" data-testid="report-success">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" strokeWidth={1.3} />
        <h1 className="font-heading text-3xl font-bold tracking-tighter mt-6">Report received</h1>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          Your report helps us track scam patterns and warn others. If you lost money, please also report
          officially — call <span className="text-sky-500 font-semibold">1930</span> (India) or file at cybercrime.gov.in / ic3.gov right away.
        </p>
        <Button onClick={() => { setSubmitted(false); setForm({ scam_category: "", description: "", scammer_phone: "", scammer_url: "", amount_lost: "", reporter_name: "", reporter_email: "" }); setScreenshot(""); setFileName(""); }} variant="outline" className="mt-8 rounded-full" data-testid="report-another-button">
          Submit another report
        </Button>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16" data-testid="report-page">
      <p className="text-xs uppercase tracking-[0.25em] text-red-500 mb-4">Take action</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter">Report a Scam</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Every report makes the internet safer. Share what happened — anonymously if you prefer.
      </p>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <form onSubmit={submit} className="lg:col-span-7 rounded-xl border bg-card p-8 space-y-6" data-testid="report-form">
          <div className="space-y-2">
            <Label>Scam category *</Label>
            <Select value={form.scam_category} onValueChange={(v) => setForm({ ...form, scam_category: v })}>
              <SelectTrigger data-testid="report-category-select"><SelectValue placeholder="Select the type of scam" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>What happened? *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the scam — what was said, what you were asked to do, how contact was made..."
              className="min-h-[140px]"
              data-testid="report-description-input"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Scammer's phone number</Label>
              <Input value={form.scammer_phone} onChange={(e) => setForm({ ...form, scammer_phone: e.target.value })} placeholder="+91 XXXXX XXXXX" data-testid="report-phone-input" />
            </div>
            <div className="space-y-2">
              <Label>Suspicious URL / website</Label>
              <Input value={form.scammer_url} onChange={(e) => setForm({ ...form, scammer_url: e.target.value })} placeholder="http://fake-site.example" data-testid="report-url-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Amount lost (if any)</Label>
              <Input value={form.amount_lost} onChange={(e) => setForm({ ...form, amount_lost: e.target.value })} placeholder="e.g. ₹5,000 or $100" data-testid="report-amount-input" />
            </div>
            <div className="space-y-2">
              <Label>Screenshot (optional, max 2MB)</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 rounded-md border border-input px-3 h-10 text-sm text-muted-foreground hover:border-sky-500/60 transition-colors duration-200">
                    <Upload className="w-4 h-4" /> <span className="truncate">{fileName || "Upload image"}</span>
                  </div>
                  <input type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="report-screenshot-input" />
                </label>
                {screenshot && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => { setScreenshot(""); setFileName(""); }} aria-label="Remove screenshot">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Your name (optional)</Label>
              <Input value={form.reporter_name} onChange={(e) => setForm({ ...form, reporter_name: e.target.value })} placeholder="Anonymous" data-testid="report-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Your email (optional)</Label>
              <Input type="email" value={form.reporter_email} onChange={(e) => setForm({ ...form, reporter_email: e.target.value })} placeholder="you@example.com" data-testid="report-email-input" />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full rounded-full bg-red-500 hover:bg-red-600 text-white h-11" data-testid="report-submit-button">
            {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>) : (<><Flag className="w-4 h-4 mr-2" /> Submit Report</>)}
          </Button>
        </form>

        <aside className="lg:col-span-5">
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-7 sticky top-24" data-testid="emergency-steps-panel">
            <h2 className="font-heading text-lg font-semibold tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Emergency steps if you've been scammed
            </h2>
            <ol className="mt-6 space-y-4">
              {EMERGENCY_STEPS.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
