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
      const response = await apiClient.post('/v1/auth/refresh');
      
      // Set the new access token in memory
      setAccessToken(response.data.accessToken);
      
      // Set the user object from the response
      setUser(response.data.user);
    } catch (error) {
      // Session restoration failed - user is unauthenticated
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear user and token on logout
   */
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint to invalidate refresh token in httpOnly cookie
      await apiClient.post('/v1/auth/logout');
    } catch (error) {
      // Logout endpoint might fail, but we still clear client state
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  /**
   * On app initialization, attempt to restore the session
   */
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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
