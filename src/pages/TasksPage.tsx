import React, { useEffect, useState } from 'react';
import { tasksApi, usersApi } from '../api/services';
import type { TaskDto, UserDto, TaskCommentDto } from '../types/entities';
import './TasksPage.css';

export function TasksPage() {
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
  const [replyingComment, setReplyingComment] = useState<TaskCommentDto | null>(null);

  // Load lists
  useEffect(() => {
    loadTasks();
    usersApi.listAll().then((list) => setUsers(list));
  }, [search, statusFilter, priorityFilter, assigneeFilter]);

  const loadTasks = () => {
    tasksApi.list({
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      assigneeId: assigneeFilter || undefined,
    }).then((res) => {
      setTasks(res.items);
      // If a task is selected, refresh its details
      if (selectedTask) {
        const updated = res.items.find(t => t.id === selectedTask.id);
        if (updated) {
          tasksApi.get(updated.id).then((detailed) => setSelectedTask(detailed));
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
      title: newSubtaskTitle,
      description: '',
      taskType: 'Normal',
      priority: selectedTask.priority,
      startDate: null,
      dueDate: null,
      estimatedHours: 0,
      isRecurring: false,
      parentTaskID: selectedTask.id,
      assigneeIds: [],
      primaryAssigneeId: null,
      followerIds: [],
      kpiIds: [],
      lmsCourseIds: [],
    });

    setNewSubtaskTitle('');
    loadTasks();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    await tasksApi.addComment(selectedTask.id, {
      content: commentText,
      parentCommentID: replyingComment?.id || null,
    });

    setCommentText('');
    setReplyingComment(null);
    loadTasks();
  };

  const handleRemoveTask = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) return;
    await tasksApi.remove(id);
    setSelectedTask(null);
    loadTasks();
  };

  // Group columns for Kanban
  const getTasksByStatus = (status: 'ToDo' | 'InProgress' | 'Review' | 'Done' | 'Cancelled') => {
    return tasks.filter(t => t.status === status);
  };

  const renderComments = (commentsList: TaskCommentDto[]) => {
    return (
      <div className="comments-list">
        {commentsList.map((c) => (
          <div key={c.id} className="comment-node-container" style={{ margin: '8px 0' }}>
            <div className="comment-node">
              <div className="chat-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                {c.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="comment-body">
                <div className="comment-author">{c.fullName}</div>
                <div className="comment-content">{c.content}</div>
                <div className="comment-meta">
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                  <button onClick={() => setReplyingComment(c)}>Trả lời</button>
                </div>
              </div>
            </div>
            {c.replies && c.replies.length > 0 && (
              <div className="comment-replies">
                {renderComments(c.replies)}
              </div>
            )}
          </div>
        ))}
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
            const colLabels = {
              ToDo: 'Việc cần làm',
              InProgress: 'Đang thực hiện',
              Review: 'Đang xem xét',
              Done: 'Đã hoàn thành',
              Cancelled: 'Đã hủy',
            };
            return (
              <div
                key={col}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className="kanban-column-header">
                  <span>{colLabels[col]}</span>
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
          <table className="tasks-table">
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
              {tasks.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectTask(t)}>
                  <td><span className="task-code">{t.taskCode}</span></td>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td>{t.status}</td>
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

      {/* 2. Task Details Modal */}
      {selectedTask && (
        <div className="modal-backdrop">
          <div className="chat-modal" style={{ width: '760px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="task-code">{selectedTask.taskCode}</span>
                <h3 style={{ margin: '8px 0 0 0' }}>{selectedTask.title}</h3>
              </div>
              <button className="chat-msg-opt-btn" style={{ fontSize: '1.2rem' }} onClick={() => setSelectedTask(null)}>✕</button>
            </div>

            <div className="modal-tabs">
              <button className={`tab-btn ${activeTab === 'Details' ? 'active' : ''}`} onClick={() => setActiveTab('Details')}>Chi tiết</button>
              <button className={`tab-btn ${activeTab === 'Subtasks' ? 'active' : ''}`} onClick={() => setActiveTab('Subtasks')}>Subtasks ({selectedTask.subtasks.length})</button>
              <button className={`tab-btn ${activeTab === 'Logs' ? 'active' : ''}`} onClick={() => setActiveTab('Logs')}>Lịch sử</button>
              <button className={`tab-btn ${activeTab === 'Comments' ? 'active' : ''}`} onClick={() => setActiveTab('Comments')}>Bình luận ({selectedTask.comments.length})</button>
            </div>

            {/* TAB: Details */}
            {activeTab === 'Details' && (
              <div className="task-detail-grid">
                <div className="task-detail-left">
                  <div>
                    <strong>Mô tả:</strong>
                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '6px' }}>{selectedTask.description || 'Không có mô tả chi tiết.'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {selectedTask.kpiIds.length > 0 && (
                      <div className="kpi-link-badge">
                        🎯 Đóng góp vào KPI ({selectedTask.kpiIds.length})
                      </div>
                    )}
                    {selectedTask.lmsCourseIds.length > 0 && (
                      <div className="lms-link-badge">
                        🎓 Yêu cầu học LMS ({selectedTask.lmsCourseIds.length})
                      </div>
                    )}
                  </div>
                </div>

                <div className="task-detail-right">
                  <div>
                    <strong>Trạng thái:</strong>
                    <select className="form-control" style={{ marginTop: '4px' }} value={selectedTask.status} onChange={(e: any) => handleUpdateStatusInModal(e.target.value)}>
                      <option value="ToDo">Việc cần làm</option>
                      <option value="InProgress">Đang thực hiện</option>
                      <option value="Review">Đang xem xét</option>
                      <option value="Done">Đã hoàn thành</option>
                      <option value="Cancelled">Đã hủy</option>
                    </select>
                  </div>
                  <div>
                    <strong>Mức ưu tiên:</strong>
                    <div className={`task-priority-badge ${selectedTask.priority}`} style={{ display: 'inline-block', marginTop: '4px' }}>
                      {selectedTask.priority}
                    </div>
                  </div>
                  <div>
                    <strong>Thời gian:</strong>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      Bắt đầu: {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : 'N/A'}<br />
                      Hạn chót: {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <strong>Người thực hiện:</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {selectedTask.assignees.map((a, i) => (
                        <span key={i} style={{ fontSize: '0.85rem' }}>
                          👤 {a.fullName} {a.isPrimaryAssignee && '⭐'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <button className="btn-chat-action" style={{ width: '100%', borderColor: 'var(--danger-border)', color: 'var(--danger)' }} onClick={() => handleRemoveTask(selectedTask.id)}>
                      Xóa công việc
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Subtasks */}
            {activeTab === 'Subtasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '12px' }}>
                  <input type="text" className="form-control" style={{ flex: 1 }} placeholder="Tên subtask mới..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} />
                  <button type="submit" className="btn-primary">Thêm</button>
                </form>

                <div className="subtasks-list">
                  {selectedTask.subtasks.map((sub) => (
                    <div key={sub.id} className="subtask-item">
                      <span style={{ textDecoration: sub.status === 'Done' ? 'line-through' : 'none' }}>
                        [{sub.taskCode}] {sub.title}
                      </span>
                      <span>{sub.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Logs */}
            {activeTab === 'Logs' && (
              <div className="activity-log-list">
                {selectedTask.activityLogs.map((log) => (
                  <div key={log.id} className="activity-log-item">
                    <div>
                      <strong>{log.fullName}</strong> {log.action === 'Created' && 'đã tạo công việc'}
                      {log.action === 'StatusChanged' && `đã đổi trạng thái từ "${log.oldValue}" sang "${log.newValue}"`}
                      {log.action === 'ProgressUpdated' && `đã cập nhật tiến độ sang ${log.newValue}%`}
                      {log.action === 'DueDateChanged' && `đã gia hạn/đổi deadline từ "${log.oldValue}" thành "${log.newValue}"`}
                      {log.action === 'CommentAdded' && `đã thêm bình luận: "${log.newValue}"`}
                      {log.action === 'Completed' && 'đã hoàn thành công việc'}
                    </div>
                    <span className="activity-log-time">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: Comments */}
            {activeTab === 'Comments' && (
              <div>
                <form onSubmit={handleAddComment} className="comment-editor">
                  {replyingComment && (
                    <div className="reply-preview">
                      <span>Trả lời bình luận của <strong>{replyingComment.fullName}</strong>: "{replyingComment.content}"</span>
                      <button type="button" className="chat-msg-opt-btn" onClick={() => setReplyingComment(null)}>✕</button>
                    </div>
                  )}
                  <textarea className="comment-input" placeholder="Viết bình luận..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>Gửi bình luận</button>
                </form>

                {renderComments(selectedTask.comments)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
