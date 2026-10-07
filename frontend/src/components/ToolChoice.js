import { Link } from "react-router-dom";
import { useRef } from "react";
import { Link2, QrCode, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

export function ToolOptions({ onChoose }) {
  return <div className="tool-choice-grid">{[["url", Link2, "A website link", "Review a suspicious web address."], ["qr", QrCode, "A QR code", "Reveal and assess its contents."], ["detect", MessageSquare, "A message", "Check an email, text or message."], ["chat", Sparkles, "Ask AI", "Get guidance about online safety."]].map(([key, Icon, title, detail]) => <Link key={key} to={`/ai?tab=${key}`} onClick={onChoose}><Icon size={23} aria-hidden="true" /><div><strong>{title}</strong><p>{detail}</p></div><ArrowRight size={16} aria-hidden="true" /></Link>)}</div>;
}
export function ToolChoice({ open, onOpenChange }) {
  const opener = useRef(null);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="tool-choice-dialog" onOpenAutoFocus={() => { opener.current = document.activeElement; }} onCloseAutoFocus={(event) => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); }}><DialogHeader><DialogTitle>What would you like to check?</DialogTitle><DialogDescription>Choose the tool that fits. You can scan without an account.</DialogDescription></DialogHeader><ToolOptions onChoose={() => onOpenChange(false)} /></DialogContent></Dialog>;
}
