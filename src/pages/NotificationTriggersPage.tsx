import { FormEvent, useEffect, useState } from 'react';
import { HttpError } from '../api/http';
import { notificationEventTypesApi, notificationTriggersApi, usersApi } from '../api/services';
import { CanAccess } from '../components/auth/CanAccess';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { useReferenceData } from '../context/ReferenceDataContext';
import { P } from '../config/permissions';
import { usePagination } from '../hooks/usePagination';
import type {
  NotificationEventTypeDto,
  NotificationRecipientRulesDto,
  NotificationTriggerBindingDto,
  UserDto,
} from '../types/entities';

const emptyRecipientRules: NotificationRecipientRulesDto = {
  includeSubjectUser: false,
  includeActor: false,
  includeSuperAdmins: false,
  includeDepartmentManager: false,
  roleIds: [],
  userIds: [],
};

function summarizeRecipients(rules: NotificationRecipientRulesDto | undefined | null, roleMap: Map<string, string>): string {
  const r = rules ?? emptyRecipientRules;
  const parts: string[] = [];
  if (r.includeSubjectUser) parts.push('Nhân viên liên quan');
  if (r.includeActor) parts.push('Người thực hiện');
  if (r.includeSuperAdmins) parts.push('Super Admin');
  if (r.includeDepartmentManager) parts.push('Quản lý phòng ban');
  r.roleIds?.forEach((id) => {
    const name = roleMap.get(id);
    if (name) parts.push(`Vai trò: ${name}`);
  });
  if ((r.userIds?.length ?? 0) > 0) parts.push(`${r.userIds!.length} người cụ thể`);
  return parts.length > 0 ? parts.join(', ') : 'Chưa cấu hình';
}

