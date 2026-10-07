import { authIntent, authLink, safeDestination } from "./journey";
import { clearJourneyDrafts, DRAFT_TTL, readDraft, selectResult, writeDraft } from "./scanDraft";

beforeEach(() => sessionStorage.clear());
test.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login?next=//evil.example", "/not-a-route", "/ai\n", "/scams/%2e%2e/login"])("untrusted return destination is rejected: %s", (value) => expect(safeDestination(value)).toBe("/dashboard"));
test("return paths keep known routing intent and discard scan content and credentials", () => {
  expect(safeDestination("/dashboard?view=history")).toBe("/dashboard?view=history");
  expect(safeDestination("/quiz")).toBe("/quiz");
  expect(safeDestination("/ai?tab=url&url=private-content&token=secret")).toBe("/ai?tab=url");
  expect(safeDestination("/ai?tab=chat&session=real-session")).toBe("/ai?tab=chat&session=real-session");
  expect(authIntent(authLink("login", "/quiz").split("?")[1]).next).toBe("/quiz");
});
test("only bounded, permitted drafts can be restored, and expired contents are removed", () => {
  writeDraft("url", { input: "https://example.com", result: { risk_score: 10 } });
  expect(readDraft("url").result.risk_score).toBe(10);
  writeDraft("unbounded", { content: "not allowed" });
  expect(sessionStorage.getItem("safenet-journey:unbounded")).toBeNull();
  writeDraft("report", { content: "x".repeat(70000) });
  expect(readDraft("report")).toBeNull();
  const now = jest.spyOn(Date, "now").mockReturnValue(Date.now() + DRAFT_TTL + 1);
  expect(readDraft("url")).toBeNull();
  expect(sessionStorage.getItem("safenet-journey:url")).toBeNull();
  now.mockRestore();
});
test("authentication selection contains only the selected tool, and logout clears all journey contents", () => {
  writeDraft("detect", { input: "Sample message" });
  selectResult("detect");
  expect(readDraft("selected-result")).toEqual({ kind: "detect" });
  clearJourneyDrafts();
  expect(readDraft("detect")).toBeNull();
  expect(readDraft("selected-result")).toBeNull();
});
