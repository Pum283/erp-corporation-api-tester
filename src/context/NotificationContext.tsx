import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { createNotificationHubConnection } from '../api/signalr';
import { notificationsApi } from '../api/services';
import { DEFAULT_PAGE_SIZE } from '../api/pagination';
import { useAuth } from './AuthContext';
import type { UserNotificationDto } from '../types/entities';

interface NotificationContextValue {
  unreadCount: number;
  items: UserNotificationDto[];
  loading: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<UserNotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [list, countRes] = await Promise.all([
        notificationsApi.list({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
        notificationsApi.unreadCount(),
      ]);
      setItems(list.items);
      setUnreadCount(countRes.count);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markRead = useCallback(async (id: string) => {
    const updated = await notificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
    setUnreadCount((c) => Math.max(0, c - (updated.isRead ? 1 : 0)));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    refresh().catch(() => undefined);

    const connection = createNotificationHubConnection(
      (payload) => {
        setItems((prev) => {
          const exists = prev.some((n) => n.id === payload.notification.id);
          if (exists) return prev;
          return [payload.notification, ...prev].slice(0, 30);
        });
        setUnreadCount(payload.unreadCount);
      },
      (count) => setUnreadCount(count),
    );

    connectionRef.current = connection;
    connection.start().catch(() => undefined);

    return () => {
      connection.stop().catch(() => undefined);
      connectionRef.current = null;
    };
  }, [isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      unreadCount,
      items,
      loading,
      panelOpen,
      setPanelOpen,
      refresh,
      markRead,
      markAllRead,
    }),
    [unreadCount, items, loading, panelOpen, refresh, markRead, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
