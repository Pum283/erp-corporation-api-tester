import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { conversationsApi, messagesApi, usersApi, tasksApi } from '../api/services';
import { createChatHubConnection } from '../api/chatSignalr';
import type { HubConnection } from '@microsoft/signalr';
import type { ConversationDto, MessageDto, UserDto } from '../types/entities';
import './ChatPage.css';

export function ChatPage() {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);

  // Search and forms
  const [searchText, setSearchText] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageDto | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageDto | null>(null);
  
  // Modals state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateDirectModal, setShowCreateDirectModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskMessageSource, setTaskMessageSource] = useState<MessageDto | null>(null);

  // Group creation form
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupIsPrivate, setGroupIsPrivate] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Task creation form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [taskType, setTaskType] = useState<'Normal' | 'Recurring' | 'Project' | 'Onboarding' | 'Offboarding' | 'Training'>('Normal');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstimatedHours, setTaskEstimatedHours] = useState<number>(0);
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [taskPrimaryAssignee, setTaskPrimaryAssignee] = useState<string>('');
  const [taskFollowers, setTaskFollowers] = useState<string[]>([]);

  // Typing status and connections
  const [typingUsers, setTypingUsers] = useState<{ [convId: string]: { [userId: string]: string } }>({});
  const connectionRef = useRef<HubConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Load conversations and users
  useEffect(() => {
    loadConversations();
    usersApi.listAll().then((list) => setUsers(list));
  }, []);

  const loadConversations = () => {
    conversationsApi.list().then((list) => setConversations(list));
  };

  // Connect to SignalR
  useEffect(() => {
    const conn = createChatHubConnection({
      onReceiveMessage: (msg) => {
        if (activeConversation && msg.conversationID === activeConversation.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          messagesApi.markAsRead(activeConversation.id);
        }
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === msg.conversationID) {
              const isMine = msg.userID === currentUserId;
              return {
                ...c,
                lastMessage: msg,
                unreadCount: isMine || (activeConversation && activeConversation.id === c.id) ? c.unreadCount : c.unreadCount + 1,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          }).sort((a, b) => new Date(b.updatedAt || a.createdAt).getTime() - new Date(a.updatedAt || b.createdAt).getTime())
        );
      },
      onMessageEdited: (msg) => {
        if (activeConversation && msg.conversationID === activeConversation.id) {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === msg.conversationID && c.lastMessage?.id === msg.id) {
              return { ...c, lastMessage: msg };
            }
            return c;
          })
        );
      },
      onMessageDeleted: (id) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === id) {
              return { ...m, isDeleted: true, content: 'Tin nhắn đã bị thu hồi.' };
            }
            return m;
          })
        );
      },
      onReactionToggled: (reaction) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === reaction.messageID) {
              const reactions = [...m.reactions];
              const idx = reactions.findIndex((r) => r.userID === reaction.userID && r.reactionType === reaction.reactionType);
              if (reaction.reactionType === '') {
                return { ...m, reactions: reactions.filter((r) => r.userID !== reaction.userID) };
              }
              if (idx > -1) {
                reactions[idx] = reaction;
              } else {
                reactions.push(reaction);
              }
              return { ...m, reactions };
            }
            return m;
          })
        );
      },
      onTypingStatus: (convId, userId, fullName, isTyping) => {
        if (userId === currentUserId) return;
        setTypingUsers((prev) => {
          const convTyping = { ...(prev[convId] || {}) };
          if (isTyping) {
            convTyping[userId] = fullName;
          } else {
            delete convTyping[userId];
          }
          return { ...prev, [convId]: convTyping };
        });
      },
    });

    conn.start()
      .then(() => {
        connectionRef.current = conn;
        if (activeConversation) {
          conn.invoke('JoinConversation', activeConversation.id);
        }
      })
      .catch((err) => console.error('SignalR ChatHub connection error: ', err));

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [activeConversation, currentUserId]);

  // Handle changing conversation
  useEffect(() => {
    if (activeConversation) {
      messagesApi.list(activeConversation.id).then((list) => {
        setMessages(list);
        messagesApi.markAsRead(activeConversation.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, unreadCount: 0 } : c))
        );
      });
      if (connectionRef.current) {
        connectionRef.current.invoke('JoinConversation', activeConversation.id);
      }
    }
  }, [activeConversation]);

  // Scroll to bottom when new messages arrive or active conversation / typing status changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConversation?.id, typingUsers[activeConversation?.id || '']]);

  const handleSelectConversation = (conv: ConversationDto) => {
    if (activeConversation && connectionRef.current) {
      connectionRef.current.invoke('LeaveConversation', activeConversation.id);
    }
    setActiveConversation(conv);
    setReplyingTo(null);
    setEditingMessage(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversation) return;

    if (editingMessage) {
      await messagesApi.edit(editingMessage.id, inputMessage);
      setEditingMessage(null);
    } else {
      await messagesApi.send(activeConversation.id, {
        content: inputMessage,
        messageType: 'Text',
        parentMessageID: replyingTo?.id || null,
      });
      setReplyingTo(null);
    }
    setInputMessage('');
    
    if (connectionRef.current) {
      connectionRef.current.invoke('SendTypingStatus', activeConversation.id, false);
    }
  };

  const handleKeyDown = () => {
    if (!activeConversation || !connectionRef.current) return;
    connectionRef.current.invoke('SendTypingStatus', activeConversation.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (connectionRef.current && activeConversation) {
        connectionRef.current.invoke('SendTypingStatus', activeConversation.id, false);
      }
    }, 2000);
  };

  const toggleMute = async (conv: ConversationDto) => {
    const isMuted = !conv.members.find((m) => m.userID === currentUserId)?.isMuted;
    await conversationsApi.mute(conv.id, isMuted);
    loadConversations();
    if (activeConversation?.id === conv.id) {
      setActiveConversation((prev) => prev ? {
        ...prev,
        members: prev.members.map((m) => m.userID === currentUserId ? { ...m, isMuted } : m)
      } : null);
    }
  };

  const toggleArchive = async (conv: ConversationDto) => {
    const isArchived = !conv.isArchived;
    await conversationsApi.archive(conv.id, isArchived);
    loadConversations();
    if (activeConversation?.id === conv.id) {
      setActiveConversation((prev) => prev ? { ...prev, isArchived } : null);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConv = await conversationsApi.create({
      conversationType: 'Group',
      title: groupTitle,
      description: groupDesc,
      isPrivate: groupIsPrivate,
      memberIds: selectedMembers,
    });
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversation(newConv);
    setShowCreateGroupModal(false);
    setGroupTitle('');
    setGroupDesc('');
    setGroupIsPrivate(true);
    setSelectedMembers([]);
  };

  const handleStartDirect = async (otherUserId: string) => {
    const newConv = await conversationsApi.getOrCreateDirect(otherUserId);
    loadConversations();
    setActiveConversation(newConv);
    setShowCreateDirectModal(false);
  };

  const handleReact = async (msgId: string, emoji: string) => {
    await messagesApi.toggleReaction(msgId, emoji);
  };

  const handleCreateTaskFromMessage = (msg: MessageDto) => {
    setTaskMessageSource(msg);
    setTaskTitle(`Nhiệm vụ: ${msg.content?.substring(0, 40) || 'Từ hội thoại'}`);
    setTaskDesc(`Được tạo từ tin nhắn của ${msg.fullName}: "${msg.content || ''}"`);
    setShowCreateTaskModal(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskMessageSource || !activeConversation) return;

    const task = await tasksApi.create({
      title: taskTitle,
      description: taskDesc,
      taskType: taskType,
      priority: taskPriority,
      startDate: taskStartDate || null,
      dueDate: taskDueDate || null,
      estimatedHours: taskEstimatedHours || 0,
      isRecurring: false,
      assigneeIds: taskAssignees,
      primaryAssigneeId: taskPrimaryAssignee || null,
      followerIds: taskFollowers,
      kpiIds: [],
      lmsCourseIds: [],
    });

    await messagesApi.send(activeConversation.id, {
      content: `Đã tạo công việc liên kết: [${task.taskCode}] ${task.title}. Trạng thái: ToDo.`,
      messageType: 'TaskLink',
      parentMessageID: taskMessageSource.id,
      attachments: [{ fileName: 'Xem công việc', fileURL: `/tasks`, fileType: 'link', fileSize: 0 }],
    });

    setShowCreateTaskModal(false);
    setTaskMessageSource(null);
  };

  // Helpers
  const getConversationTitle = (c: ConversationDto) => {
    if (c.conversationType === 'Direct') {
      const other = c.members.find((m) => m.userID !== currentUserId);
      return other ? other.fullName : 'Hội thoại trực tiếp';
    }
    return c.title || 'Nhóm không tên';
  };

  const getConversationInitials = (c: ConversationDto) => {
    const title = getConversationTitle(c);
    const words = title.split(' ');
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return title.substring(0, 2).toUpperCase();
  };

  const getOtherMembersDirect = () => {
    const directUsers = conversations
      .filter((c) => c.conversationType === 'Direct')
      .map((c) => c.members.find((m) => m.userID !== currentUserId)?.userID);
    return users.filter((u) => u.id !== currentUserId && !directUsers.includes(u.id));
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const scrollToMessage = (msgId: string) => {
    const rowElement = document.getElementById(`msg-${msgId}`);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const bubble = rowElement.querySelector('.chat-msg-bubble');
      if (bubble) {
        bubble.classList.add('highlight-pulse');
        setTimeout(() => {
          bubble.classList.remove('highlight-pulse');
        }, 1500);
      }
    }
  };

  const filteredConversations = conversations.filter((c) =>
    getConversationTitle(c).toLowerCase().includes(searchText.toLowerCase())
  );

  const activeTyping = activeConversation && typingUsers[activeConversation.id]
    ? Object.values(typingUsers[activeConversation.id])
    : [];

  return (
    <div className="chat-container">
      {/* ═══ Sidebar ═══ */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">💬 Tin nhắn</div>
          <div className="chat-search-wrapper">
            <span className="chat-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm cuộc hội thoại..."
              className="chat-search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="chat-sidebar-actions">
            <button className="btn-chat-action" onClick={() => setShowCreateDirectModal(true)}>
              ✉️ Chat 1-1
            </button>
            <button className="btn-chat-action" onClick={() => setShowCreateGroupModal(true)}>
              👥 Tạo nhóm
            </button>
          </div>
        </div>

        <div className="chat-conversation-list">
          {filteredConversations.map((c) => {
            const isActive = activeConversation?.id === c.id;
            const isMuted = c.members.find((m) => m.userID === currentUserId)?.isMuted;
            return (
              <div
                key={c.id}
                className={`chat-conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectConversation(c)}
              >
                <div className="chat-avatar">
                  {getConversationInitials(c)}
                </div>
                <div className="chat-conv-info">
                  <div className="chat-conv-name-row">
                    <span className="chat-conv-name">
                      {getConversationTitle(c)} {isMuted && '🔇'}
                    </span>
                    {c.lastMessage && (
                      <span className="chat-conv-time">{formatTime(c.lastMessage.sentAt)}</span>
                    )}
                  </div>
                  <div className="chat-conv-name-row">
                    <span className="chat-conv-last-msg">
                      {c.lastMessage
                        ? c.lastMessage.isDeleted ? '🚫 Tin nhắn đã thu hồi' : c.lastMessage.content
                        : 'Chưa có tin nhắn'}
                    </span>
                    {c.unreadCount > 0 && <span className="unread-badge">{c.unreadCount}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Main chat area ═══ */}
      <div className="chat-main-area">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <div className="chat-avatar small">
                  {getConversationInitials(activeConversation)}
                </div>
                <div className="chat-header-info">
                  <div className="chat-header-title">{getConversationTitle(activeConversation)}</div>
                  <div className="chat-header-desc">
                    {activeConversation.conversationType === 'Direct'
                      ? '🟢 Đang hoạt động'
                      : `👥 ${activeConversation.members.length} thành viên • ${activeConversation.description || 'Không có mô tả'}`}
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                <button className="btn-chat-action" onClick={() => toggleMute(activeConversation)}>
                  {activeConversation.members.find((m) => m.userID === currentUserId)?.isMuted ? '🔔 Bật âm' : '🔇 Tắt âm'}
                </button>
                <button className="btn-chat-action" onClick={() => toggleArchive(activeConversation)}>
                  {activeConversation.isArchived ? '📂 Khôi phục' : '📦 Lưu trữ'}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages-container">
              {(() => {
                // Group consecutive messages from the same user
                const nonSystemMessages = messages.filter((m) => m.messageType !== 'System');
                const elements: React.ReactNode[] = [];

                // Render system messages first as standalone
                messages.forEach((m) => {
                  if (m.messageType === 'System') {
                    elements.push(
                      <div key={m.id} className="chat-system-msg">
                        ℹ️ {m.content}
                      </div>
                    );
                  }
                });

                // Now group non-system messages
                let i = 0;
                while (i < nonSystemMessages.length) {
                  const group: MessageDto[] = [nonSystemMessages[i]];
                  while (
                    i + group.length < nonSystemMessages.length &&
                    nonSystemMessages[i + group.length].userID === nonSystemMessages[i].userID &&
                    nonSystemMessages[i + group.length].messageType !== 'System'
                  ) {
                    group.push(nonSystemMessages[i + group.length]);
                  }
                  i += group.length;

                  const isMine = group[0].userID === currentUserId;

                  elements.push(
                    <div key={`group-${group[0].id}`} className="chat-message-group">
                      {group.map((m, idx) => {
                        const isTaskLink = m.messageType === 'TaskLink';
                        const isFirst = idx === 0;
                        const isLast = idx === group.length - 1;
                        const isSingle = group.length === 1;

                        let groupPos = 'group-middle';
                        if (isSingle) groupPos = 'group-single';
                        else if (isFirst) groupPos = 'group-first';
                        else if (isLast) groupPos = 'group-last';

                        return (
                          <div key={m.id} id={`msg-${m.id}`} className={`chat-message-row ${isMine ? 'mine' : ''} ${groupPos}`}>
                            {!isMine && (
                              <div className="chat-avatar">
                                {m.fullName.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="chat-msg-content">
                              {!isMine && isFirst && <div className="chat-msg-sender">{m.fullName}</div>}
                              <div className="chat-msg-bubble-wrapper">
                                {/* 
                                  JSX order: [actions-container] [bubble-container] [time-inline]
                                  Mine  (flex-direction: row)        → [actions LEFT] [bubble] [time RIGHT]
                                  Others (flex-direction: row-reverse) → [time LEFT] [bubble] [actions RIGHT]
                                */}

                                {/* Actions + React trigger */}
                                <div className="chat-msg-actions-container">
                                  <button className="chat-msg-action-btn" onClick={() => setReplyingTo(m)} title="Trả lời" type="button">↩️</button>
                                  {!m.isDeleted && (
                                    <button className="chat-msg-action-btn" onClick={() => handleCreateTaskFromMessage(m)} title="Tạo Task" type="button">📋</button>
                                  )}
                                  {isMine && !m.isDeleted && (
                                    <>
                                      <button className="chat-msg-action-btn" onClick={() => { setEditingMessage(m); setInputMessage(m.content || ''); }} title="Chỉnh sửa" type="button">✏️</button>
                                      <button className="chat-msg-action-btn" onClick={() => messagesApi.remove(m.id)} title="Thu hồi" type="button">🗑️</button>
                                    </>
                                  )}
                                  {/* React emoji trigger */}
                                  <div className="chat-msg-react-wrapper">
                                    <button className="chat-msg-action-btn chat-msg-react-trigger" title="Bày tỏ cảm xúc" type="button">😀</button>
                                    <div className="chat-msg-react-popup">
                                      <button className="emoji-btn" onClick={() => handleReact(m.id, '👍')} type="button">👍</button>
                                      <button className="emoji-btn" onClick={() => handleReact(m.id, '❤️')} type="button">❤️</button>
                                      <button className="emoji-btn" onClick={() => handleReact(m.id, '😂')} type="button">😂</button>
                                      <button className="emoji-btn" onClick={() => handleReact(m.id, '😮')} type="button">😮</button>
                                    </div>
                                  </div>
                                </div>

                                {/* Time — inline next to bubble, LEFT for mine, RIGHT for others */}
                                <span className="chat-msg-time-inline">{formatTime(m.sentAt)}</span>

                                {/* Bubble */}
                                <div className="chat-msg-bubble-container">
                                  <div className="chat-msg-bubble">
                                    {/* Reply reference — show actual parent content */}
                                    {m.parentMessageID && (() => {
                                      const parentMsg = messages.find(pm => pm.id === m.parentMessageID);
                                      return (
                                        <div 
                                          className="chat-reply-ref" 
                                          onClick={() => scrollToMessage(m.parentMessageID!)}
                                          title="Đi đến tin nhắn gốc"
                                        >
                                          <span className="chat-reply-name">{parentMsg?.fullName || 'Tin nhắn'}</span>
                                          <span className="chat-reply-content">{parentMsg?.content || 'Tin nhắn đã thu hồi'}</span>
                                        </div>
                                      );
                                    })()}

                                    {/* Content */}
                                    {isTaskLink ? (
                                      <div className="chat-task-card">
                                        <div className="chat-task-card-title">📋 LIÊN KẾT NHIỆM VỤ</div>
                                        <div className="chat-task-card-body">{m.content}</div>
                                        <a href="/tasks" className="chat-task-card-link">
                                          📊 Đi đến Bảng Task
                                        </a>
                                      </div>
                                    ) : (
                                      <div>{m.content}</div>
                                    )}

                                    {/* Edited badge */}
                                    {m.isEdited && <span className="chat-msg-edited">(đã sửa)</span>}
                                  </div>

                                  {/* Reactions — grouped by emoji with count */}
                                  {m.reactions.length > 0 && (() => {
                                    const groups: Record<string, typeof m.reactions> = {};
                                    m.reactions.forEach(r => {
                                      if (!groups[r.reactionType]) groups[r.reactionType] = [];
                                      groups[r.reactionType].push(r);
                                    });
                                    const myReactionTypes = m.reactions
                                      .filter(r => r.userID === currentUserId)
                                      .map(r => r.reactionType);
                                    return (
                                      <div className="reactions-list">
                                        {Object.entries(groups).map(([emoji, reacts]) => (
                                          <span
                                            key={emoji}
                                            className={`reaction-tag ${myReactionTypes.includes(emoji) ? 'mine' : ''}`}
                                            onClick={() => handleReact(m.id, emoji)}
                                            title={reacts.map(r => r.fullName).join(', ')}
                                          >
                                            {emoji}{reacts.length > 1 && <span className="reaction-count">{reacts.length}</span>}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* (time-inline removed from here — now inside bubble) */}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                return elements;
              })()}

              {/* Typing indicator */}
              {activeTyping.length > 0 && (
                <div className="typing-status">
                  <div className="typing-dots">
                    <span /><span /><span />
                  </div>
                  {activeTyping.join(', ')} đang soạn tin...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="chat-input-bar">
              {replyingTo && (
                <div className="reply-preview">
                  <span>↩️ Trả lời <strong>{replyingTo.fullName}</strong>: "{replyingTo.content}"</span>
                  <button className="reply-close-btn" onClick={() => setReplyingTo(null)}>✕</button>
                </div>
              )}
              {editingMessage && (
                <div className="reply-preview editing">
                  <span>✏️ Đang sửa tin nhắn gửi lúc {formatTime(editingMessage.sentAt)}</span>
                  <button className="reply-close-btn" onClick={() => { setEditingMessage(null); setInputMessage(''); }}>✕</button>
                </div>
              )}
              <form onSubmit={handleSend} className="chat-input-row">
                <input
                  type="text"
                  placeholder="Aa..."
                  className="chat-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="submit"
                  className="chat-input-btn"
                  disabled={!inputMessage.trim()}
                  title="Gửi tin nhắn"
                >
                  ➤
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-main-placeholder">
            <div className="placeholder-icon">💬</div>
            <h3>Chọn cuộc hội thoại</h3>
            <p>Hãy chọn một cuộc hội thoại từ danh sách bên trái hoặc bắt đầu trò chuyện trực tiếp 1-1, tạo nhóm thảo luận mới.</p>
          </div>
        )}
      </div>

      {/* ═══ Modals ═══ */}

      {/* 1. Create Group Chat */}
      {showCreateGroupModal && (
        <div className="modal-backdrop">
          <div className="chat-modal">
            <h4>👥 Tạo nhóm thảo luận mới</h4>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Tên nhóm</label>
                <input type="text" className="form-control" required value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="VD: Team Frontend 2026" />
              </div>
              <div className="form-group">
                <label>Mô tả nhóm</label>
                <textarea className="form-control" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Mô tả ngắn gọn về nhóm..." rows={2} />
              </div>
              <div className="form-group checkbox-control">
                <input type="checkbox" checked={groupIsPrivate} onChange={(e) => setGroupIsPrivate(e.target.checked)} />
                <span>🔒 Nhóm riêng tư</span>
              </div>
              <div className="form-group">
                <label>Chọn thành viên</label>
                <div className="user-selector-list">
                  {users.filter(u => u.id !== currentUserId).map(u => {
                    const selected = selectedMembers.includes(u.id);
                    return (
                      <div key={u.id} className="user-selector-item" onClick={() => setSelectedMembers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}>
                        <input type="checkbox" checked={selected} readOnly />
                        <span>{u.fullName} ({u.employeeCode})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateGroupModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Tạo nhóm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Direct Message */}
      {showCreateDirectModal && (
        <div className="modal-backdrop">
          <div className="chat-modal">
            <h4>✉️ Chọn đồng nghiệp trò chuyện 1-1</h4>
            <div className="user-selector-list" style={{ maxHeight: '300px' }}>
              {getOtherMembersDirect().map(u => (
                <div key={u.id} className="user-selector-item" onClick={() => handleStartDirect(u.id)}>
                  <div className="chat-avatar small">{u.fullName.substring(0, 2).toUpperCase()}</div>
                  <span>{u.fullName} ({u.employeeCode}) — {u.departmentName}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowCreateDirectModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create Task from message */}
      {showCreateTaskModal && (
        <div className="modal-backdrop">
          <div className="chat-modal" style={{ width: '540px' }}>
            <h4>📋 Tạo Task từ tin nhắn chat</h4>
            <form onSubmit={handleSubmitTask}>
              <div className="form-group">
                <label>Tiêu đề công việc</label>
                <input type="text" className="form-control" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Nội dung công việc</label>
                <textarea className="form-control" rows={3} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Độ ưu tiên</label>
                  <select className="form-control" value={taskPriority} onChange={(e: any) => setTaskPriority(e.target.value)}>
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                    <option value="Urgent">Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Loại Task</label>
                  <select className="form-control" value={taskType} onChange={(e: any) => setTaskType(e.target.value)}>
                    <option value="Normal">Thông thường</option>
                    <option value="Recurring">Lặp lại</option>
                    <option value="Project">Dự án</option>
                    <option value="Onboarding">Nhân sự mới</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ngày bắt đầu</label>
                  <input type="date" className="form-control" value={taskStartDate} onChange={(e) => setTaskStartDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Hạn chót</label>
                  <input type="date" className="form-control" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Số giờ ước tính</label>
                <input type="number" className="form-control" value={taskEstimatedHours} onChange={(e) => setTaskEstimatedHours(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Người thực hiện (Assignee)</label>
                <div className="user-selector-list">
                  {users.map(u => {
                    const selected = taskAssignees.includes(u.id);
                    return (
                      <div key={u.id} className="user-selector-item" onClick={() => setTaskAssignees(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}>
                        <input type="checkbox" checked={selected} readOnly />
                        <span>{u.fullName} ({u.employeeCode})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label>Người chịu trách nhiệm chính</label>
                <select className="form-control" value={taskPrimaryAssignee} onChange={(e) => setTaskPrimaryAssignee(e.target.value)}>
                  <option value="">Chọn người chịu trách nhiệm chính...</option>
                  {users.filter(u => taskAssignees.includes(u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Người theo dõi (Follower)</label>
                <div className="user-selector-list">
                  {users.map(u => {
                    const selected = taskFollowers.includes(u.id);
                    return (
                      <div key={u.id} className="user-selector-item" onClick={() => setTaskFollowers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}>
                        <input type="checkbox" checked={selected} readOnly />
                        <span>{u.fullName} ({u.employeeCode})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateTaskModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Tạo Task và Gửi Chat</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
