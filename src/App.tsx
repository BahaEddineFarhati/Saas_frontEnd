import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthLayout from "./AuthLayout";
import DashboardPage from "./DashboardPage";
import CandidaturesPage from "./CandidaturesPage";
import SettingsPage from "./SettingsPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GuestRoute from "./components/GuestRoute";
import ProtectedRoute from "./components/ProtectedRoute";

import "./auth-layout.css";

const DARK_KEY = "linkup_dark";

function loadDark(): boolean {
  const stored = localStorage.getItem(DARK_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Hardcoded prototype user — replace with real auth later (SCRUM-9)
const PROTOTYPE_USER = {
  fullName: "Farhati Baha",
  email: "Baha@linkup.com",
  firstName: "Baha",
};

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(loadDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem(DARK_KEY, String(darkMode));
  }, [darkMode]);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  }

  return (
    <BrowserRouter>
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
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AuthLayout
                user={PROTOTYPE_USER}
                onLogout={handleLogout}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode((d) => !d)}
              />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/candidatures" element={<CandidaturesPage />} />
          <Route path="/settings"     element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
