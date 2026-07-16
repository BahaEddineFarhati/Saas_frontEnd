import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/apiClient';

interface NotificationItem {
  id: string;
  type: 'JOB_PARSING_COMPLETED' | 'JOB_PARSING_FAILED';
  title: string;
  message: string;
  jobOpeningId: string;
  jobOpeningTitle: string;
  read: boolean;
  createdAt: string;
}

interface ToastItem {
  id: string;
  notification: NotificationItem;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastItem[];
  markAllAsRead: () => Promise<void>;
  markOneAsRead: (id: string) => Promise<void>;
  dismissToast: (id: string) => void;
  openNotification: (notification: NotificationItem) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const fetchNotifications = async (): Promise<NotificationItem[]> => {
  const response = await apiClient.get('/notifications');
  return response.data.data ?? [];
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [queuedToasts, setQueuedToasts] = useState<ToastItem[]>([]);
  const [isTabVisible, setIsTabVisible] = useState(document.visibilityState !== 'hidden');
  const previousNotificationsRef = useRef<NotificationItem[]>([]);
  const toastCounterRef = useRef(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState !== 'hidden');
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: isAuthenticated && Boolean(accessToken) && isTabVisible,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !isTabVisible) {
      setNotifications([]);
      previousNotificationsRef.current = [];
      return;
    }

    const nextNotifications = data ?? [];
    const previousNotifications = previousNotificationsRef.current;
    const newItems = nextNotifications.filter((item) => !previousNotifications.some((previous) => previous.id === item.id));

    if (newItems.length > 0) {
      const currentPath = location.pathname;
      const visibleNewItems = newItems.filter(
        (item) => currentPath !== `/candidatures/${item.jobOpeningId}` && !currentPath.startsWith(`/candidatures/${item.jobOpeningId}/`)
      );

      setToasts((current) => {
        const incoming = visibleNewItems.slice(0, Math.max(0, 3 - current.length));
        const remaining = visibleNewItems.slice(incoming.length);
        setQueuedToasts((queued) => [...queued, ...remaining.map((notification) => ({ id: `toast-${++toastCounterRef.current}-${notification.id}`, notification }))]);
        return [
          ...current,
          ...incoming.map((notification) => ({ id: `toast-${++toastCounterRef.current}-${notification.id}`, notification })),
        ].slice(-3);
      });
    }

    setNotifications(nextNotifications);
    previousNotificationsRef.current = nextNotifications;
  }, [accessToken, data, isAuthenticated, isTabVisible, location.pathname]);

  useEffect(() => {
    if (toasts.length >= 3 || queuedToasts.length === 0) return;
    const nextToast = queuedToasts[0];
    setQueuedToasts((current) => current.slice(1));
    setToasts((current) => [...current, nextToast].slice(-3));
  }, [queuedToasts, toasts.length]);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 6000)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  const markAllAsRead = useCallback(async () => {
    await apiClient.patch('/notifications/read-all');
    setNotifications([]);
    setToasts([]);
    setQueuedToasts([]);
  }, []);

  const markOneAsRead = useCallback(async (id: string) => {
    await apiClient.patch(`/notifications/${id}/read`);
    setNotifications((current) => current.filter((item) => item.id !== id));
    setToasts((current) => current.filter((toast) => toast.notification.id !== id));
    setQueuedToasts((current) => current.filter((toast) => toast.notification.id !== id));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const openNotification = useCallback(async (notification: NotificationItem) => {
    await markOneAsRead(notification.id);
    navigate(`/candidatures/${notification.jobOpeningId}`);
  }, [markOneAsRead, navigate]);

  const unreadCount = notifications.length;

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    toasts,
    markAllAsRead,
    markOneAsRead,
    dismissToast,
    openNotification,
  }), [dismissToast, markAllAsRead, markOneAsRead, notifications, openNotification, toasts, unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
