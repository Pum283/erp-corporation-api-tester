import { FormEvent, useEffect, useState } from 'react';
import { HttpError } from '../api/http';
import { notificationEventTypesApi } from '../api/services';
import { CanAccess } from '../components/auth/CanAccess';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { P } from '../config/permissions';
import { usePagination } from '../hooks/usePagination';
import type { NotificationEventTypeDto } from '../types/entities';

const emptyForm = {
  eventCode: '',
  name: '',
  module: 'HRM',
  description: '',
  defaultTitleTemplate: '',
  defaultBodyTemplate: '',
  isActive: true,
};

export function NotificationEventTypesPage() {
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
  } = usePagination(notificationEventTypesApi.list);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationEventTypeDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load(page, pageSize).catch((e) =>
      setError(e instanceof HttpError ? e.message : 'Không tải được danh sách'),
    );
  }, [page, pageSize, load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: NotificationEventTypeDto) {
    setEditing(item);
    setForm({
      eventCode: item.eventCode,
      name: item.name,
      module: item.module,
      description: item.description ?? '',
      defaultTitleTemplate: item.defaultTitleTemplate,
      defaultBodyTemplate: item.defaultBodyTemplate,
      isActive: item.isActive,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await notificationEventTypesApi.update(editing.id, {
          name: form.name,
          module: form.module,
          description: form.description || null,
          defaultTitleTemplate: form.defaultTitleTemplate,
          defaultBodyTemplate: form.defaultBodyTemplate,
          isActive: form.isActive,
        });
        setSuccess('Cập nhật loại thông báo thành công');
      } else {
        await notificationEventTypesApi.create({
          eventCode: form.eventCode,
          name: form.name,
          module: form.module,
          description: form.description || null,
          defaultTitleTemplate: form.defaultTitleTemplate,
          defaultBodyTemplate: form.defaultBodyTemplate,
        });
        setSuccess('Tạo loại thông báo thành công');
      }
      setModalOpen(false);
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: NotificationEventTypeDto) {
    if (!confirm(`Vô hiệu hóa loại "${item.name}"?`)) return;
    try {
      await notificationEventTypesApi.remove(item.id);
      setSuccess('Đã vô hiệu hóa loại thông báo');
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div>
      <PageHeader
        title="Loại thông báo"
        subtitle="Quản lý template nội dung thông báo (EventType)"
        actions={
          <CanAccess permission={P.SYSTEM_NOTIFICATION_EVENT_CREATE}>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Tạo loại mới
            </button>
          </CanAccess>
        }
      />

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Module</th>
                <th>Title mẫu</th>
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
              {!loading &&
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code>{item.eventCode}</code>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.module}</td>
                    <td className="truncate">{item.defaultTitleTemplate}</td>
                    <td>
                      <Badge active={item.isActive}>
                        {item.isActive ? 'Hoạt động' : 'Tắt'}
                      </Badge>
                    </td>
                    <td className="actions">
                      <CanAccess permission={P.SYSTEM_NOTIFICATION_EVENT_UPDATE}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                          Sửa
                        </button>
                      </CanAccess>
                      {item.isActive && (
                        <CanAccess permission={P.SYSTEM_NOTIFICATION_EVENT_DELETE}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(item)}>
                            Tắt
                          </button>
                        </CanAccess>
                      )}
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
        size="wide"
        title={editing ? 'Sửa loại thông báo' : 'Tạo loại thông báo'}
        subtitle={editing ? editing.eventCode : 'Định nghĩa template tiêu đề và nội dung thông báo'}
        onClose={() => setModalOpen(false)}
      >
        <form className="form-stack" onSubmit={handleSubmit}>
          {!editing && (
            <label>
              Mã (EventCode)
              <input
                value={form.eventCode}
                onChange={(e) => setForm({ ...form, eventCode: e.target.value })}
                placeholder="hrm.leave.approved"
                required
              />
              <span className="form-hint">Mã duy nhất, dạng <code>module.action</code></span>
            </label>
          )}

          <div className="form-grid">
            <label>
              Tên hiển thị
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Module
              <input value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} required />
            </label>
          </div>

          <label>
            Mô tả / gợi ý placeholder
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Ví dụ: {{fullName}}, {{employeeCode}}, {{actorName}}"
            />
          </label>

          <div className="form-section" style={{ paddingBottom: 0, marginBottom: 0, border: 'none' }}>
            <div className="form-section-title">Template nội dung</div>
            <label>
              Tiêu đề
              <input
                value={form.defaultTitleTemplate}
                onChange={(e) => setForm({ ...form, defaultTitleTemplate: e.target.value })}
                placeholder="Chào mừng {{fullName}}"
                required
              />
            </label>
            <label style={{ marginTop: '0.85rem' }}>
              Nội dung
              <textarea
                value={form.defaultBodyTemplate}
                onChange={(e) => setForm({ ...form, defaultBodyTemplate: e.target.value })}
                rows={4}
                placeholder="Tài khoản {{employeeCode}} đã được tạo bởi {{actorName}}."
                required
              />
              <span className="form-hint">
                Dùng <code>{'{{placeholder}}'}</code> — hệ thống thay thế khi gửi thông báo.
              </span>
            </label>
          </div>

          {editing && (
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Đang hoạt động
            </label>
          )}

          <div className="modal-footer">
            <span />
            <div className="modal-footer-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
