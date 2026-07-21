import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  Bell,
} from "lucide-react";
import { useNotifications } from "./lib/NotificationContext";

// ── nav items ──────────────────────────────────────────────────────────────
const baseNavItems = [
  { to: "/dashboard",    label: "Dashboard",     icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { to: "/candidatures", label: "Candidatures",  icon: <Users           size={18} strokeWidth={1.8} /> },
  { to: "/settings",     label: "Settings",      icon: <Settings        size={18} strokeWidth={1.8} /> },
];

const adminOnlyItems = [
  { to: "/entreprise",   label: "Entreprise",    icon: <Building2      size={18} strokeWidth={1.8} /> },
];

const superAdminNavItems = [
  { to: '/admin/dashboard',      label: 'Dashboard',      icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { to: '/admin/organisations',  label: 'Organisations',  icon: <Building2       size={18} strokeWidth={1.8} /> },
];

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Il y a ${diffDays} j`;
}

// ── page title map ─────────────────────────────────────────────────────────
const pageTitles: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/candidatures":        "Candidatures",
  "/settings":            "Settings",
  "/entreprise":          "Entreprise",
  "/admin/dashboard":     "Dashboard",
  "/admin/organisations": "Organisations",
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
  const { notifications, unreadCount, markAllAsRead, markOneAsRead, openNotification } = useNotifications();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  let pageTitle = pageTitles[location.pathname] ?? "LinkUp";
  if (location.pathname.startsWith("/candidatures/")) {
    pageTitle = "Détail de l'offre";
  }
  if (location.pathname.startsWith("/admin/organisations/")) {
    pageTitle = "Détail de l'organisation";
  }

  // Build nav items based on user role
  const navItems = useMemo(() => {
    const role = user.role || localStorage.getItem("userRole");
    if (role === "SUPER_ADMIN") return superAdminNavItems;
    if (role === "ADMIN") return [...baseNavItems, ...adminOnlyItems];
    return baseNavItems;
  }, [user.role]);

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    // Calculate button position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + 8, // 8px gap
        right: window.innerWidth - rect.right,
      });
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

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

        <header className="lu-topbar flex items-center justify-between">
          <h1 className="lu-page-title">{pageTitle}</h1>
          <button
            ref={buttonRef}
            type="button"
            className="relative rounded-full p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
            onClick={() => setIsDropdownOpen((open) => !open)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && buttonPosition && createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] w-[min(22rem,calc(100vw-2rem))] max-w-[22rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1C2236] p-3 shadow-2xl"
              style={{
                top: `${buttonPosition.top}px`,
                right: `${buttonPosition.right}px`,
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400"
                  onClick={async () => {
                    await markAllAsRead();
                    setIsDropdownOpen(false);
                  }}
                >
                  Tout marquer comme lu
                </button>
              </div>
              <div className="max-h-[min(24rem,70vh)] space-y-2 overflow-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">Aucune notification non lue.</p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-lg border border-slate-100 dark:border-slate-700 p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      onClick={async () => {
                        await markOneAsRead(notification.id);
                        setIsDropdownOpen(false);
                        await openNotification(notification);
                      }}
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notification.message}</p>
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(notification.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body
          )}
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
