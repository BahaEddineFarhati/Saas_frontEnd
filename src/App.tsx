import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import AuthLayout from "./AuthLayout";
import DashboardPage from "./DashboardPage";
import CandidaturesPage from "./CandidaturesPage";
import JobDetailPage from "./pages/JobDetailPage";
import SettingsPage from "./SettingsPage";
import EntreprisePage from "./pages/EntreprisePage";
import Login from "./pages/Login";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import GuestRoute from "./components/GuestRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import "./auth-layout.css";

const DARK_KEY = "linkup_dark";

function loadDark(): boolean {
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
    fullName: localStorage.getItem("userFullName") || "Farhati Baha",
    email: localStorage.getItem("userEmail") || "Baha@linkup.com",
    firstName: localStorage.getItem("userFirstName") || "Baha",
    role: localStorage.getItem("userRole") || "RECRUITER",
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
  const token = localStorage.getItem("accessToken");
  const location = useLocation();

  useEffect(() => {
    if (!token) return;

    const fetchProfile = () => {
      fetch("http://localhost:3001/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch user profile");
          return res.json();
        })
        .then((resData) => {
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
          console.error("Profile sync error:", err);
        });
    };

    // Run immediately on page load or navigation
    fetchProfile();

    // Poll every 5 seconds in the background to catch instant promotions/demotions
    const intervalId = setInterval(fetchProfile, 5000);

    return () => clearInterval(intervalId);
  }, [token, location.pathname]);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("linkup_access_token");
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("userLastName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
    window.location.href = "/login";
  }

  return (
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
        path="/accept-invite"
        element={
          <GuestRoute>
            <AcceptInvitePage />
          </GuestRoute>
        }
      />

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

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(loadDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem(DARK_KEY, String(darkMode));
  }, [darkMode]);

  return (
    <BrowserRouter>
      <AppContent
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
    </BrowserRouter>
  );
}
