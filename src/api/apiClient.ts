import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

const getAccessToken = (): string | null => {
  return (globalThis as any).__auth_access_token || null;
};

export const setGlobalAccessToken = (token: string | null) => {
  (globalThis as any).__auth_access_token = token;
};

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 403) {
      const code = (error.response.data as any)?.code;
      if (code === 'ORG_SUSPENDED') {
        window.dispatchEvent(new CustomEvent('orgSuspended'));
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (isRefreshing) {
          const newToken = await refreshPromise;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        }

        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const response = await axios.post(
              `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/v1/auth/refresh`,
              {},
              { withCredentials: true }
            );
            const newAccessToken = response.data.accessToken;
            setGlobalAccessToken(newAccessToken);
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
        window.dispatchEvent(new CustomEvent('sessionExpired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);