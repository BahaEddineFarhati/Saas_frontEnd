import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { useGlobalAuthEvents } from "./context/useGlobalEvents";
import { ProtectedRoute } from "./components/ProtectedRoute";

import AuthLayout from "./AuthLayout";
import DashboardPage from "./DashboardPage";
import CandidaturesPage from "./CandidaturesPage";
import SettingsPage from "./SettingsPage";

import "./auth-layout.css";

const DARK_KEY = "linkup_dark";

function loadDark(): boolean {
  const stored = localStorage.getItem(DARK_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Login page placeholder
 * Replace with actual login form implementation
 */
function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Linkup Recruitment
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Login page — implement your login form here
        </p>
      </div>
    </div>
  );
}

/**
 * Main app content component
 * Handles routing and dark mode
 */
function AppContent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(loadDark);

  // Listen for global auth events (token refresh, session expiration)
  useGlobalAuthEvents();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem(DARK_KEY, String(darkMode));
  }, [darkMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {isAuthenticated && user && (
        <Route
          element={
            <AuthLayout
              user={user}
              onLogout={logout}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
            />
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/candidatures" element={<CandidaturesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      )}
      {!isAuthenticated && (
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />
      )}
      {!isAuthenticated && (
        <Route path="/candidatures" element={<Navigate to="/login" replace />} />
      )}
      {!isAuthenticated && (
        <Route path="/settings" element={<Navigate to="/login" replace />} />
      )}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
