import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Shield, Menu, X, Sun, Moon, Search, LogOut, LayoutDashboard, UserRound, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { SearchDialog } from "./SearchDialog";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const links = [
  { to: "/scams", label: "Scam Types" },
  { to: "/tips", label: "Safety Tips" },
  { to: "/ai", label: "AI Assistant" },
  { to: "/report", label: "Report Scam" },
];

// True once the page has scrolled past the hero's very top. Drives the
// navbar's shift from flush-and-transparent to a floating, bordered bar.
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

// The hero is always dark regardless of theme, and the navbar is pulled over
// it. Track whether the bar currently overlaps it so we can style for a dark
// backdrop instead of following the theme (in light mode the logo scored 1.13
// contrast against the hero — effectively invisible).
function useOverDarkHero() {
  const { pathname } = useLocation();
  const [over, setOver] = useState(false);

  useEffect(() => {
    const compute = () => {
      const hero = document.getElementById("hero");
      if (!hero) { setOver(false); return; }
      // 80px ~= the navbar band plus its floating offset
      setOver(hero.getBoundingClientRect().bottom > 80);
    };
    compute();
    const raf = requestAnimationFrame(compute); // hero may mount a tick later
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [pathname]);

  return over;
}

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const scrolled = useScrolled();
  const overHero = useOverDarkHero();

  // The mobile sheet needs a solid surface even when the bar is transparent.
  const solid = scrolled || open;
  // Force light-on-dark while the bar overlaps the hero; the sheet is opaque
  // so it goes back to theme colours.
  const onDark = overHero && !open;

  const linkIdle = onDark ? "text-slate-300 hover:text-white" : "text-muted-foreground hover:text-foreground";
  const linkActive = onDark ? "bg-white/15 text-white font-medium" : "bg-white/10 text-foreground font-medium";
  const iconBtn = onDark ? "text-slate-200 hover:text-white hover:bg-white/10" : "";

  return (
    <header
      className="sticky top-0 z-50 transition-[padding] duration-300 ease-out"
      style={{ paddingTop: solid ? "0.75rem" : "0rem", paddingLeft: solid ? "0.75rem" : "0rem", paddingRight: solid ? "0.75rem" : "0rem" }}
      data-testid="main-navbar"
      data-scrolled={scrolled ? "true" : "false"}
    >
      <div
        className={`mx-auto transition-all duration-300 ease-out ${
          solid
            ? `max-w-7xl rounded-2xl backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${onDark ? "bg-slate-950/80" : "bg-background/90"}`
            : "max-w-none rounded-none bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-16 gap-4">
          <div className="flex-1 flex justify-start min-w-0">
          <Link to="/" className="flex items-center gap-2 group shrink-0" data-testid="navbar-logo-link">
            <div className="relative">
              <Shield className="w-7 h-7 text-sky-500" />
              <div className="absolute inset-0 rounded-full bg-sky-500/30 pulse-ring" />
            </div>
            <span className={`font-heading font-bold text-lg tracking-tight ${onDark ? "text-white" : ""}`}>
              Safe<span className="text-sky-500">Net</span>
            </span>
          </Link>
          </div>

          {/* centred pill nav — flanked by equal-width rails so it lands on the
              true centre line regardless of logo or action-button widths */}
          <nav className="hidden lg:flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-1.5 py-1.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                data-testid={`nav-link-${l.to.slice(1)}`}
                className={({ isActive }) =>
                  `px-4 py-1.5 text-sm rounded-full transition-colors duration-200 ${
                    isActive ? `${linkActive} shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]` : linkIdle
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
            <Button variant="ghost" size="icon" className={`rounded-full ${iconBtn}`} onClick={() => setSearchOpen(true)} data-testid="navbar-search-button" aria-label="Search">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className={`rounded-full ${iconBtn}`} onClick={toggle} data-testid="theme-toggle-button" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={`rounded-full gap-2 ${onDark ? "border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white" : ""}`} data-testid="user-menu-button">
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
                className="rounded-full bg-sky-500 hover:bg-sky-600 text-white hidden sm:inline-flex gap-1.5 px-5"
                onClick={() => navigate("/login")}
                data-testid="navbar-login-button"
              >
                Get Protected <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={`lg:hidden rounded-full ${iconBtn}`}
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
          <nav id="mobile-nav-menu" className="lg:hidden border-t border-white/10 px-4 py-3 space-y-1 rounded-b-2xl" data-testid="mobile-nav-menu">
            {[...links, { to: "/about", label: "About" }, { to: "/contact", label: "Contact" }].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-sky-500/10 text-sky-500 font-semibold" : "text-muted-foreground"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {!user && (
              <NavLink to="/login" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-sky-500 font-semibold">
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
