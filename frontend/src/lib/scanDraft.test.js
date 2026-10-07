import { act } from "react";
import { createRoot } from "react-dom/client";
import { selectResult, useScanDraft, writeDraft } from "./scanDraft";
let root, container;
function View({ kind, owner }) { const [state] = useScanDraft(kind, true, owner); return <div>{state.input}<span>{state.savedFor || "Not saved"}</span></div>; }
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; sessionStorage.clear(); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
test("account changes cannot restore another account's private draft", async () => {
  writeDraft("detect", { input: "Account A draft", owner: "account-a", result: { risk_level: "safe" }, savedFor: "account-a" });
  await act(async () => root.render(<View kind="detect" owner="account-a" />));
  expect(container.textContent).toContain("Account A draft");
  await act(async () => root.render(<View kind="detect" owner="account-b" />));
  expect(container.textContent).not.toContain("Account A draft");
});
test("only the explicitly selected guest assessment survives login, without claiming an account save", async () => {
  writeDraft("detect", { input: "Selected sample", owner: "guest", result: { risk_level: "safe" }, savedFor: null });
  writeDraft("qr", { input: "Unrelated sample", owner: "guest", result: { risk_level: "safe" }, savedFor: null });
  selectResult("detect");
  await act(async () => root.render(<View kind="detect" owner="new-account" />));
  expect(container.textContent).toContain("Selected sample");
  expect(container.textContent).toContain("Not saved");
  await act(async () => root.render(<View kind="qr" owner="new-account" />));
  expect(container.textContent).not.toContain("Unrelated sample");
});
