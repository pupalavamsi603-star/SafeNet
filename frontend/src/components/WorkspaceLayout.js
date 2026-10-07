import { Link, useLocation, useSearchParams } from "react-router-dom";
import { LayoutDashboard, Link2, QrCode, FileText, Bot, History, BookOpen, LogOut, ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authLink } from "../lib/journey";
import { readDraft, selectResult } from "../lib/scanDraft";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { to: "/ai?tab=url", label: "URL Scanner", icon: Link2, key: "url" },
  { to: "/ai?tab=qr", label: "QR Scanner", icon: QrCode, key: "qr" },
  { to: "/ai?tab=detect", label: "Message Scanner", icon: FileText, key: "detect" },
  { to: "/ai?tab=chat", label: "Ask AI", icon: Bot, key: "chat" },
  { to: "/dashboard?view=history", label: "History", icon: History, key: "history" },
  { to: "/scams", label: "Learn", icon: BookOpen, key: "learn" },
];

export function WorkspaceLayout({ children }) {
  const { pathname, search } = useLocation();
  const [params] = useSearchParams();
  const { user, logout } = useAuth();
  if (!["/ai", "/dashboard"].includes(pathname)) return children;
  const requested = params.get("tab");
  const tool = ["url", "qr", "detect", "chat"].includes(requested) ? requested : params.has("session") ? "chat" : "url";
  const active = pathname === "/ai" ? tool : pathname === "/dashboard" ? (params.get("view") === "history" ? "history" : "dashboard") : "about";
  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar" aria-label="SafeNet workspace">
        <nav className="desktop-workspace-nav" aria-label="Application navigation">{items.map(({ to, label, icon: Icon, key }) => <div key={key}>{key === "url" && <p className="sidebar-caption">SCAN</p>}{key === "chat" && <hr className="sidebar-divider" />}<Link to={to} className={`sidebar-link ${active === key ? "is-active" : ""}`} aria-current={active === key ? "page" : undefined}><Icon size={17} aria-hidden="true" /><span>{label}</span></Link></div>)}</nav>
        <details className="workspace-mobile-nav" key={active}><summary><LayoutDashboard size={17} aria-hidden="true" /><span><strong>{items.find((item) => item.key === active)?.label}</strong> · Switch tool or view</span></summary><nav aria-label="Mobile application navigation">{items.map(({ to, label, icon: Icon, key }) => <Link key={key} to={to} onKeyDown={(event) => { if (event.key === "Escape") { const menu = event.currentTarget.closest("details"); if (menu) { event.preventDefault(); menu.open = false; menu.querySelector("summary")?.focus(); } } }} className={`sidebar-link ${active === key ? "is-active" : ""}`} aria-current={active === key ? "page" : undefined}><Icon size={17} aria-hidden="true" />{label}</Link>)}</nav></details>
        <div className="sidebar-bottom">
          <Link to="/report" className="sidebar-report">Report a scam <ArrowUpRight size={15} aria-hidden="true" /></Link>
          {user ? <><div className="sidebar-account"><span>{user.name?.slice(0, 1)?.toUpperCase() || "U"}</span><div><strong>{user.name}</strong><small>Personal account</small></div></div><button type="button" className="sidebar-signout" onClick={logout}><LogOut size={16} aria-hidden="true" /> Sign out</button></> : <Link className="sidebar-signin" to={authLink("login", pathname + search)} onClick={() => { if (pathname === "/ai" && readDraft(tool)?.input) selectResult(tool); }}>Sign in for message and QR history <ArrowUpRight size={15} aria-hidden="true" /></Link>}
        </div>
      </aside>
      <div className="workspace-content">{children}</div>
    </div>
  );
}
