import { FormEvent, useEffect, useState } from 'react';
import { USER_STATUS_OPTIONS, userStatusLabel } from '../constants/enums';
import { HttpError } from '../api/http';
import { usersApi } from '../api/services';
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
  UserDepartmentDto,
  UserDto,
  UserStatus,
} from '../types/entities';

type ModalMode = 'form' | 'roles' | 'password' | 'departments' | null;

const emptyUserForm = {
  employeeCode: '',
  fullName: '',
  email: '',
  departmentId: '',
  jobLevelId: '',
  dateOfJoin: new Date().toISOString().slice(0, 10),
  status: 1 as UserStatus,
  managerId: '',
  avatarUrl: '',
  password: '',
  checkInTimeTarget: '',
  checkOutTimeTarget: '',
};

export function UsersPage() {
  const { departments, jobLevels, roles, ready } = useReferenceData();
  const {
    items: users,
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
  } = usePagination(usersApi.list);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<UserDto | null>(null);
  const [form, setForm] = useState(emptyUserForm);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [secondaryDepts, setSecondaryDepts] = useState<UserDepartmentDto[]>([]);
  const [addDeptForm, setAddDeptForm] = useState({
    departmentId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!ready) return;
    load(page, pageSize).catch((e) =>
      setError(e instanceof HttpError ? e.message : 'Không tải được dữ liệu'),
    );
  }, [ready, page, pageSize, load]);

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  function closeModal() {
    setMode(null);
    setSelected(null);
  }

  function openCreate() {
    setSelected(null);
    setForm({
      ...emptyUserForm,
      departmentId: departments[0]?.id ?? '',
      jobLevelId: jobLevels[0]?.id ?? '',
    });
    setMode('form');
  }

  function openEdit(user: UserDto) {
    setSelected(user);
    setForm({
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      departmentId: user.departmentId,
      jobLevelId: user.jobLevelId,
      dateOfJoin: user.dateOfJoin,
      status: user.status,
      managerId: user.managerId ?? '',
      avatarUrl: user.avatarUrl ?? '',
      password: '',
      checkInTimeTarget: user.checkInTimeTarget ?? '',
      checkOutTimeTarget: user.checkOutTimeTarget ?? '',
    });
    setMode('form');
  }

  async function openRoles(user: UserDto) {
    setSelected(user);
    const matched = roles.filter((r) => (user.roles ?? []).includes(r.roleName)).map((r) => r.id);
    setRoleIds(matched);
    setMode('roles');
  }

  function openPassword(user: UserDto) {
    setSelected(user);
    setNewPassword('');
    setShowResetPassword(false);
    setMode('password');
  }

  async function openDepartments(user: UserDto) {
    setSelected(user);
    try {
      setSecondaryDepts(await usersApi.listDepartments(user.id));
    } catch (e) {
      setSecondaryDepts([]);
      setError(e instanceof HttpError ? e.message : 'Không tải kiêm nhiệm');
    }
    setAddDeptForm({
      departmentId: departments[0]?.id ?? '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
    });
    setMode('departments');
  }

  async function handleSaveUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (selected) {
        await usersApi.update(selected.id, {
          fullName: form.fullName,
          email: form.email,
          departmentId: form.departmentId,
          jobLevelId: form.jobLevelId,
          dateOfJoin: form.dateOfJoin,
          status: form.status,
          managerId: form.managerId || null,
          avatarUrl: form.avatarUrl || null,
          checkInTimeTarget: form.checkInTimeTarget || null,
          checkOutTimeTarget: form.checkOutTimeTarget || null,
        });
        setSuccess('Cập nhật nhân sự thành công');
      } else {
        await usersApi.create({
          employeeCode: form.employeeCode,
          fullName: form.fullName,
          email: form.email,
          departmentId: form.departmentId,
          jobLevelId: form.jobLevelId,
          dateOfJoin: form.dateOfJoin,
          status: form.status,
          managerId: form.managerId || null,
          avatarUrl: form.avatarUrl || null,
          password: form.password || null,
          checkInTimeTarget: form.checkInTimeTarget || null,
          checkOutTimeTarget: form.checkOutTimeTarget || null,
        });
        setSuccess('Tạo nhân sự thành công');
      }
      closeModal();
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserDto) {
    if (!confirm(`Vô hiệu hóa nhân sự "${user.fullName}"?`)) return;
    try {
      await usersApi.remove(user.id);
      setSuccess('Đã vô hiệu hóa nhân sự');
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Xóa thất bại');
    }
  }

  async function saveRoles() {
    if (!selected) return;
    setSaving(true);
    try {
      await usersApi.assignRoles(selected.id, roleIds);
      setSuccess('Gán vai trò thành công');
      closeModal();
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Gán vai trò thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!selected) return;
    setSaving(true);
    try {
      await usersApi.resetPassword(selected.id, newPassword);
      setSuccess('Đặt lại mật khẩu thành công');
      closeModal();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Đặt mật khẩu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function addSecondaryDept() {
    if (!selected) return;
    setSaving(true);
    try {
      await usersApi.addDepartment(selected.id, {
        departmentId: addDeptForm.departmentId,
        startDate: addDeptForm.startDate,
        endDate: addDeptForm.endDate || null,
      });
      setSecondaryDepts(await usersApi.listDepartments(selected.id));
      setSuccess('Gán kiêm nhiệm thành công');
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Gán kiêm nhiệm thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function removeSecondaryDept(departmentId: string) {
    if (!selected) return;
    try {
      await usersApi.removeDepartment(selected.id, departmentId);
      setSecondaryDepts(await usersApi.listDepartments(selected.id));
      setSuccess('Đã gỡ kiêm nhiệm');
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Gỡ kiêm nhiệm thất bại');
    }
  }

  return (
    <div>
      <PageHeader
        title="Nhân sự"
        subtitle="Quản lý hồ sơ, vai trò, mật khẩu và phòng ban kiêm nhiệm"
        actions={
          <CanAccess permission={P.HRM_EMPLOYEE_CREATE}>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Thêm nhân sự
            </button>
          </CanAccess>
        }
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Tìm theo tên, mã NV, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="muted">{totalCount} nhân sự</span>
      </div>

      <div className="table-card">
        {loading ? (
          <p className="muted pad">Đang tải...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Phòng ban</th>
                <th>Cấp bậc</th>
                <th>Trạng thái</th>
                <th>Vai trò</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <code>{u.employeeCode}</code>
                  </td>
                  <td>
                    <strong>{u.fullName}</strong>
                    <small className="block muted">{u.email}</small>
                  </td>
                  <td>{u.departmentName}</td>
                  <td>{u.jobLevelName}</td>
                  <td>
                    <Badge active={u.isActive}>{userStatusLabel(u.status)}</Badge>
                  </td>
                  <td>
                    <span className="role-tags">{(u.roles ?? []).join(', ') || '—'}</span>
                  </td>
                  <td className="actions-cell wrap">
                    <CanAccess permission={P.HRM_EMPLOYEE_UPDATE}>
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(u)}>
                        Sửa
                      </button>
                    </CanAccess>
                    <CanAccess permission={P.SYSTEM_ROLE_ASSIGN}>
                      <button type="button" className="btn btn-sm" onClick={() => openRoles(u)}>
                        Vai trò
                      </button>
                    </CanAccess>
                    <CanAccess permission={P.SYSTEM_USER_RESETPASSWORD}>
                      <button type="button" className="btn btn-sm" onClick={() => openPassword(u)}>
                        MK
                      </button>
                    </CanAccess>
                    <CanAccess permission={P.HRM_EMPLOYEE_UPDATE}>
                      <button type="button" className="btn btn-sm" onClick={() => openDepartments(u)}>
                        Kiêm nhiệm
                      </button>
                    </CanAccess>
                    <CanAccess permission={P.HRM_EMPLOYEE_DELETE}>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(u)}
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

      <Modal
        title={selected ? `Sửa: ${selected.fullName}` : 'Thêm nhân sự'}
        open={mode === 'form'}
        onClose={closeModal}
        wide
      >
        <form className="form-grid" onSubmit={handleSaveUser} autoComplete="off">
          {!selected && (
            <label>
              Mã nhân viên *
              <input
                required
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              />
            </label>
          )}
          <label>
            Họ tên *
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>
          <label>
            Email *
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Phòng ban *
            <Select
              required
              value={form.departmentId}
              onChange={(v) => setForm({ ...form, departmentId: v })}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.departmentCode} — ${d.departmentName}`,
              }))}
            />
          </label>
          <label>
            Cấp bậc *
            <Select
              required
              value={form.jobLevelId}
              onChange={(v) => setForm({ ...form, jobLevelId: v })}
              options={jobLevels.map((j) => ({
                value: j.id,
                label: j.levelName,
              }))}
            />
          </label>
          <label>
            Ngày vào *
            <input
              type="date"
              required
              value={form.dateOfJoin}
              onChange={(e) => setForm({ ...form, dateOfJoin: e.target.value })}
            />
          </label>
          <label>
            Trạng thái *
            <Select
              value={form.status}
              onChange={(v) => setForm({ ...form, status: Number(v) as UserStatus })}
              options={USER_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          </label>
          <label>
            Quản lý trực tiếp
            <Select
              value={form.managerId}
              placeholder="— Không có —"
              onChange={(v) => setForm({ ...form, managerId: v })}
              options={[
                { value: '', label: '— Không có —' },
                ...users
                  .filter((u) => u.id !== selected?.id)
                  .map((u) => ({
                    value: u.id,
                    label: `${u.employeeCode} — ${u.fullName}`,
                  })),
              ]}
            />
          </label>
          {!selected && (
            <label>
              Mật khẩu ban đầu
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
          )}
          <label>
            Giờ vào làm mục tiêu (HH:mm)
            <input
              placeholder="VD: 08:30 (Mặc định: theo phòng ban)"
              value={form.checkInTimeTarget}
              onChange={(e) => setForm({ ...form, checkInTimeTarget: e.target.value })}
            />
          </label>
          <label>
            Giờ tan ca mục tiêu (HH:mm)
            <input
              placeholder="VD: 17:30 (Mặc định: theo phòng ban)"
              value={form.checkOutTimeTarget}
              onChange={(e) => setForm({ ...form, checkOutTimeTarget: e.target.value })}
            />
          </label>
          <div className="form-actions span-2">
            <button type="button" className="btn" onClick={closeModal}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Lưu
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Gán vai trò: ${selected?.fullName ?? ''}`}
        subtitle={`Chọn một hoặc nhiều vai trò · ${roleIds.length} đã chọn`}
        open={mode === 'roles'}
        onClose={closeModal}
      >
        <form
          className="role-assign-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveRoles();
          }}
        >
          <div className="role-select-list">
            {roles
              .filter((r) => r.isActive)
              .map((r) => (
                <label key={r.id} className="role-select-row">
                  <input
                    type="checkbox"
                    checked={roleIds.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) setRoleIds([...roleIds, r.id]);
                      else setRoleIds(roleIds.filter((id) => id !== r.id));
                    }}
                  />
                  <span className="role-select-body">
                    <span className="role-select-head">
                      <span className="role-select-name">{r.displayName}</span>
                      <code className="role-select-code">{r.roleName}</code>
                    </span>
                    {r.description && <span className="role-select-desc">{r.description}</span>}
                  </span>
                  {(r.isSystemRole || r.bypassDataScope) && (
                    <span className="role-select-badges">
                      {r.isSystemRole && <span className="tag tag-muted">Hệ thống</span>}
                      {r.bypassDataScope && <span className="tag">Bypass scope</span>}
                    </span>
                  )}
                </label>
              ))}
          </div>
          <div className="modal-footer">
            <div className="modal-footer-actions">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : `Lưu vai trò (${roleIds.length})`}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Đặt lại mật khẩu: ${selected?.fullName ?? ''}`}
        subtitle="Mật khẩu mới có hiệu lực ngay khi lưu"
        open={mode === 'password'}
        onClose={closeModal}
      >
        <form
          className="form-stack password-reset-form"
          onSubmit={(e) => {
            e.preventDefault();
            savePassword();
          }}
        >
          {selected && (
            <div className="form-info-box">
              <strong>{selected.employeeCode}</strong>
              <span>{selected.email}</span>
            </div>
          )}

          <label>
            Mật khẩu mới
            <div className="input-adorned">
              <input
                type={showResetPassword ? 'text' : 'password'}
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Tối thiểu 6 ký tự"
              />
              <button
                type="button"
                className="input-adorned-btn"
                onClick={() => setShowResetPassword((v) => !v)}
                aria-label={showResetPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showResetPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            <span className="form-hint">Người dùng sẽ đăng nhập bằng mật khẩu mới ở lần tiếp theo.</span>
          </label>

          <div className="modal-footer">
            <div className="modal-footer-actions">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || newPassword.length < 6}
              >
                {saving ? 'Đang lưu...' : 'Đặt mật khẩu'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Kiêm nhiệm: ${selected?.fullName ?? ''}`}
        open={mode === 'departments'}
        onClose={closeModal}
        wide
      >
        <h4 className="section-title">Phòng ban kiêm nhiệm hiện tại</h4>
        {secondaryDepts.length === 0 ? (
          <p className="muted">Chưa có kiêm nhiệm</p>
        ) : (
          <ul className="dept-list">
            {secondaryDepts.map((d) => (
              <li key={d.id}>
                <span>
                  {d.departmentCode} — {d.departmentName} ({d.startDate})
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => removeSecondaryDept(d.departmentId)}
                >
                  Gỡ
                </button>
              </li>
            ))}
          </ul>
        )}

        <h4 className="section-title">Thêm kiêm nhiệm</h4>
        <div className="form-grid">
          <label>
            Phòng ban
            <Select
              value={addDeptForm.departmentId}
              onChange={(v) => setAddDeptForm({ ...addDeptForm, departmentId: v })}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.departmentCode} — ${d.departmentName}`,
              }))}
            />
          </label>
          <label>
            Từ ngày
            <input
              type="date"
              value={addDeptForm.startDate}
              onChange={(e) => setAddDeptForm({ ...addDeptForm, startDate: e.target.value })}
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={closeModal}>
            Đóng
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={addSecondaryDept}>
            Thêm kiêm nhiệm
          </button>
        </div>
      </Modal>
    </div>
  );
}
