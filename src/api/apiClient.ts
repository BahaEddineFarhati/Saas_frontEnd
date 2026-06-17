import axios, { AxiosError, AxiosResponse } from 'axios';

// Create axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true, // Include httpOnly cookies in requests
});

// Track if we're already refreshing to avoid multiple refresh calls
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Get the access token from the AuthContext
 * We need to import it dynamically to avoid circular dependencies
 */
const getAccessToken = (): string | null => {
  // This will be set by the interceptor setup after AuthProvider is mounted
  return (globalThis as any).__auth_access_token || null;
};

/**
 * Set the access token in a global variable
 * Called from AuthContext when token is updated
 */
export const setGlobalAccessToken = (token: string | null) => {
  (globalThis as any).__auth_access_token = token;
};

/**
 * Request interceptor: attach access token to every request
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: handle 401 and refresh token
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If response is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If we're already refreshing, wait for that promise
        if (isRefreshing) {
          const newToken = await refreshPromise;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        }

        // Start refresh
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const response = await axios.post(
              `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
              {},
              { withCredentials: true }
            );

            const newAccessToken = response.data.accessToken;
            
            // Update global token
            setGlobalAccessToken(newAccessToken);
            
            // Update AuthContext token via event
            window.dispatchEvent(
              new CustomEvent('tokenRefreshed', { detail: { token: newAccessToken } })
            );

            return newAccessToken;
          } finally {
            isRefreshing = false;
            refreshPromise = null;
          }
        })();

        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - dispatch logout event
        window.dispatchEvent(new CustomEvent('sessionExpired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
