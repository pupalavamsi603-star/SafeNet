import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Shield, Menu, X, Search, LogOut, LayoutDashboard, UserRound, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SearchDialog } from "./SearchDialog";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const links = [
  { to: "/", label: "Home" },
  { to: "/scams", label: "Scam Types" },
  { to: "/tips", label: "Safety Tips" },
  { to: "/ai", label: "AI Assistant" },
  { to: "/report", label: "Report Scam" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  const linkIdle = "text-muted-foreground hover:text-primary";
  const linkActive = "bg-primary/10 text-primary font-semibold";

  return (
    <header
      className="app-header sticky top-0 z-50"
      style={{
        // Constant geometry. Transitioning padding here and max-width below meant
        // every frame of the scroll transition reflowed the page, which is what
        // made the bar visibly shift. Only paint properties animate now.
        // --safe-top is 0px on the web and the Android status-bar inset in the APK.
        paddingTop: `calc(0.75rem + var(--safe-top, 0px))`,
        paddingLeft: "0.75rem",
        paddingRight: "0.75rem",
      }}
      data-testid="main-navbar"
    >
      <div
        data-solid="true"
        className="app-header__bar mx-auto max-w-7xl rounded-2xl border bg-background/95 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-16 gap-4">
          <div className="flex-1 flex justify-start min-w-0">
          <Link to="/" className="flex items-center gap-2 group shrink-0" data-testid="navbar-logo-link">
            <div className="relative">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">
              Safe<span className="text-primary">Net</span>
            </span>
          </Link>
          </div>

          {/* Equal-width rails keep the navigation centered. */}
          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-0.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                data-testid={`nav-link-${l.to.slice(1) || "home"}`}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                    isActive ? `${linkActive} shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]` : linkIdle
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
            <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => setSearchOpen(true)} data-testid="navbar-search-button" aria-label="Search">
              <Search className="w-4 h-4" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-lg gap-2" data-testid="user-menu-button">
                    <UserRound className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="dashboard-menu-item">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="admin-dashboard-menu-item">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout} data-testid="logout-menu-item">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:inline-flex gap-1.5 px-5"
                onClick={() => navigate("/login")}
                data-testid="navbar-login-button"
              >
                Sign in <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-lg"
              onClick={() => setOpen(!open)}
              data-testid="mobile-menu-button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav-menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <nav aria-label="Mobile navigation" id="mobile-nav-menu" className="lg:hidden border-t border-white/10 px-4 py-3 space-y-1 rounded-b-2xl" data-testid="mobile-nav-menu">
            {[...links, { to: "/about", label: "About" }, { to: "/contact", label: "Contact" }].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-sky-500/10 text-primary font-semibold" : "text-muted-foreground"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {!user && (
              <NavLink to="/login" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-primary font-semibold">
                Login / Register
              </NavLink>
            )}
          </nav>
        )}
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};
