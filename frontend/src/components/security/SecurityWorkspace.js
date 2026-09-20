import { useState } from "react";
import { Link2, QrCode, MessageSquareWarning, Bot, ArrowUpRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DetectTab, QRTab } from "./AnalysisTools";
import { URLTool } from "./URLTool";

const tools = [
  { id: "url", name: "Scan URL", description: "Check a suspicious website or link", icon: Link2 },
  { id: "qr", name: "Scan QR Code", description: "Upload an image or use your camera", icon: QrCode },
  { id: "detect", name: "Scan Text / Message", description: "Spot scam signals in a message", icon: MessageSquareWarning },
  { id: "chat", name: "Ask AI", description: "Get answers about cybersecurity", icon: Bot },
];

export function SecurityWorkspace({ value, onValueChange }) {
  const [visited, setVisited] = useState(() => new Set([value]));
  const select = (next) => {
    setVisited((old) => new Set([...old, next]));
    onValueChange(next);
    if (next === "chat") window.dispatchEvent(new CustomEvent("safenet:open-assistant"));
  };
  return (
    <Tabs value={value} onValueChange={select} className="security-workspace">
      <TabsList aria-label="Security tools" className="tool-grid">
        {tools.map(({ id, name, description, icon: Icon }) => (
          <TabsTrigger key={id} value={id} className="tool-choice" data-testid={`tab-${id}`}>
            <span className="tool-icon"><Icon className="w-5 h-5" aria-hidden="true" /></span>
            <span className="tool-copy"><span className="tool-name">{name}</span><span className="tool-description">{description}</span></span>
            <ArrowUpRight className="tool-arrow w-4 h-4" aria-hidden="true" />
          </TabsTrigger>
        ))}
      </TabsList>
      {tools.map(({ id }) => (visited.has(id) || value === id) && (
        <TabsContent key={id} value={id} forceMount hidden={value !== id} className="tool-panel mt-5">
          {id === "url" && <URLTool />}
          {id === "qr" && <QRTab active={value === "qr"} />}
          {id === "detect" && <DetectTab />}
          {id === "chat" && <div className="assistant-launcher"><span className="tool-icon"><Bot className="w-5 h-5" /></span><div><h3 className="font-heading text-lg font-semibold">SafeNet AI is ready</h3><p className="text-sm text-muted-foreground mt-1">Ask about suspicious messages, scams, passwords, or safer browsing.</p></div><button className="assistant-launcher-button" onClick={() => window.dispatchEvent(new CustomEvent("safenet:open-assistant"))}>Open assistant</button></div>}
        </TabsContent>
      ))}
    </Tabs>
  );
}
