// Render the common formatting in model replies as React text nodes. Links and
// HTML remain plain text, so an analyzed scam cannot introduce an active link.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part.startsWith("`") && part.endsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part);
}

export function ChatMessageContent({ content }) {
  const blocks = [];
  let list = null;
  String(content).split("\n").forEach((line) => {
    const match = line.trim().match(/^(\d+[.)]|[-*])\s+(.+)$/);
    if (match) {
      const ordered = /^\d/.test(match[1]);
      if (!list || list.ordered !== ordered) { list = { ordered, start: ordered ? parseInt(match[1], 10) : undefined, items: [] }; blocks.push(list); }
      list.items.push(match[2]);
    } else if (line.trim()) {
      list = null;
      blocks.push({ text: line.replace(/^#{1,3}\s+/, ""), heading: /^#{1,3}\s+/.test(line) });
    } else { list = null; }
  });
  return <div className="chat-formatted-content">{blocks.map((block, index) => block.items ? block.ordered ? <ol key={index} start={block.start}>{block.items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ol> : <ul key={index}>{block.items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul> : <p key={index}>{block.heading ? <strong>{inline(block.text)}</strong> : inline(block.text)}</p>)}</div>;
}
