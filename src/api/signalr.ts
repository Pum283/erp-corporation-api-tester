import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import type { RealtimeNotificationPayload } from '../types/entities';
import { getToken } from '../lib/storage';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7001').replace(/\/$/, '');

export const HUB_PATH = '/hubs/notifications';
export const RECEIVE_NOTIFICATION = 'ReceiveNotification';
export const UNREAD_COUNT_UPDATED = 'UnreadCountUpdated';

export function createNotificationHubConnection(
  onNotification: (payload: RealtimeNotificationPayload) => void,
  onUnreadCount: (count: number) => void,
): HubConnection {
  const connection = new HubConnectionBuilder()
    .withUrl(`${API_BASE}${HUB_PATH}`, {
      accessTokenFactory: () => getToken() ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on(RECEIVE_NOTIFICATION, (payload: RealtimeNotificationPayload) => {
    onNotification(payload);
  });

  connection.on(UNREAD_COUNT_UPDATED, (count: number) => {
    onUnreadCount(count);
  });

  return connection;
}
