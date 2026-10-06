import { lazy, Suspense, useState } from "react";
import { Link2, QrCode, MessageSquareWarning, ArrowRight, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { URLTool } from "./URLTool";

const QRTab = lazy(() => import("./AnalysisTools").then((module) => ({ default: module.QRTab })));
const DetectTab = lazy(() => import("./AnalysisTools").then((module) => ({ default: module.DetectTab })));
const ChatTab = lazy(() => import("./AnalysisTools").then((module) => ({ default: module.ChatTab })));

const tools = [
  { id: "url", tag: "Websites & links", name: "Scan URL", description: "Check a suspicious website or link for threats.", icon: Link2 },
  { id: "qr", tag: "QR codes", name: "Scan QR Code", description: "Upload an image or use your camera.", icon: QrCode },
  { id: "detect", tag: "Messages & text", name: "Scan Text / Message", description: "Spot scam signals in a message or text.", icon: MessageSquareWarning },
];
const assistant = { id: "chat", tag: "AI assistant", name: "Ask SafeNet AI", description: "Get instant guidance on suspicious content.", icon: Sparkles };

export function SecurityWorkspace({ value, onValueChange, presentation, initialURL, resumeSession }) {
  const AssistantIcon = assistant.icon;
  const [visited, setVisited] = useState(() => new Set([value]));
  const select = (next) => {
    setVisited((old) => new Set([...old, next]));
    onValueChange(next);
  };
  if (presentation === "page") return <div className="security-workspace dedicated-tool"><Suspense fallback={<ToolLoading />}>
    {value === "url" && <URLTool standalone initialURL={initialURL} />}
    {value === "qr" && <QRTab standalone active />}
    {value === "detect" && <DetectTab standalone />}
    {value === "chat" && <ChatTab resumeSession={resumeSession} />}
  </Suspense></div>;
  return (
    <Tabs value={value} onValueChange={select} className="security-workspace">
      <TabsList aria-label="Security tools" className="tool-grid">
        {tools.map(({ id, tag, name, description, icon: Icon }) => (
          <TabsTrigger key={id} value={id} className={`tool-choice tool-${id}`} data-testid={`tab-${id}`}>
            <span className="tool-icon"><Icon aria-hidden="true" /></span>
            <span className="tool-copy"><span className="tool-tag">{tag}</span><span className="tool-name">{name}</span><span className="tool-description">{description}</span></span>
            <span className="tool-go" aria-hidden="true"><ArrowRight /></span>
            <span className="tool-action">Get Started <ArrowRight aria-hidden="true" /></span>
            <Icon className="tool-watermark" aria-hidden="true" />
          </TabsTrigger>
        ))}
        <button type="button" className="tool-choice tool-chat" data-testid="tab-chat" onClick={() => window.dispatchEvent(new CustomEvent("safenet:open-assistant"))}>
          <span className="tool-icon"><AssistantIcon aria-hidden="true" /></span>
          <span className="tool-copy"><span className="tool-tag">{assistant.tag}</span><span className="tool-name">{assistant.name}</span><span className="tool-description">{assistant.description}</span></span>
          <span className="tool-go" aria-hidden="true"><ArrowRight /></span>
          <span className="tool-action">Get Started <ArrowRight aria-hidden="true" /></span>
          <AssistantIcon className="tool-watermark" aria-hidden="true" />
        </button>
      </TabsList>
      {tools.map(({ id }) => (visited.has(id) || value === id) && (
        <TabsContent key={id} value={id} forceMount hidden={value !== id} className="tool-panel mt-5">
          {id === "url" && <URLTool />}
          {id === "qr" && <Suspense fallback={<ToolLoading />}><QRTab active={value === "qr"} /></Suspense>}
          {id === "detect" && <Suspense fallback={<ToolLoading />}><DetectTab /></Suspense>}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ToolLoading() {
  return <div className="tool-loading" role="status">Loading scanner…</div>;
}
