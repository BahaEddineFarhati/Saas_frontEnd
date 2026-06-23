import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

// ── nav items ──────────────────────────────────────────────────────────────
const baseNavItems = [
  { to: "/dashboard",    label: "Dashboard",     icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { to: "/candidatures", label: "Candidatures",  icon: <Users           size={18} strokeWidth={1.8} /> },
  { to: "/settings",     label: "Settings",      icon: <Settings        size={18} strokeWidth={1.8} /> },
];

const adminOnlyItems = [
  { to: "/entreprise",   label: "Entreprise",    icon: <Building2      size={18} strokeWidth={1.8} /> },
];

// ── page title map ─────────────────────────────────────────────────────────
const pageTitles: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/candidatures": "Candidatures",
  "/settings":     "Settings",
  "/entreprise":   "Entreprise",
};

interface User { fullName: string; email: string; firstName: string; role?: string; }
interface AuthLayoutProps {
  user: User;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function AuthLayout({ user, onLogout, darkMode, onToggleDark }: AuthLayoutProps) {
  const location = useLocation();
  let pageTitle = pageTitles[location.pathname] ?? "LinkUp";
  if (location.pathname.startsWith("/candidatures/")) {
    pageTitle = "Détail de l'offre";
  }

  // Build nav items based on user role — ADMIN sees Entreprise tab
  const navItems = useMemo(() => {
    const role = user.role || localStorage.getItem("userRole");
    return role === "ADMIN" ? [...baseNavItems, ...adminOnlyItems] : baseNavItems;
  }, [user.role]);

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="lu-shell">

      {/* ── sidebar ── */}
      <aside className="lu-sidebar">

        <nav className="lu-nav" aria-label="Main navigation">
          <ul>
            {navItems.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `lu-nav-item${isActive ? " lu-nav-item--active" : ""}`
                  }
                >
                  <span className="lu-nav-icon" aria-hidden="true">{icon}</span>
                  <span className="lu-nav-label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* dark mode toggle */}
        <button
          className="lu-dark-toggle"
          onClick={onToggleDark}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode
            ? <Sun  size={16} strokeWidth={1.8} />
            : <Moon size={16} strokeWidth={1.8} />
          }
          <span>{darkMode ? "Light mode" : "Dark mode"}</span>
        </button>

        {/* user footer */}
        <div className="lu-sidebar-footer">
          <div className="lu-avatar" aria-hidden="true">{initials}</div>
          <div className="lu-user-info">
            <p className="lu-user-name">{user.fullName}</p>
            <p className="lu-user-email">{user.email}</p>
          </div>
          <button
            className="lu-logout-btn"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      {/* ── main ── */}
      <div className="lu-main">

        <header className="lu-topbar">
          <h1 className="lu-page-title">{pageTitle}</h1>
        </header>

        <main className="lu-content">
          <Outlet context={{ user }} />
        </main>

        {/* footer — only place the LinkUp logo appears */}
        <footer className="lu-footer">
          <img src="../img/logoLinkUP.png" alt="LinkUp logo" className="lu-footer-logo" width="50" height="50" />
          <span className="lu-footer-copy">© {new Date().getFullYear()} All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
}
