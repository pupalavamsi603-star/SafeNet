import { act } from "react";
import { createRoot } from "react-dom/client";
import AIChat from "./AIChat";

let mockQuery = "";
jest.mock("react-router-dom", () => ({ useSearchParams: () => [new URLSearchParams(mockQuery), jest.fn()] }), { virtual: true });
jest.mock("../components/security/SecurityWorkspace", () => ({ SecurityWorkspace: ({ value, resumeSession, initialURL, presentation }) => <div data-testid="workspace" data-tool={value} data-session={resumeSession} data-url={initialURL} data-presentation={presentation} /> }));
let container, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test.each([["tab=url&url=https%3A%2F%2Fexample.com", "url", "URL Scanner"], ["tab=qr", "qr", "QR Scanner"], ["tab=detect", "detect", "Text / Message Scanner"], ["tab=chat", "chat", "Ask AI"], ["session=saved-session", "chat", "Ask AI"]])("existing tool links open the correct dedicated interface: %s", async (query, tool, title) => {
  mockQuery = query;
  await act(async () => root.render(<AIChat />));
  expect(container.querySelector("h1").textContent).toBe(title);
  expect(container.querySelector('[data-testid="workspace"]').dataset.tool).toBe(tool);
  expect(container.querySelector('[data-testid="workspace"]').dataset.presentation).toBe("page");
  if (query.includes("url=")) expect(container.querySelector('[data-testid="workspace"]').dataset.url).toBe("https://example.com");
  if (query.includes("session=")) expect(container.querySelector('[data-testid="workspace"]').dataset.session).toBe("saved-session");
});
