import { useRef, useState } from "react";
import { BookOpen, MessageSquare, ShieldAlert, SendHorizonal, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { readDraft, writeDraft, removeDraft } from "../lib/scanDraft";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";

export default function Contact() {
  const pending = useRef(false);
  const [form, setForm] = useState(() => { const draft = readDraft("contact"); return Object.fromEntries(["name", "email", "subject", "message"].map((key) => [key, typeof draft?.[key] === "string" ? draft[key].slice(0, key === "message" ? 5000 : key === "name" ? 60 : key === "subject" ? 150 : 254) : ""])); });
  const updateForm = (value) => { setForm(value); writeDraft("contact", value); };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setError("");
    setSubmitting(true);
    try {
      await api.post("/contact", form);
      setSent(true);
      removeDraft("contact");
      toast.success("Message received by SafeNet.");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12" data-testid="contact-page">
      <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">Get in touch</p>
      <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">Contact SafeNet</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Questions about SafeNet, feedback or an issue with the product? Send details below. For a suspected scam, use the reporting and urgent-help guidance.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-5">
          {[
            { icon: BookOpen, title: "Product guidance", value: "Explore practical guides and safety tips.", to: "/tips" },
            { icon: MessageSquare, title: "Feedback", value: "Use the form to share a suggestion or describe an issue." },
            { icon: ShieldAlert, title: "Suspected scam or urgent help", value: "Protective steps and official reporting resources.", to: "/report" },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border bg-card p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                <c.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{c.title}</p>
                <p className="text-sm font-medium mt-1">{c.value}</p>{c.to && <Link to={c.to} className="support-link">{c.to === "/report" ? "View reporting guidance →" : "Browse safety guidance →"}</Link>}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8">
          {sent ? (
            <div className="rounded-xl border bg-card p-12 text-center" data-testid="contact-success">
              <CheckCircle2 className="w-14 h-14 text-emerald-700 mx-auto" strokeWidth={1.3} />
              <h2 className="font-heading text-2xl font-bold tracking-tighter mt-5">Message sent!</h2>
              <p className="text-sm text-muted-foreground mt-2.5">Your message has been recorded for the SafeNet team. This is not an emergency reporting service.</p>
              <Button variant="outline" className="mt-6 rounded-full" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }} data-testid="contact-send-another">
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-xl border bg-card p-8 space-y-5" data-testid="contact-form">
              <h2 className="text-xl font-semibold">Send us a message</h2>{error && <p role="alert" className="form-error">{error} Your message is still here; try again.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name *</Label>
                  <Input id="contact-name" required minLength={2} maxLength={60} value={form.name} onChange={(e) => updateForm({ ...form, name: e.target.value })} placeholder="Your name" data-testid="contact-name-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email *</Label>
                  <Input id="contact-email" required type="email" value={form.email} onChange={(e) => updateForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="contact-email-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject *</Label>
                <Input id="contact-subject" required minLength={2} maxLength={150} value={form.subject} onChange={(e) => updateForm({ ...form, subject: e.target.value })} placeholder="What is this about?" data-testid="contact-subject-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message *</Label>
                <Textarea id="contact-message" required minLength={5} maxLength={5000} value={form.message} onChange={(e) => updateForm({ ...form, message: e.target.value })} placeholder="Tell us more..." className="min-h-[140px]" data-testid="contact-message-input" />
              </div>
              <Button type="submit" disabled={submitting} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-8" data-testid="contact-submit-button">
                {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>) : (<><SendHorizonal className="w-4 h-4 mr-2" /> Send Message</>)}
              </Button><p className="text-xs text-muted-foreground">Do not include passwords, OTPs or payment details. Form text can be restored in this tab for 15 minutes.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
