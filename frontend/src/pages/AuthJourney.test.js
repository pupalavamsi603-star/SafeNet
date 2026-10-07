import { act } from "react";
import { createRoot } from "react-dom/client";
import Login from "./Login";
import Register from "./Register";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { api } from "../lib/api";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

let mockLocation = { pathname: "/dashboard", search: "?view=history" };
const mockNavigate = jest.fn();
const mockSetUser = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate, useLocation: () => mockLocation,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }) => <div data-destination={to} />,
}), { virtual: true });
jest.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false, setUser: mockSetUser }) }));
jest.mock("../lib/api", () => ({ api: { post: jest.fn() }, formatApiErrorDetail: () => "Sign-in failed" }));
jest.mock("../lib/nativeGoogle", () => ({ canUseNativeGoogle: () => true, nativeGoogleSignIn: () => Promise.resolve("test-only-token") }));
let container, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); api.post.mockResolvedValue({ data: { id: "u", name: "Test user" } }); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = (ui) => act(async () => root.render(ui));
test("protected History redirects with its exact safe destination", async () => {
  mockLocation = { pathname: "/dashboard", search: "?view=history" };
  await render(<ProtectedRoute>Private history</ProtectedRoute>);
  expect(container.querySelector("[data-destination]").dataset.destination).toBe("/login?next=%2Fdashboard%3Fview%3Dhistory");
});
test.each([["/quiz", "quiz"], ["/dashboard?view=history", "history"]])("email login and signup switching preserve %s", async (next, heading) => {
  mockLocation = { pathname: "/login", search: `?next=${encodeURIComponent(next)}` };
  await render(<Login />);
  expect(container.querySelector("h1").textContent).toContain(heading);
  expect(new URL(container.querySelector('[data-testid="login-register-link"]').href).searchParams.get("next")).toBe(next);
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(mockNavigate).toHaveBeenCalledWith(next, { replace: true });
});
test("registration retains the destination on its existing sign-in link", async () => {
  mockLocation = { pathname: "/register", search: "?next=%2Fquiz" };
  await render(<Register />);
  expect(container.querySelector('[data-testid="register-login-link"]').getAttribute("href")).toBe("/login?next=%2Fquiz");
});
test("Google sign-in returns to the same pending task", async () => {
  mockLocation = { pathname: "/login", search: "?next=%2Fdashboard%3Fview%3Dhistory" };
  await render(<GoogleSignInButton />);
  await act(async () => container.querySelector("button").click());
  expect(api.post).toHaveBeenCalledWith("/auth/google", { credential: "test-only-token" });
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?view=history", { replace: true });
});
