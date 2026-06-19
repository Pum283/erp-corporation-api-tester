import { FormEvent, useCallback, useEffect, useState } from 'react';
import { HttpError } from '../api/http';
import { departmentsApi, usersApi } from '../api/services';
import { DepartmentTree } from '../components/ui/DepartmentTree';
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
import type { DepartmentDto, UserDto } from '../types/entities';

const emptyForm = {
  departmentName: '',
  departmentCode: '',
  parentDepartmentId: '',
  managerId: '',
  description: '',
  isActive: true,
  checkInTimeTarget: '08:00',
  checkOutTimeTarget: '17:00',
};

type ViewMode = 'table' | 'tree';

export function DepartmentsPage() {
  const { departments: allDepartments, refreshDepartments, ready } = useReferenceData();
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
  } = usePagination(departmentsApi.list);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [allDepts, setAllDepts] = useState<DepartmentDto[]>([]);
  const [allDeptsLoading, setAllDeptsLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setUsersLoading(true);
    usersApi
      .listAll()
      .then(setUsers)
      .catch((e) => setError(e instanceof HttpError ? e.message : 'Không tải được nhân sự'))
      .finally(() => setUsersLoading(false));
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    load(page, pageSize).catch((e) =>
      setError(e instanceof HttpError ? e.message : 'Không tải được danh sách'),
    );
  }, [ready, page, pageSize, load]);

  // Load all departments for tree view
  const loadAllDepts = useCallback(async () => {
    if (!ready) return;
    setAllDeptsLoading(true);
    try {
      const data = await departmentsApi.listAll();
      setAllDepts(data);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Không tải được danh sách');
    } finally {
      setAllDeptsLoading(false);
    }
  }, [ready]);

  useEffect(() => {
    if (viewMode === 'tree') {
      loadAllDepts();
    }
  }, [viewMode, loadAllDepts]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: DepartmentDto) {
    setEditing(item);
    setForm({
      departmentName: item.departmentName,
      departmentCode: item.departmentCode,
      parentDepartmentId: item.parentDepartmentId ?? '',
      managerId: item.managerId ?? '',
      description: item.description ?? '',
      isActive: item.isActive,
      checkInTimeTarget: item.checkInTimeTarget ?? '08:00',
      checkOutTimeTarget: item.checkOutTimeTarget ?? '17:00',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      departmentName: form.departmentName,
      departmentCode: form.departmentCode,
      parentDepartmentId: form.parentDepartmentId || null,
      managerId: form.managerId || null,
      description: form.description || null,
      isActive: form.isActive,
      checkInTimeTarget: form.checkInTimeTarget || '08:00',
      checkOutTimeTarget: form.checkOutTimeTarget || '17:00',
    };
    try {
      if (editing) {
        await departmentsApi.update(editing.id, payload);
        setSuccess('Cập nhật phòng ban thành công');
      } else {
        await departmentsApi.create(payload);
        setSuccess('Tạo phòng ban thành công');
      }
      setModalOpen(false);
      await refreshDepartments();
      await load(page, pageSize);
      if (viewMode === 'tree') await loadAllDepts();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: DepartmentDto) {
    if (!confirm(`Vô hiệu hóa phòng ban "${item.departmentName}"?`)) return;
    try {
      await departmentsApi.remove(item.id);
      setSuccess('Đã vô hiệu hóa phòng ban');
      await refreshDepartments();
      await load(page, pageSize);
      if (viewMode === 'tree') await loadAllDepts();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Xóa thất bại');
    }
  }

  /** Drag & drop reparent */
  async function handleReparent(deptId: string, newParentId: string | null) {
    const dept = allDepts.find((d) => d.id === deptId);
    if (!dept) return;
    // Optimistic update
    setAllDepts((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? {
              ...d,
              parentDepartmentId: newParentId,
              parentDepartmentName:
                newParentId ? allDepts.find((x) => x.id === newParentId)?.departmentName ?? null : null,
            }
          : d,
      ),
    );
    try {
      await departmentsApi.update(deptId, {
        departmentName: dept.departmentName,
        departmentCode: dept.departmentCode,
        parentDepartmentId: newParentId,
        managerId: dept.managerId ?? null,
        description: dept.description ?? null,
        isActive: dept.isActive,
        checkInTimeTarget: dept.checkInTimeTarget ?? '08:00',
        checkOutTimeTarget: dept.checkOutTimeTarget ?? '17:00',
      });
      setSuccess('Đã cập nhật phòng ban cha');
      await refreshDepartments();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Không thể cập nhật phòng ban cha');
      // Revert
      await loadAllDepts();
    }
  }

  return (
    <div>
      <PageHeader
        title="Phòng ban"
        subtitle="Quản lý cơ cấu tổ chức, phòng ban cha/con và trưởng phòng"
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* View mode toggle */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn${viewMode === 'table' ? ' active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Chế độ bảng"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                Bảng
              </button>
              <button
                type="button"
                className={`view-mode-btn${viewMode === 'tree' ? ' active' : ''}`}
                onClick={() => setViewMode('tree')}
                title="Biểu đồ cây"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="2" width="6" height="4" rx="1" />
                  <rect x="2" y="10" width="6" height="4" rx="1" />
                  <rect x="16" y="10" width="6" height="4" rx="1" />
                  <rect x="9" y="18" width="6" height="4" rx="1" />
                  <line x1="12" y1="6" x2="12" y2="10" />
                  <line x1="5" y1="14" x2="5" y2="18" />
                  <line x1="19" y1="14" x2="19" y2="18" />
                  <line x1="5" y1="10" x2="19" y2="10" />
                  <line x1="12" y1="18" x2="5" y2="18" />
                  <line x1="12" y1="18" x2="19" y2="18" />
                </svg>
                Sơ đồ cây
              </button>
            </div>

            <CanAccess permission={P.HRM_DEPARTMENT_CREATE}>
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                + Thêm phòng ban
              </button>
            </CanAccess>
          </div>
        }
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="table-card">
          {loading || usersLoading ? (
            <p className="muted pad">Đang tải...</p>
          ) : (
            <table className="data-table responsive-table departments-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên phòng ban</th>
                  <th>Phòng cha</th>
                  <th>Trưởng phòng</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <code>{d.departmentCode}</code>
                    </td>
                    <td>{d.departmentName}</td>
                    <td>{d.parentDepartmentName ?? '—'}</td>
                    <td>{d.managerName ?? '—'}</td>
                    <td>
                      <Badge active={d.isActive}>{d.isActive ? 'Hoạt động' : 'Ngừng'}</Badge>
                    </td>
                    <td className="actions-cell">
                      <CanAccess permission={P.HRM_DEPARTMENT_UPDATE}>
                        <button type="button" className="btn btn-sm" onClick={() => openEdit(d)}>
                          Sửa
                        </button>
                      </CanAccess>
                      <CanAccess permission={P.HRM_DEPARTMENT_DELETE}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(d)}
                        >
                          Xóa
                        </button>
                      </CanAccess>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
      )}

      {/* ── TREE VIEW ── */}
      {viewMode === 'tree' && (
        <div className="table-card" style={{ padding: '0', overflow: 'hidden' }}>
          {allDeptsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', padding: '100px 0' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Đang tải sơ đồ...
            </div>
          ) : (
            <DepartmentTree
              departments={allDepts}
              onEdit={openEdit}
              onDelete={handleDelete}
              onReparent={handleReparent}
              canEdit={true}
              canDelete={true}
            />
          )}
        </div>
      )}

      {/* ── MODAL ── */}
      <Modal
        title={editing ? 'Cập nhật phòng ban' : 'Thêm phòng ban'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
          <label>
            Tên phòng ban *
            <input
              required
              value={form.departmentName}
              onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
            />
          </label>
          <label>
            Mã phòng ban *
            <input
              required
              value={form.departmentCode}
              onChange={(e) => setForm({ ...form, departmentCode: e.target.value })}
            />
          </label>
          <label>
            Phòng ban cha
            <Select
              value={form.parentDepartmentId}
              placeholder="— Không có —"
              onChange={(v) => setForm({ ...form, parentDepartmentId: v })}
              options={[
                { value: '', label: '— Không có —' },
                ...allDepartments
                  .filter((d) => d.id !== editing?.id)
                  .map((d) => ({
                    value: d.id,
                    label: `${d.departmentCode} — ${d.departmentName}`,
                  })),
              ]}
            />
          </label>
          <label>
            Trưởng phòng
            <Select
              value={form.managerId}
              placeholder="— Chưa gán —"
              onChange={(v) => setForm({ ...form, managerId: v })}
              options={[
                { value: '', label: '— Chưa gán —' },
                ...users.map((u) => ({
                  value: u.id,
                  label: `${u.employeeCode} — ${u.fullName}`,
                })),
              ]}
            />
          </label>
          <label className="span-2">
            Mô tả
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            Giờ vào làm mục tiêu (HH:mm) *
            <input
              required
              placeholder="VD: 08:00"
              value={form.checkInTimeTarget}
              onChange={(e) => setForm({ ...form, checkInTimeTarget: e.target.value })}
            />
          </label>
          <label>
            Giờ tan ca mục tiêu (HH:mm) *
            <input
              required
              placeholder="VD: 17:00"
              value={form.checkOutTimeTarget}
              onChange={(e) => setForm({ ...form, checkOutTimeTarget: e.target.value })}
            />
          </label>
          {editing && (
            <label className="checkbox-label span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Đang hoạt động
            </label>
          )}
          </div>
          <div className="modal-footer">
            <div className="modal-footer-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || usersLoading}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
