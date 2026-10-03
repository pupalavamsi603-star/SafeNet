import { act } from "react";
import { createRoot } from "react-dom/client";
import { DecisionDesk } from "./DecisionDesk";
import { SafetyPlan } from "./SafetyPlan";
import { api } from "../lib/api";

jest.mock("../lib/api", () => ({
  api: { get: jest.fn(), patch: jest.fn() },
  formatApiErrorDetail: (value) => value || "Unable to save.",
}));
jest.mock("react-router-dom", () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("situation guide reveals a specific action and opens the matching scanner", async () => {
  const choose = jest.fn();
  jest.spyOn(document, "getElementById").mockReturnValue({ scrollIntoView: jest.fn() });
  try {
    await act(async () => root.render(<DecisionDesk onChooseTool={choose} />));
    await act(async () => container.querySelector('[data-testid="decision-qr"]').click());
    expect(container.querySelector('[data-testid="decision-answer"]').textContent).toContain("Preview what the code contains");
    await act(async () => container.querySelector('[data-testid="decision-answer"] button').click());
    expect(choose).toHaveBeenCalledWith("qr");
  } finally {
    document.getElementById.mockRestore();
  }
});

test("the signed-in safety plan saves one account step and updates its progress", async () => {
  api.get.mockResolvedValue({ data: { steps: { verify_sender: false, strong_passwords: false, mfa: false, updates: false }, completed_count: 0, total: 4 } });
  api.patch.mockResolvedValue({ data: { steps: { verify_sender: false, strong_passwords: false, mfa: true, updates: false }, completed_count: 1, total: 4 } });
  await act(async () => root.render(<SafetyPlan />));
  expect(container.querySelector('[role="progressbar"]').getAttribute("aria-valuenow")).toBe("0");
  await act(async () => container.querySelector('[data-testid="safety-step-mfa"]').click());
  expect(api.patch).toHaveBeenCalledWith("/user/safety-plan", { step: "mfa", completed: true });
  expect(container.querySelector('[role="progressbar"]').getAttribute("aria-valuenow")).toBe("1");
});
