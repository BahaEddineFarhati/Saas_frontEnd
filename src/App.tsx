import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

import AuthLayout from "./AuthLayout";
import DashboardPage from "./pages/DashboardPage";
import CandidaturesPage from "./CandidaturesPage";
import JobDetailPage from "./pages/JobDetailPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import SettingsPage from "./SettingsPage";
import EntreprisePage from "./pages/EntreprisePage";
import Login from "./pages/Login";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GuestRoute from "./components/GuestRoute";
import AdminRoute from "./components/AdminRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import SuspensionModal from "./components/SuspensionModal";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganisations from "./pages/admin/AdminOrganisations";
import AdminOrgDetail from "./pages/admin/AdminOrgDetail";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { NotificationProvider } from "./lib/NotificationContext";
import { ToastViewport } from "./components/ui/Toast";
import AIChatButton from "./components/ui/AIChatButton";

import "./auth-layout.css";
import "./components/ui/ai-chat-widget.css";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { API_BASE_URL } from "./config/api";

const DARK_KEY = "linkup_dark";

function loadDark(): boolean {
  // The inline script in index.html already applies the 'dark' class before
  // React mounts. Check the DOM first to stay in sync and avoid a flash.
  if (document.documentElement.classList.contains('dark')) return true;
  const stored = localStorage.getItem(DARK_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

interface AppUser {
  fullName: string;
  email: string;
  firstName: string;
  role?: string;
}

function getStoredUser(): AppUser {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return {
      fullName: "",
      email: "",
      firstName: "",
      role: "",
    };
  }
  return {
    fullName: localStorage.getItem("userFullName") || "UNKNOWN USER",
    email: localStorage.getItem("userEmail") || "UNKNOWN EMAIL USER",
    firstName: localStorage.getItem("userFirstName") || "UNKNOWN",
    role: localStorage.getItem("userRole") || "UNKNOWN",
  };
}

function AppContent({
  darkMode,
  onToggleDark,
}: {
  darkMode: boolean;
  onToggleDark: () => void;
}) {
  const [user, setUser] = useState<AppUser>(getStoredUser);
  const { accessToken, logout, isAuthenticated, isOrgSuspended } = useAuth();
  const location = useLocation();

  // Stable logout ref to avoid re-triggering effects
  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  useEffect(() => {
    // Only fetch profile when authenticated (AuthContext has a valid token)
    if (!isAuthenticated || !accessToken) return;

    let cancelled = false;

    const fetchProfile = () => {
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((res) => {
          if (cancelled) return;
          if (res.status === 401) {
            // Token expired — log out via AuthContext (no window.location!)
            handleLogout();
            return;
          }
          if (res.status === 403) {
            res.json().then((data) => {
              if (data?.error?.code === "ORG_SUSPENDED" || data?.code === "ORG_SUSPENDED") {
                window.dispatchEvent(new CustomEvent("orgSuspended"));
              }
            }).catch(() => {});
            return;
          }
          if (!res.ok) throw new Error("Failed to fetch user profile");
          return res.json();
        })
        .then((resData) => {
          if (cancelled || !resData) return;
          if (resData.success && resData.data?.user) {
            const u = resData.data.user;
            setUser((prev) => {
              // Only update state if something changed to prevent unnecessary re-renders
              if (
                prev.role !== u.role ||
                prev.email !== u.email ||
                prev.fullName !== u.fullName
              ) {
                localStorage.setItem("userRole", u.role);
                localStorage.setItem("userFirstName", u.firstName);
                localStorage.setItem("userLastName", u.lastName);
                localStorage.setItem("userEmail", u.email);
                localStorage.setItem("userFullName", u.fullName);
                return {
                  fullName: u.fullName,
                  email: u.email,
                  firstName: u.firstName,
                  role: u.role,
                };
              }
              return prev;
            });
          }
        })
        .catch((err) => {
          if (!cancelled) console.error("Profile sync error:", err);
        });
    };

    // Run immediately on page load or navigation
    fetchProfile();

    // Poll every 5 seconds in the background to catch instant promotions/demotions
    const intervalId = setInterval(fetchProfile, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [accessToken, isAuthenticated, location.pathname, handleLogout]);

  return (
    <>
      {isOrgSuspended && <SuspensionModal />}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <ForgotPassword />
            </GuestRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <GuestRoute>
              <ResetPassword />
            </GuestRoute>
          }
        />
        <Route
          path="/accept-invite"
          element={<AcceptInvitePage />}
        />

        {/* ── Client-facing routes (blocked for SUPER_ADMIN) ── */}
        <Route
          element={
            <ProtectedRoute>
              <AuthLayout
                user={user}
                onLogout={handleLogout}
                darkMode={darkMode}
                onToggleDark={onToggleDark}
              />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard"        element={<DashboardPage />} />
          <Route path="/candidatures"     element={<CandidaturesPage />} />
          <Route path="/candidatures/:jobId/candidats/:candidateId" element={<CandidateDetailPage />} />
          <Route path="/candidatures/:id" element={<JobDetailPage />} />
          <Route path="/settings"         element={<SettingsPage />} />
          <Route
            path="/entreprise"
            element={
              <AdminRoute>
                <EntreprisePage />
              </AdminRoute>
            }
          />
        </Route>

        {/* ── Super admin routes ── */}
        <Route
          element={
            <SuperAdminRoute>
              <AuthLayout
                user={user}
                onLogout={handleLogout}
                darkMode={darkMode}
                onToggleDark={onToggleDark}
              />
            </SuperAdminRoute>
          }
        >
          <Route path="/admin/dashboard"          element={<AdminDashboard />} />
          <Route path="/admin/organisations"      element={<AdminOrganisations />} />
          <Route path="/admin/organisations/:orgId" element={<AdminOrgDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <AIChatButton />
    </>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(loadDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem(DARK_KEY, String(darkMode));
    // Clear the inline background-color set in index.html (FOUC prevention)
    // so the CSS variable from auth-layout.css takes over for runtime toggles.
    document.body.style.backgroundColor = "";
  }, [darkMode]);

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <AppContent
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
            />
            <ToastViewport />
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
