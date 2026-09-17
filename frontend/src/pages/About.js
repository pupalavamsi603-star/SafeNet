import { Shield, Target, Eye, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";

const values = [
  { icon: Target, title: "Awareness First", desc: "Scams succeed on ignorance. We decode every trick — phishing, OTP fraud, UPI scams, and more — in language anyone can understand." },
  { icon: Eye, title: "AI-Powered Vigilance", desc: "Our AI assistant and scam detector analyze suspicious messages in seconds, giving you a second pair of expert eyes, always available." },
  { icon: HeartHandshake, title: "Free for Everyone", desc: "Cyber safety shouldn't be a privilege. Every tool, guide, and quiz on SafeNet is free — because the most vulnerable are often the least protected." },
];

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12" data-testid="about-page">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">About SafeNet</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1]">
            Make safer decisions online.
          </h1>
          <p className="mt-7 text-base text-muted-foreground leading-relaxed max-w-2xl">
            Every day, millions lose money and peace of mind to online scams — not because they're careless,
            but because scammers are professionals who exploit trust, urgency, and fear. SafeNet exists to level
            the playing field.
          </p>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
            We combine clear, practical education with AI-powered tools: an assistant that answers your security
            questions, a detector that analyzes suspicious messages, an interactive quiz that trains your instincts,
            and a reporting system that helps track threats.
          </p>
        </div>
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="rounded-xl border bg-card p-8 w-full max-w-sm">
            <Shield className="w-10 h-10 text-primary" strokeWidth={1.5} />
            <h2 className="mt-5 text-xl font-semibold">Protection through knowledge</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">Check suspicious content, understand warning signs and build safer online habits with SafeNet.</p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            className="rounded-xl border bg-card p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <v.icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <h3 className="font-heading text-lg font-semibold mt-4 tracking-tight">{v.title}</h3>
            <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">{v.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
