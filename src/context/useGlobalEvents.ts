import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { setGlobalAccessToken } from '../api/apiClient';

/**
 * Hook to listen for global authentication events
 * Handles token refresh and session expiration across the app
 */
export const useGlobalAuthEvents = () => {
  const { setAccessToken, logout } = useAuth();

  useEffect(() => {
    /**
     * Handle token refresh events from API interceptor
     */
    const handleTokenRefreshed = (event: CustomEvent) => {
      const { token } = event.detail;
      setAccessToken(token);
      setGlobalAccessToken(token);
    };

    /**
     * Handle session expired events
     */
    const handleSessionExpired = async () => {
      await logout();
    };

    window.addEventListener('tokenRefreshed' as any, handleTokenRefreshed);
    window.addEventListener('sessionExpired' as any, handleSessionExpired);

    return () => {
      window.removeEventListener('tokenRefreshed' as any, handleTokenRefreshed);
      window.removeEventListener('sessionExpired' as any, handleSessionExpired);
    };
  }, [setAccessToken, logout]);
};
