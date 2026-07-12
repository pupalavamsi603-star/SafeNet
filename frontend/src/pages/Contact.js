import { useState } from "react";
import { Mail, MapPin, Phone, SendHorizonal, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/contact", form);
      setSent(true);
      toast.success("Message sent! We'll get back to you soon.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20" data-testid="contact-page">
      <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-4">Get in touch</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter">Contact SafeNet</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Questions, feedback, or partnership ideas? We'd love to hear from you.
      </p>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-5">
          {[
            { icon: Mail, title: "Email", value: "hello@safenet.example" },
            { icon: Phone, title: "Cyber Helpline (India)", value: "1930 — 24/7 fraud reporting" },
            { icon: MapPin, title: "Reach", value: "Serving users worldwide, online-first" },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border bg-card p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                <c.icon className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{c.title}</p>
                <p className="text-sm font-medium mt-1">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8">
          {sent ? (
            <div className="rounded-xl border bg-card p-12 text-center" data-testid="contact-success">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" strokeWidth={1.3} />
              <h2 className="font-heading text-2xl font-bold tracking-tighter mt-5">Message sent!</h2>
              <p className="text-sm text-muted-foreground mt-2.5">Thanks for reaching out. We typically reply within 1-2 business days.</p>
              <Button variant="outline" className="mt-6 rounded-full" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }} data-testid="contact-send-another">
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-xl border bg-card p-8 space-y-5" data-testid="contact-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" data-testid="contact-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="contact-email-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input required minLength={2} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What is this about?" data-testid="contact-subject-input" />
              </div>
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea required minLength={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us more..." className="min-h-[140px]" data-testid="contact-message-input" />
              </div>
              <Button type="submit" disabled={submitting} className="rounded-full bg-sky-500 hover:bg-sky-600 text-white px-8" data-testid="contact-submit-button">
                {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>) : (<><SendHorizonal className="w-4 h-4 mr-2" /> Send Message</>)}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
