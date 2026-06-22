import React, { createContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/apiClient';
import { AuthContextType, User } from '../types';


export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Restore session by calling the refresh endpoint
   * This is called on app load to check if the user has an active session
   */
  const restoreSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const refreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');
      
      // If no refresh token, user is not authenticated
      if (!refreshToken) {
        setUser(null);
        setAccessToken(null);
        return;
      }

      const response = await apiClient.post('/v1/auth/refresh', {
        refreshToken,
      });
      
      // Set the new access token in memory
      setAccessToken(response.data.data.accessToken);
      
      // Parse and set the user from localStorage
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      // Session restoration failed - user is unauthenticated
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
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('accessToken');
    }
  }, []);

  /**
   * On app initialization, attempt to restore the session
   */
  useEffect(() => {
    restoreSession();
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: user !== null && accessToken !== null,
    setUser,
    setAccessToken,
    restoreSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
