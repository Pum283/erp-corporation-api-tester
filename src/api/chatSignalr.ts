import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import { getToken } from '../lib/storage';
import type { MessageDto, MessageReactionDto } from '../types/entities';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7001').replace(/\/$/, '');
export const CHAT_HUB_PATH = '/hubs/chat';

export interface ChatHubCallbacks {
  onReceiveMessage: (msg: MessageDto) => void;
  onMessageEdited: (msg: MessageDto) => void;
  onMessageDeleted: (id: string) => void;
  onReactionToggled: (reaction: MessageReactionDto) => void;
  onTypingStatus?: (conversationId: string, userId: string, fullName: string, isTyping: boolean) => void;
}

export function createChatHubConnection(callbacks: ChatHubCallbacks): HubConnection {
  const connection = new HubConnectionBuilder()
    .withUrl(`${API_BASE}${CHAT_HUB_PATH}`, {
      accessTokenFactory: () => getToken() ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on('ReceiveMessage', (msg: MessageDto) => {
    callbacks.onReceiveMessage(msg);
  });

  connection.on('MessageEdited', (msg: MessageDto) => {
    callbacks.onMessageEdited(msg);
  });

  connection.on('MessageDeleted', (id: string) => {
    callbacks.onMessageDeleted(id);
  });

  connection.on('ReactionToggled', (reaction: MessageReactionDto) => {
    callbacks.onReactionToggled(reaction);
  });

  if (callbacks.onTypingStatus) {
    connection.on('ReceiveTypingStatus', (conversationId: string, userId: string, fullName: string, isTyping: boolean) => {
      callbacks.onTypingStatus!(conversationId, userId, fullName, isTyping);
    });
  }

  return connection;
}
