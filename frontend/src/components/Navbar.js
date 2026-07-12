import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Shield, Menu, X, Sun, Moon, Search, LogOut, LayoutDashboard, UserRound } from "lucide-react";
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
  { to: "/quiz", label: "Quiz" },
  { to: "/blog", label: "Blog" },
  { to: "/report", label: "Report Scam" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b" data-testid="main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group" data-testid="navbar-logo-link">
          <div className="relative">
            <Shield className="w-7 h-7 text-sky-500" />
            <div className="absolute inset-0 rounded-full bg-sky-500/30 pulse-ring" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">
            Safe<span className="text-sky-500">Net</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-link-${l.to.slice(1)}`}
              className={({ isActive }) =>
                `px-3 py-2 text-sm rounded-md transition-colors duration-200 ${
                  isActive ? "text-sky-500 font-semibold" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} data-testid="navbar-search-button" aria-label="Search">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} data-testid="theme-toggle-button" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="user-menu-button">
                  <UserRound className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="admin-dashboard-menu-item">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Dashboard
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
              className="rounded-full bg-sky-500 hover:bg-sky-600 text-white hidden sm:inline-flex"
              onClick={() => navigate("/login")}
              data-testid="navbar-login-button"
            >
              Login
            </Button>
          )}

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-button" aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1" data-testid="mobile-nav-menu">
          {[...links, { to: "/about", label: "About" }, { to: "/contact", label: "Contact" }].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-md text-sm ${isActive ? "bg-sky-500/10 text-sky-500 font-semibold" : "text-muted-foreground"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {!user && (
            <NavLink to="/login" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-md text-sm text-sky-500 font-semibold">
              Login / Register
            </NavLink>
          )}
        </nav>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};
