import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tasksApi, usersApi } from '../api/services';
import type { TaskDto, UserDto, TaskCommentDto } from '../types/entities';
import { useAuth } from '../context/AuthContext';
import './TasksPage.css';

export const statusLabels: Record<string, string> = {
  ToDo: 'Việc cần làm',
  InProgress: 'Đang thực hiện',
  Review: 'Đang xem xét',
  Done: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
};

const priorityLabels: Record<string, string> = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
  Urgent: 'Khẩn cấp',
};

const formatTaskDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa có';

const formatCommentTime = (date: string) => {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày`;
  return new Date(date).toLocaleDateString('vi-VN');
};

const handleCommentKeyDown = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  onSubmit: (e: React.FormEvent) => void,
) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSubmit(e);
  }
};

const sortByCreatedAtAsc = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

const sortCommentsTree = (comments: TaskCommentDto[]): TaskCommentDto[] =>
  sortByCreatedAtAsc(comments).map((c) => ({
    ...c,
    replies: sortCommentsTree(c.replies ?? []),
  }));

const prepareCommentsForDisplay = (comments: TaskCommentDto[]): TaskCommentDto[] => {
  if (comments.length === 0) return [];

  const hasNestedReplies = comments.some((c) => (c.replies?.length ?? 0) > 0);
  if (hasNestedReplies) {
    return sortCommentsTree(comments.filter((c) => !c.parentCommentID));
  }

  const sorted = sortByCreatedAtAsc(comments);
  const map = new Map<string, TaskCommentDto>();
  sorted.forEach((c) => map.set(c.id, { ...c, replies: [] }));

  const roots: TaskCommentDto[] = [];
  sorted.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentCommentID && map.has(c.parentCommentID)) {
      map.get(c.parentCommentID)!.replies.push(node);
    } else if (!c.parentCommentID) {
      roots.push(node);
    }
  });

  return sortCommentsTree(roots);
};

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();

export function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [viewMode, setViewMode] = useState<'Kanban' | 'List'>('Kanban');

  // Filter toolbar state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Modals
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'Details' | 'Subtasks' | 'Logs' | 'Comments'>('Details');

  // Create task state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'Normal' | 'Recurring' | 'Project' | 'Onboarding' | 'Offboarding' | 'Training'>('Normal');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [primaryAssignee, setPrimaryAssignee] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  const logsScrollRef = useRef<HTMLDivElement>(null);

  const displayedActivityLogs = useMemo(
    () => (selectedTask ? sortByCreatedAtAsc(selectedTask.activityLogs) : []),
    [selectedTask?.activityLogs, selectedTask?.id],
  );

  const displayedComments = useMemo(
    () => (selectedTask ? prepareCommentsForDisplay(selectedTask.comments) : []),
    [selectedTask?.comments, selectedTask?.id],
  );

  // Load lists
  useEffect(() => {
    loadTasks();
    usersApi.listAll().then((list) => setUsers(list));
  }, [search, statusFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    if (!selectedTask) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (replyingToId) {
          setReplyingToId(null);
          setReplyText('');
        } else {
          setSelectedTask(null);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedTask, replyingToId]);

  useEffect(() => {
    if (activeTab !== 'Comments') {
      setReplyingToId(null);
      setReplyText('');
    }
  }, [activeTab]);

  useEffect(() => {
    if (replyingToId) {
      replyInputRef.current?.focus();
    }
  }, [replyingToId]);

  useEffect(() => {
    if (activeTab !== 'Comments') return;
    const el = commentsScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeTab, displayedComments]);

  useEffect(() => {
    if (activeTab !== 'Logs') return;
    const el = logsScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeTab, displayedActivityLogs]);

  const loadTasks = () => {
    tasksApi.list({
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      assigneeId: assigneeFilter || undefined,
    }).then(async (res) => {
      setTasks(res.items);
      if (selectedTask) {
        try {
          const detailed = await tasksApi.get(selectedTask.id);
          setSelectedTask(detailed);
        } catch {
          const updated = res.items.find(t => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    });
  };

  const handleSelectTask = (task: TaskDto) => {
    tasksApi.get(task.id).then((detailed) => {
      setSelectedTask(detailed);
      setActiveTab('Details');
    });
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'ToDo' | 'InProgress' | 'Review' | 'Done' | 'Cancelled') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === targetStatus) return;

    // Update status on API
    await tasksApi.update(taskId, {
      title: task.title,
      description: task.description,
      taskType: task.taskType,
      status: targetStatus,
      priority: task.priority,
      progress: targetStatus === 'Done' ? 100 : task.progress,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      isRecurring: task.isRecurring,
      recurringPattern: task.recurringPattern,
      parentTaskID: task.parentTaskID,
    });

    loadTasks();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await tasksApi.create({
      title,
      description,
      taskType,
      priority,
      startDate: startDate || null,
      dueDate: dueDate || null,
      estimatedHours,
      isRecurring: false,
      parentTaskID: null,
      assigneeIds: selectedAssignees,
      primaryAssigneeId: primaryAssignee || null,
      followerIds: selectedFollowers,
      kpiIds: [],
      lmsCourseIds: [],
    });

    setShowCreateModal(false);
    loadTasks();

    // Reset Form
    setTitle('');
    setDescription('');
    setTaskType('Normal');
    setPriority('Medium');
    setStartDate('');
    setDueDate('');
    setEstimatedHours(0);
    setSelectedAssignees([]);
    setPrimaryAssignee('');
    setSelectedFollowers([]);
  };

  const handleUpdateStatusInModal = async (status: 'ToDo' | 'InProgress' | 'Review' | 'Done' | 'Cancelled') => {
    if (!selectedTask) return;
    await tasksApi.update(selectedTask.id, {
      title: selectedTask.title,
      description: selectedTask.description,
      taskType: selectedTask.taskType,
      status,
      priority: selectedTask.priority,
      progress: status === 'Done' ? 100 : selectedTask.progress,
      startDate: selectedTask.startDate,
      dueDate: selectedTask.dueDate,
      estimatedHours: selectedTask.estimatedHours,
      actualHours: selectedTask.actualHours,
      isRecurring: selectedTask.isRecurring,
      recurringPattern: selectedTask.recurringPattern,
      parentTaskID: selectedTask.parentTaskID,
    });
    loadTasks();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;

    await tasksApi.create({
      title: newSubtaskTitle.trim(),
      description: '',
      taskType: 'Normal',
      priority: selectedTask.priority,
      startDate: selectedTask.startDate ?? null,
      dueDate: selectedTask.dueDate ?? null,
      estimatedHours: 0,
      isRecurring: false,
      parentTaskID: selectedTask.id,
      assigneeIds: selectedTask.assignees.map((a) => a.userID),
      primaryAssigneeId: selectedTask.assignees.find((a) => a.isPrimaryAssignee)?.userID ?? null,
      followerIds: [],
      kpiIds: [],
      lmsCourseIds: [],
    });

    setNewSubtaskTitle('');
    loadTasks();
  };

  const handleToggleSubtask = async (sub: TaskDto) => {
    if (!selectedTask) return;
    const markDone = sub.status !== 'Done';
    await tasksApi.update(sub.id, {
      title: sub.title,
      description: sub.description,
      taskType: sub.taskType,
      status: markDone ? 'Done' : 'ToDo',
      priority: sub.priority,
      progress: markDone ? 100 : 0,
      startDate: sub.startDate,
      dueDate: sub.dueDate,
      estimatedHours: sub.estimatedHours,
      actualHours: sub.actualHours,
      isRecurring: sub.isRecurring,
      recurringPattern: sub.recurringPattern,
      parentTaskID: sub.parentTaskID,
    });
    loadTasks();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    await tasksApi.addComment(selectedTask.id, {
      content: commentText,
      parentCommentID: null,
    });

    setCommentText('');
    loadTasks();
  };

  const handleSubmitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTask) return;

    await tasksApi.addComment(selectedTask.id, {
      content: replyText,
      parentCommentID: parentId,
    });

    setReplyText('');
    setReplyingToId(null);
    loadTasks();
  };

  const toggleReply = (comment: TaskCommentDto) => {
    if (replyingToId === comment.id) {
      setReplyingToId(null);
      setReplyText('');
    } else {
      setReplyingToId(comment.id);
      setReplyText('');
    }
  };

  const currentUserInitials = user?.fullName ? getInitials(user.fullName) : '?';

  const handleRemoveTask = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) return;
    await tasksApi.remove(id);
    setSelectedTask(null);
    loadTasks();
  };

  // Group columns for Kanban — chỉ hiển thị task gốc, không hiển thị subtask
  const rootTasks = useMemo(() => tasks.filter((t) => !t.parentTaskID), [tasks]);

  const getTasksByStatus = (status: 'ToDo' | 'InProgress' | 'Review' | 'Done' | 'Cancelled') => {
    return rootTasks.filter(t => t.status === status);
  };

  const getSubtaskStats = (task: TaskDto) => {
    const total = task.subtasks.length;
    const done = task.subtasks.filter((s) => s.status === 'Done').length;
    return { total, done };
  };

  const renderComments = (commentsList: TaskCommentDto[], depth = 0) => {
    return (
      <div className={`fb-comment-list ${depth > 0 ? 'is-nested' : ''}`}>
        {commentsList.map((c) => {
          const isReplying = replyingToId === c.id;
          return (
            <div key={c.id} className="fb-comment">
              <div className="fb-comment-row">
                <div className={`fb-avatar ${depth > 0 ? 'is-sm' : ''}`}>{getInitials(c.fullName)}</div>
                <div className="fb-comment-main">
                  <div className="fb-bubble">
                    <span className="fb-bubble-name">{c.fullName}</span>
                    <span className="fb-bubble-text">{c.content}</span>
                  </div>
                  <div className="fb-comment-actions">
                    <time className="fb-action-time">{formatCommentTime(c.createdAt)}</time>
                    <button
                      type="button"
                      className={`fb-action-btn ${isReplying ? 'is-active' : ''}`}
                      onClick={() => toggleReply(c)}
                    >
                      Trả lời
                    </button>
                  </div>
                </div>
              </div>

              {isReplying && (
                <form
                  className="fb-reply-composer"
                  onSubmit={(e) => handleSubmitReply(e, c.id)}
                >
                  <div className="fb-avatar is-sm">{currentUserInitials}</div>
                  <div className="fb-input-pill">
                    <textarea
                      ref={replyInputRef}
                      className="fb-input-field"
                      placeholder={`Trả lời ${c.fullName}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={1}
                      onKeyDown={(e) => handleCommentKeyDown(e, (ev) => handleSubmitReply(ev, c.id))}
                    />
                    {replyText.trim() && (
                      <button type="submit" className="fb-send-btn" title="Gửi" aria-label="Gửi">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </form>
              )}

              {c.replies && c.replies.length > 0 && (
                <div className="fb-replies">{renderComments(c.replies, depth + 1)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="tasks-page-container">
      {/* Filters Toolbar */}
      <div className="tasks-toolbar">
        <div className="tasks-filters">
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, mã..."
            className="filter-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="filter-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">-- Trạng thái --</option>
            <option value="ToDo">Việc cần làm</option>
            <option value="InProgress">Đang thực hiện</option>
            <option value="Review">Đang xem xét</option>
            <option value="Done">Đã hoàn thành</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
          <select className="filter-input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">-- Mức ưu tiên --</option>
            <option value="Low">Thấp</option>
            <option value="Medium">Trung bình</option>
            <option value="High">Cao</option>
            <option value="Urgent">Khẩn cấp</option>
          </select>
          <select className="filter-input" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="">-- Người thực hiện --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="view-toggles">
            <button className={`btn-toggle ${viewMode === 'Kanban' ? 'active' : ''}`} onClick={() => setViewMode('Kanban')}>
              Kanban
            </button>
            <button className={`btn-toggle ${viewMode === 'List' ? 'active' : ''}`} onClick={() => setViewMode('List')}>
              Danh sách
            </button>
          </div>
          <button className="btn-create-task" onClick={() => setShowCreateModal(true)}>
            + Thêm Task
          </button>
        </div>
      </div>

      {/* Board / List content */}
      {viewMode === 'Kanban' ? (
        <div className="kanban-board">
          {(['ToDo', 'InProgress', 'Review', 'Done', 'Cancelled'] as const).map((col) => {
            const colTasks = getTasksByStatus(col);
            return (
              <div
                key={col}
                className={`kanban-column ${col}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className="kanban-column-header">
                  <span>{statusLabels[col]}</span>
                  <span className="column-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards-container">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="task-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => handleSelectTask(t)}
                    >
                      <div className="task-card-header">
                        <span className="task-code">{t.taskCode}</span>
                        <span className={`task-priority-badge ${t.priority}`}>{t.priority}</span>
                      </div>
                      <div className="task-card-title">{t.title}</div>
                      {t.description && <div className="task-card-desc">{t.description}</div>}
                      {getSubtaskStats(t).total > 0 && (
                        <div className="task-card-subtasks">
                          ☑ {getSubtaskStats(t).done}/{getSubtaskStats(t).total} subtasks
                        </div>
                      )}
                      
                      <div className="task-card-footer">
                        <div className="task-due-date">
                          📅 {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="task-assignee-avatars">
                          {t.assignees.map((a, idx) => (
                            <div key={idx} className="task-assignee-avatar-mini" title={a.fullName}>
                              {a.fullName.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tasks-list-view">
          <table className="tasks-table responsive-table tasks-list-table">
            <thead>
              <tr>
                <th>Mã Task</th>
                <th>Tiêu đề</th>
                <th>Trạng thái</th>
                <th>Độ ưu tiên</th>
                <th>Người thực hiện</th>
                <th>Hạn chót</th>
                <th>Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              {rootTasks.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectTask(t)}>
                  <td><span className="task-code">{t.taskCode}</span></td>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td><span className={`task-status-badge ${t.status}`}>{statusLabels[t.status] || t.status}</span></td>
                  <td><span className={`task-priority-badge ${t.priority}`}>{t.priority}</span></td>
                  <td>
                    {t.assignees.map(a => a.fullName).join(', ') || 'N/A'}
                  </td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden', width: '60px' }}>
                        <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--primary)' }} />
                      </div>
                      <span>{t.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {/* 1. Create Task Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="chat-modal" style={{ width: '560px' }}>
            <h4>Thêm mới công việc</h4>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Tiêu đề</label>
                <input type="text" className="form-control" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mô tả chi tiết</label>
                <textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Mức ưu tiên</label>
                  <select className="form-control" value={priority} onChange={(e: any) => setPriority(e.target.value)}>
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                    <option value="Urgent">Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Loại công việc</label>
                  <select className="form-control" value={taskType} onChange={(e: any) => setTaskType(e.target.value)}>
                    <option value="Normal">Thông thường</option>
                    <option value="Recurring">Lặp lại</option>
                    <option value="Project">Dự án</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Offboarding">Offboarding</option>
                    <option value="Training">Đào tạo</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ngày bắt đầu</label>
                  <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Hạn chót</label>
                  <input type="date" className="form-control" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Số giờ dự tính</label>
                <input type="number" className="form-control" value={estimatedHours} onChange={(e) => setEstimatedHours(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Giao người thực hiện (Assignee)</label>
                <div className="user-selector-list">
                  {users.map(u => {
                    const selected = selectedAssignees.includes(u.id);
                    return (
                      <div key={u.id} className="user-selector-item" onClick={() => setSelectedAssignees(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}>
                        <input type="checkbox" checked={selected} readOnly />
                        <span>{u.fullName} ({u.employeeCode})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label>Chọn người thực hiện chính</label>
                <select className="form-control" value={primaryAssignee} onChange={(e) => setPrimaryAssignee(e.target.value)}>
                  <option value="">-- Chọn người thực hiện chính --</option>
                  {users.filter(u => selectedAssignees.includes(u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Người theo dõi (Follower)</label>
                <div className="user-selector-list">
                  {users.map(u => {
                    const selected = selectedFollowers.includes(u.id);
                    return (
                      <div key={u.id} className="user-selector-item" onClick={() => setSelectedFollowers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}>
                        <input type="checkbox" checked={selected} readOnly />
                        <span>{u.fullName} ({u.employeeCode})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Tạo Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="task-modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`task-modal-accent task-modal-accent--${selectedTask.status}`} />

            <header className="task-modal-header">
              <div className="task-modal-header-content">
                <div className="task-modal-meta-row">
                  <span className="task-modal-code">{selectedTask.taskCode}</span>
                  <span className={`task-modal-priority-chip ${selectedTask.priority}`}>
                    {priorityLabels[selectedTask.priority] || selectedTask.priority}
                  </span>
                </div>
                <h2 id="task-modal-title" className="task-modal-title">{selectedTask.title}</h2>
                <div className="task-modal-progress-wrap">
                  <div className="task-modal-progress-label">
                    <span>Tiến độ</span>
                    <strong>{selectedTask.progress}%</strong>
                  </div>
                  <div className="task-modal-progress-track">
                    <div
                      className={`task-modal-progress-fill task-modal-progress-fill--${selectedTask.status}`}
                      style={{ width: `${Math.min(100, Math.max(0, selectedTask.progress))}%` }}
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="task-modal-close"
                onClick={() => setSelectedTask(null)}
                title="Đóng"
                aria-label="Đóng"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <nav className="task-modal-tabs" aria-label="Tab công việc">
              {([
                { id: 'Details' as const, label: 'Chi tiết', count: null },
                { id: 'Subtasks' as const, label: 'Subtasks', count: selectedTask.subtasks.length },
                { id: 'Logs' as const, label: 'Lịch sử', count: selectedTask.activityLogs.length },
                { id: 'Comments' as const, label: 'Bình luận', count: selectedTask.comments.length },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`task-modal-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className="task-modal-tab-count">{tab.count}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="task-modal-body">
              {activeTab === 'Details' && (
                <div className="task-modal-details">
                  <div className="task-modal-main">
                    <section className="task-modal-panel">
                      <div className="task-modal-panel-head">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span>Mô tả chi tiết</span>
                      </div>
                      <p className="task-modal-description">
                        {selectedTask.description || 'Không có mô tả chi tiết.'}
                      </p>
                    </section>

                    {(selectedTask.kpiIds.length > 0 || selectedTask.lmsCourseIds.length > 0) && (
                      <section className="task-modal-panel task-modal-links">
                        <div className="task-modal-panel-head">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <span>Liên kết</span>
                        </div>
                        <div className="task-link-badges-container">
                          {selectedTask.kpiIds.map((_, idx) => (
                            <div key={`kpi-${idx}`} className="kpi-link-badge">Đóng góp vào KPI</div>
                          ))}
                          {selectedTask.lmsCourseIds.map((_, idx) => (
                            <div key={`lms-${idx}`} className="lms-link-badge">Yêu cầu học LMS</div>
                          ))}
                        </div>
                      </section>
                    )}

                    {selectedTask.followers.length > 0 && (
                      <section className="task-modal-panel">
                        <div className="task-modal-panel-head">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span>Người theo dõi ({selectedTask.followers.length})</span>
                        </div>
                        <div className="task-modal-followers">
                          {selectedTask.followers.map((f, i) => (
                            <span key={i} className="task-modal-follower-chip">{f.fullName}</span>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>

                  <aside className="task-modal-sidebar">
                    <div className="task-modal-field">
                      <label className="task-modal-field-label">Trạng thái</label>
                      <select
                        className={`task-modal-select task-status-select ${selectedTask.status}`}
                        value={selectedTask.status}
                        onChange={(e) => handleUpdateStatusInModal(e.target.value as 'ToDo' | 'InProgress' | 'Review' | 'Done' | 'Cancelled')}
                      >
                        <option value="ToDo">Việc cần làm</option>
                        <option value="InProgress">Đang thực hiện</option>
                        <option value="Review">Đang xem xét</option>
                        <option value="Done">Đã hoàn thành</option>
                        <option value="Cancelled">Đã hủy</option>
                      </select>
                    </div>

                    <div className="task-modal-field">
                      <label className="task-modal-field-label">Mức ưu tiên</label>
                      <div className={`task-modal-priority-display ${selectedTask.priority}`}>
                        {priorityLabels[selectedTask.priority] || selectedTask.priority}
                      </div>
                    </div>

                    <div className="task-modal-field">
                      <label className="task-modal-field-label">Thời gian</label>
                      <div className="task-modal-info-card">
                        <div className="task-modal-info-row">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>Bắt đầu: <strong>{formatTaskDate(selectedTask.startDate)}</strong></span>
                        </div>
                        <div className="task-modal-info-row">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Hạn chót: <strong>{formatTaskDate(selectedTask.dueDate)}</strong></span>
                        </div>
                        {selectedTask.estimatedHours != null && selectedTask.estimatedHours > 0 && (
                          <div className="task-modal-info-row">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            <span>Ước tính: <strong>{selectedTask.estimatedHours}h</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="task-modal-field">
                      <label className="task-modal-field-label">Người thực hiện</label>
                      <div className="task-modal-assignees">
                        {selectedTask.assignees.length === 0 ? (
                          <p className="task-modal-empty-inline">Chưa phân công</p>
                        ) : (
                          selectedTask.assignees.map((a, i) => (
                            <div key={i} className="task-modal-assignee">
                              <div className="task-modal-assignee-avatar">{getInitials(a.fullName)}</div>
                              <div className="task-modal-assignee-body">
                                <span className="task-modal-assignee-name">{a.fullName}</span>
                                {a.isPrimaryAssignee && (
                                  <span className="task-modal-primary-badge">Chính</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="task-modal-delete-btn"
                      onClick={() => handleRemoveTask(selectedTask.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Xóa công việc
                    </button>
                  </aside>
                </div>
              )}

              {activeTab === 'Subtasks' && (
                <div className="task-modal-subtasks">
                  {selectedTask.subtasks.length > 0 && (
                    <div className="task-modal-subtask-summary">
                      <span>
                        {selectedTask.subtasks.filter((s) => s.status === 'Done').length}/{selectedTask.subtasks.length} hoàn thành
                      </span>
                      <div className="task-modal-subtask-summary-bar">
                        <div
                          className="task-modal-subtask-summary-fill"
                          style={{
                            width: `${Math.round(
                              (selectedTask.subtasks.filter((s) => s.status === 'Done').length /
                                selectedTask.subtasks.length) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleAddSubtask} className="task-modal-subtask-form">
                    <input
                      type="text"
                      placeholder="Thêm subtask mới..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" disabled={!newSubtaskTitle.trim()}>
                      Thêm
                    </button>
                  </form>

                  {selectedTask.subtasks.length === 0 ? (
                    <div className="task-modal-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      <p>Chưa có subtask nào</p>
                      <span>Thêm subtask để chia nhỏ công việc</span>
                    </div>
                  ) : (
                    <div className="task-modal-subtask-list">
                      {selectedTask.subtasks.map((sub) => (
                        <div key={sub.id} className={`task-modal-subtask-item ${sub.status === 'Done' ? 'is-done' : ''}`}>
                          <label className="task-modal-subtask-check">
                            <input
                              type="checkbox"
                              checked={sub.status === 'Done'}
                              onChange={() => handleToggleSubtask(sub)}
                            />
                          </label>
                          <div className="task-modal-subtask-content">
                            <span className="task-modal-subtask-title">{sub.title}</span>
                          </div>
                          <span className={`task-status-badge ${sub.status}`}>
                            {statusLabels[sub.status] || sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Logs' && (
                <div className="task-modal-logs">
                  {selectedTask.activityLogs.length === 0 ? (
                    <div className="task-modal-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <p>Chưa có lịch sử hoạt động</p>
                      <span>Các thay đổi sẽ hiển thị tại đây</span>
                    </div>
                  ) : (
                    <div className="task-modal-timeline" ref={logsScrollRef}>
                      {displayedActivityLogs.map((log) => (
                        <div key={log.id} className="task-modal-timeline-item">
                          <div className="task-modal-timeline-dot" />
                          <div className="task-modal-timeline-card">
                            <p className="task-modal-timeline-text">
                              <strong>{log.fullName}</strong>
                              {log.action === 'Created' && ' đã tạo công việc'}
                              {log.action === 'StatusChanged' && ` đã đổi trạng thái từ "${log.oldValue}" sang "${log.newValue}"`}
                              {log.action === 'ProgressUpdated' && ` đã cập nhật tiến độ sang ${log.newValue}%`}
                              {log.action === 'DueDateChanged' && ` đã đổi deadline từ "${log.oldValue}" thành "${log.newValue}"`}
                              {log.action === 'CommentAdded' && ` đã thêm bình luận: "${log.newValue}"`}
                              {log.action === 'SubtaskAdded' && ` đã thêm subtask: "${log.newValue}"`}
                              {log.action === 'Completed' && ' đã hoàn thành công việc'}
                            </p>
                            <time className="task-modal-timeline-time">
                              {new Date(log.createdAt).toLocaleString('vi-VN')}
                            </time>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Comments' && (
                <div className="task-modal-comments fb-comments">
                  {displayedComments.length === 0 ? (
                    <div className="task-modal-empty fb-comments-empty">
                      <p>Chưa có bình luận nào.</p>
                      <span>Hãy là người đầu tiên bình luận.</span>
                    </div>
                  ) : (
                    <div className="fb-comments-scroll" ref={commentsScrollRef}>
                      {renderComments(displayedComments)}
                    </div>
                  )}

                  <form onSubmit={handleAddComment} className="fb-composer">
                    <div className="fb-avatar">{currentUserInitials}</div>
                    <div className="fb-input-pill">
                      <textarea
                        className="fb-input-field"
                        placeholder="Viết bình luận..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={1}
                        onKeyDown={(e) => handleCommentKeyDown(e, handleAddComment)}
                      />
                      {commentText.trim() && (
                        <button type="submit" className="fb-send-btn" title="Gửi" aria-label="Gửi bình luận">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