export function NotificationTriggersPage() {
  const { roles } = useReferenceData();
  const {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    loading,
    load,
    goToPage,
    changePageSize,
  } = usePagination(notificationTriggersApi.list);
  const [eventTypes, setEventTypes] = useState<NotificationEventTypeDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<NotificationTriggerBindingDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    eventTypeId: '',
    linkUrlTemplate: '',
    isActive: true,
    recipientRules: emptyRecipientRules,
  });
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const roleMap = new Map(roles.map((r) => [r.id, r.displayName]));

  const filteredUsers = users.filter((user) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      user.fullName.toLowerCase().includes(q) ||
      user.employeeCode.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    load(page, pageSize).catch((e) =>
      setError(e instanceof HttpError ? e.message : 'Không tải được danh sách'),
    );
  }, [page, pageSize, load]);

  useEffect(() => {
    if (!modalOpen) return;
    notificationEventTypesApi
      .list({ page: 1, pageSize: 100 })
      .then((res) => setEventTypes(res.items.filter((e) => e.isActive)))
      .catch(() => undefined);
    usersApi
      .listAll()
      .then(setUsers)
      .catch(() => undefined);
  }, [modalOpen]);

  function openEdit(item: NotificationTriggerBindingDto) {
    setEditing(item);
    setUserSearch('');
    setForm({
      eventTypeId: item.eventTypeId ?? '',
      linkUrlTemplate: item.linkUrlTemplate ?? '',
      isActive: item.isActive,
      recipientRules: item.recipientRules ?? emptyRecipientRules,
    });
    setModalOpen(true);
  }

  function toggleRole(roleId: string) {
    setForm((prev) => {
      const exists = prev.recipientRules.roleIds.includes(roleId);
      const roleIds = exists
        ? prev.recipientRules.roleIds.filter((id) => id !== roleId)
        : [...prev.recipientRules.roleIds, roleId];
      return {
        ...prev,
        recipientRules: { ...prev.recipientRules, roleIds },
      };
    });
  }

  function toggleUser(userId: string) {
    setForm((prev) => {
      const exists = prev.recipientRules.userIds.includes(userId);
      const userIds = exists
        ? prev.recipientRules.userIds.filter((id) => id !== userId)
        : [...prev.recipientRules.userIds, userId];
      return {
        ...prev,
        recipientRules: { ...prev.recipientRules, userIds },
      };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await notificationTriggersApi.updateBinding(editing.triggerKey, {
        eventTypeId: form.eventTypeId || null,
        linkUrlTemplate: form.linkUrlTemplate || null,
        recipientRules: form.recipientRules,
        isActive: form.isActive,
      });
      setSuccess('Đã cập nhật gán thông báo');
      setModalOpen(false);
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Gán thông báo cho chức năng"
        subtitle="Chọn loại thông báo và người nhận cho từng điểm kích hoạt (Trigger)"
      />

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="card">
        <div className="table-wrap">
          <table className="data-table responsive-table triggers-table">
            <thead>
              <tr>
                <th>Trigger</th>
                <th>Chức năng</th>
                <th>Loại thông báo</th>
                <th>Người nhận</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="muted">
                    Đang tải…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Chưa có trigger nào. Khởi động lại API (Development) để seed dữ liệu mặc định.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code>{item.triggerKey}</code>
                    </td>
                    <td>{item.name}</td>
                    <td>
                      {item.eventTypeName ? (
                        <>
                          <strong>{item.eventTypeName}</strong>
                          <br />
                          <small className="muted">{item.eventCode}</small>
                        </>
                      ) : (
                        <span className="muted">Chưa gán</span>
                      )}
                    </td>
                    <td className="truncate" title={summarizeRecipients(item.recipientRules, roleMap)}>
                      {summarizeRecipients(item.recipientRules, roleMap)}
                    </td>
                    <td>
                      <Badge active={item.isActive}>{item.isActive ? 'Bật' : 'Tắt'}</Badge>
                    </td>
                    <td className="actions">
                      <CanAccess permission={P.SYSTEM_NOTIFICATION_TRIGGER_UPDATE}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                          Gán / Sửa
                        </button>
                      </CanAccess>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      </div>

      <Modal
        open={modalOpen}
        size="xl"
        title={editing ? `Gán thông báo: ${editing.name}` : 'Gán thông báo'}
        subtitle={editing ? editing.triggerKey : undefined}
        onClose={() => setModalOpen(false)}
      >
        {editing && (
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="form-section-title">Cấu hình cơ bản</div>
              {editing.description && <p className="form-section-desc">{editing.description}</p>}
              <div className="form-grid">
                <label className="full">
                  Loại thông báo
                  <Select
                    value={form.eventTypeId}
                    placeholder="— Chưa gán —"
                    onChange={(v) => setForm({ ...form, eventTypeId: v })}
                    options={[
                      { value: '', label: '— Chưa gán —' },
                      ...eventTypes.map((et) => ({
                        value: et.id,
                        label: `${et.name} (${et.eventCode})`,
                      })),
                    ]}
                  />
                </label>
                <label className="full">
                  Link URL template
                  <input
                    value={form.linkUrlTemplate}
                    onChange={(e) => setForm({ ...form, linkUrlTemplate: e.target.value })}
                    placeholder="/users/{{userId}}"
                  />
                  <span className="form-hint">Đường dẫn khi người dùng bấm vào thông báo.</span>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Người nhận nhanh</div>
              <div className="option-grid">
                <label className="option-card">
                  <input
                    type="checkbox"
                    checked={form.recipientRules.includeSubjectUser}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recipientRules: { ...form.recipientRules, includeSubjectUser: e.target.checked },
                      })
                    }
                  />
                  <span className="option-card-text">
                    <strong>Nhân viên liên quan</strong>
                    <small>Người là đối tượng của sự kiện (subject)</small>
                  </span>
                </label>
                <label className="option-card">
                  <input
                    type="checkbox"
                    checked={form.recipientRules.includeActor}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recipientRules: { ...form.recipientRules, includeActor: e.target.checked },
                      })
                    }
                  />
                  <span className="option-card-text">
                    <strong>Người thực hiện</strong>
                    <small>Admin/HR đang thao tác trên hệ thống</small>
                  </span>
                </label>
                <label className="option-card">
                  <input
                    type="checkbox"
                    checked={form.recipientRules.includeSuperAdmins}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recipientRules: { ...form.recipientRules, includeSuperAdmins: e.target.checked },
                      })
                    }
                  />
                  <span className="option-card-text">
                    <strong>Super Admin</strong>
                    <small>Tất cả tài khoản super admin</small>
                  </span>
                </label>
                <label className="option-card">
                  <input
                    type="checkbox"
                    checked={form.recipientRules.includeDepartmentManager}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recipientRules: { ...form.recipientRules, includeDepartmentManager: e.target.checked },
                      })
                    }
                  />
                  <span className="option-card-text">
                    <strong>Quản lý phòng ban</strong>
                    <small>Manager của phòng ban nhân viên liên quan</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="recipient-panels">
              <div className="recipient-panel">
                <div className="form-section-title">
                  Theo vai trò
                  {form.recipientRules.roleIds.length > 0 && (
                    <span className="section-count">{form.recipientRules.roleIds.length} đã chọn</span>
                  )}
                </div>
                <div className="pick-panel">
                  <div className="pick-list pick-list-compact">
                    {roles
                      .filter((r) => r.isActive)
                      .map((role) => (
                        <label key={role.id} className="pick-item">
                          <input
                            type="checkbox"
                            checked={form.recipientRules.roleIds.includes(role.id)}
                            onChange={() => toggleRole(role.id)}
                          />
                          <span className="pick-item-meta">
                            <span className="pick-item-name">{role.displayName}</span>
                            <code className="pick-item-code">{role.roleName}</code>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>

              <div className="recipient-panel">
                <div className="form-section-title">
                  Người nhận cụ thể
                  {form.recipientRules.userIds.length > 0 && (
                    <span className="section-count">{form.recipientRules.userIds.length} đã chọn</span>
                  )}
                </div>
                <div className="pick-panel">
                  <div className="pick-panel-head pick-search">
                    <span className="pick-search-icon" aria-hidden>
                      ⌕
                    </span>
                    <input
                      type="search"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Tìm theo tên, mã NV, email…"
                    />
                  </div>
                  <div className="pick-list pick-list-compact">
                    {filteredUsers.length === 0 && (
                      <div className="pick-empty">Không tìm thấy nhân sự phù hợp</div>
                    )}
                    {filteredUsers.map((user) => (
                      <label key={user.id} className="pick-item">
                        <input
                          type="checkbox"
                          checked={form.recipientRules.userIds.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                        />
                        <span className="pick-item-avatar">{user.fullName.charAt(0)}</span>
                        <span className="pick-item-meta">
                          <span className="pick-item-name">{user.fullName}</span>
                          <code className="pick-item-code">{user.employeeCode}</code>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Bật gửi thông báo
              </label>
              <div className="modal-footer-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu…' : 'Lưu gán'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
