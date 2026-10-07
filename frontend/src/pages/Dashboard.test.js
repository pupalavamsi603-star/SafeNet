import { act } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./Dashboard";
import { api } from "../lib/api";

let mockView = "";
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useSearchParams: () => [new URLSearchParams(mockView ? `view=${mockView}` : "")],
}), { virtual: true });
jest.mock("../context/AuthContext", () => {
  const user = { id: "test-user", name: "Test User" };
  return { useAuth: () => ({ user }) };
});
jest.mock("../lib/api", () => ({ api: { get: jest.fn() } }));
jest.mock("../components/SafetyPlan", () => ({ SafetyPlan: () => <section>Account safety plan</section> }));

let container, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  mockView = "";
  api.get.mockReset();
  api.get.mockImplementation((path) => Promise.resolve({ data: path === "/user/stats" ? { detections: 7, qr_scans: 3, reports: 2, quizzes: 1 } : path === "/quiz/certificate" ? { certificate: null } : [] }));
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = async () => act(async () => root.render(<Dashboard />));

test("dashboard renders returned counts and a real empty state without fake safety statistics", async () => {
  await render();
  expect([...container.querySelectorAll(".dashboard-stat strong")].map((el) => el.textContent)).toEqual(["7", "3", "2", "1"]);
  expect(container.textContent).toContain("No activity to show yet");
  expect(container.textContent).not.toContain("100% Accuracy");
  expect(container.querySelector('a[href="/dashboard?view=history"]')).not.toBeNull();
});

test("history filters the returned account records and chat links resume the actual session", async () => {
  mockView = "history";
  api.get.mockImplementation((path) => Promise.resolve({ data: path === "/user/activity" ? [
    { id: "m1", type: "detect", title: "Scam detection — dangerous", subtitle: "dangerous", timestamp: "2026-10-01T10:00:00Z" },
    { id: "q1", type: "qr", title: "QR scan — safe", subtitle: "safe", timestamp: "2026-10-02T10:00:00Z" },
  ] : path === "/user/chat-sessions" ? [{ session_id: "real-session", last_message: "What is phishing?", message_count: 2, updated_at: "2026-10-02T10:00:00Z" }] : path === "/quiz/certificate" ? { certificate: null } : {} }));
  await render();
  expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  await act(async () => [...container.querySelectorAll(".history-filters button")].find((button) => button.textContent === "QR scans").click());
  expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(container.querySelector("tbody").textContent).toContain("QR scan — safe");
  expect(container.querySelector('a[href="/ai?tab=chat&session=real-session"]')).not.toBeNull();
});

test("API failure is shown as unavailable rather than fabricated zero activity, and retry works", async () => {
  api.get.mockRejectedValue(new Error("Offline"));
  await render();
  expect(container.querySelector('[role="alert"]').textContent).toContain("could not load");
  expect(container.querySelectorAll(".dashboard-stat")).toHaveLength(0);
  expect(container.textContent).toContain("Saved activity is unavailable");
  expect(container.textContent).not.toContain("No activity to show yet");
  api.get.mockImplementation((path) => Promise.resolve({ data: path === "/user/stats" ? { detections: 4, qr_scans: 0, reports: 0, quizzes: 0 } : path === "/quiz/certificate" ? { certificate: null } : [] }));
  await act(async () => container.querySelector('[role="alert"] button').click());
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelector(".dashboard-stat strong").textContent).toBe("4");
});


test("expired sessions hide private activity and preserve History as the login destination", async () => {
  mockView = "history";
  api.get.mockRejectedValue({ response: { status: 401 } });
  await render();
  expect(container.textContent).toContain("Your session expired");
  expect(container.querySelector('a[href="/login?next=%2Fdashboard%3Fview%3Dhistory"]')).not.toBeNull();
  expect(container.querySelector(".activity-table")).toBeNull();
});
