import { Shield, Target, Eye, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";

const values = [
  { icon: Target, title: "Awareness First", desc: "Scams succeed on ignorance. We decode every trick — phishing, OTP fraud, UPI scams, and more — in language anyone can understand." },
  { icon: Eye, title: "AI-Powered Vigilance", desc: "Our AI assistant and scam detector analyze suspicious messages in seconds, giving you a second pair of expert eyes, always available." },
  { icon: HeartHandshake, title: "Free for Everyone", desc: "Cyber safety shouldn't be a privilege. Every tool, guide, and quiz on SafeNet is free — because the most vulnerable are often the least protected." },
];

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20" data-testid="about-page">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-4">About SafeNet</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter leading-[1.1]">
            The internet is amazing.<br />It's also a <span className="text-red-500">hunting ground</span>.
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
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1728756666032-d0b5552b6384?crop=entropy&cs=srgb&fm=jpg&q=85&w=700"
              alt="Glass cyber shield"
              className="rounded-xl border object-cover w-full max-w-sm"
            />
            <div className="absolute -bottom-4 -left-4 glass-panel rounded-lg px-4 py-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-500" />
              <span className="text-sm font-medium">Protection through knowledge</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            className="rounded-xl border bg-card p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <v.icon className="w-8 h-8 text-sky-500" strokeWidth={1.5} />
            <h3 className="font-heading text-lg font-semibold mt-4 tracking-tight">{v.title}</h3>
            <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">{v.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
