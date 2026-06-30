import React, { createContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/apiClient';
import { setGlobalAccessToken } from '../api/apiClient';
import { AuthContextType, User } from '../types';


export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrgSuspended, setIsOrgSuspended] = useState(false);

  /**
   * Restore session on app load.
   * 
   * Strategy:
   * 1. If a refreshToken exists, try the /refresh endpoint for a fresh accessToken.
   * 2. If refresh fails but we still have an accessToken + user data in localStorage
   *    (set by Login.tsx), treat the session as valid until the token actually expires.
   * 3. If nothing is available, the user is unauthenticated.
   */
  const restoreSession = useCallback(async () => {
    try {
      setIsLoading(true);

      const storedAccessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // ── Attempt token refresh ──
      if (refreshToken) {
        try {
          const response = await apiClient.post('/v1/auth/refresh', {
            refreshToken,
          });

          const newAccessToken = response.data.data.accessToken;
          setAccessToken(newAccessToken);

          // Try to restore user from the JSON blob or from individual keys
          const storedUserJson = localStorage.getItem('user');
          if (storedUserJson) {
            setUser(JSON.parse(storedUserJson));
          } else {
            // Login.tsx stores individual keys, reconstruct user from those
            const firstName = localStorage.getItem('userFirstName');
            const email = localStorage.getItem('userEmail');
            const fullName = localStorage.getItem('userFullName');
            const role = localStorage.getItem('userRole') || undefined;
            if (firstName && email) {
              setUser({
                id: '',
                fullName: fullName || firstName,
                email,
                firstName,
                role,
              });
            }
          }
          return; // Session restored successfully via refresh
        } catch {
          // Refresh failed — fall through to localStorage check
        }
      }

      // ── Fallback: restore from localStorage (set by Login.tsx) ──
      if (storedAccessToken) {
        const firstName = localStorage.getItem('userFirstName');
        const email = localStorage.getItem('userEmail');
        const fullName = localStorage.getItem('userFullName');
        const role = localStorage.getItem('userRole') || undefined;

        if (firstName && email) {
          setAccessToken(storedAccessToken);
          setUser({
            id: '',
            fullName: fullName || firstName,
            email,
            firstName,
            role,
          });
          return; // Session restored from localStorage
        }
      }

      // ── No valid session ──
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      // Unexpected error — clear everything
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear user and token on logout
   */
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Call logout endpoint to invalidate refresh token
      if (refreshToken) {
        await apiClient.post('/v1/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Logout endpoint might fail, but we still clear client state
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setIsOrgSuspended(false);
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userFirstName');
      localStorage.removeItem('userLastName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userFullName');
      localStorage.removeItem('linkup_access_token');
    }
  }, []);

  /**
   * On app initialization, attempt to restore the session
   */
  useEffect(() => {
    restoreSession();
  }, []);

  // Sync accessToken to global variable for apiClient
  useEffect(() => {
    setGlobalAccessToken(accessToken);
  }, [accessToken]);

  // Listen for orgSuspended event from apiClient
  useEffect(() => {
    const handler = () => setIsOrgSuspended(true);
    window.addEventListener('orgSuspended', handler);
    return () => window.removeEventListener('orgSuspended', handler);
  }, []);

  // Listen for tokenRefreshed event from apiClient
  useEffect(() => {
    const handler = (e: Event) => {
      const token = (e as CustomEvent).detail?.token;
      if (token) setAccessToken(token);
    };
    window.addEventListener('tokenRefreshed', handler);
    return () => window.removeEventListener('tokenRefreshed', handler);
  }, []);

  // Listen for sessionExpired event from apiClient
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('sessionExpired', handler);
    return () => window.removeEventListener('sessionExpired', handler);
  }, [logout]);

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: user !== null && accessToken !== null,
    isOrgSuspended,
    setIsOrgSuspended,
    setUser,
    setAccessToken,
    restoreSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
