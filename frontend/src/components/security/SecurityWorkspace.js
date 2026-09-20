import { useState } from "react";
import { Link2, QrCode, MessageSquareWarning, ArrowUpRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DetectTab, QRTab } from "./AnalysisTools";
import { URLTool } from "./URLTool";

const tools = [
  { id: "url", name: "Scan URL", description: "Check a suspicious website or link", icon: Link2 },
  { id: "qr", name: "Scan QR Code", description: "Upload an image or use your camera", icon: QrCode },
  { id: "detect", name: "Scan Text / Message", description: "Spot scam signals in a message", icon: MessageSquareWarning },
];

export function SecurityWorkspace({ value, onValueChange }) {
  const [visited, setVisited] = useState(() => new Set([value]));
  const select = (next) => {
    setVisited((old) => new Set([...old, next]));
    onValueChange(next);
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
        </TabsContent>
      ))}
    </Tabs>
  );
}
