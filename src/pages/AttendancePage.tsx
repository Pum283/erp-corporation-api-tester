import { FormEvent, useCallback, useEffect, useState } from 'react';
import { HttpError } from '../api/http';
import { attendanceApi, usersApi } from '../api/services';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { useReferenceData } from '../context/ReferenceDataContext';
import { useAuth } from '../context/AuthContext';
import { P } from '../config/permissions';
import { usePagination } from '../hooks/usePagination';
import { useAccess } from '../hooks/useAccess';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Clock,
  Search,
  MapPin,
  Compass,
  Users,
  User,
  Building,
  Settings,
  Plus
} from 'lucide-react';
import type {
  AttendanceLocationDto,
  AttendanceLogDto,
  UserDto,
  AttendanceDto,
  AttendanceType,
} from '../types/entities';
import './AttendancePage.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapClickEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}


const emptyLocationForm = {
  name: '',
  latitude: 21.0285,
  longitude: 105.8542,
  radiusInMeters: 100,
  isActive: true,
  assignedUserIds: [] as string[],
  assignedDepartmentIds: [] as string[],
};

export function AttendancePage() {
  const { user } = useAuth();
  const { departments, ready: refReady } = useReferenceData();
  const { hasPermission } = useAccess();

  const canManageLocations = hasPermission(P.ATTENDANCES_LOCATION_MANAGE);
  const canReadLogs = hasPermission(P.ATTENDANCES_LOG_READ);

  const [activeTab, setActiveTab] = useState<'checkin' | 'locations' | 'logs'>('checkin');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Clock state
  const [now, setNow] = useState(new Date());

  // Geolocation state
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceDto | null>(null);

  // Re-checkin / re-checkout confirmation state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState<AttendanceType | null>(null);

  const fetchTodayStatus = useCallback(async () => {
    try {
      const record = await attendanceApi.getTodayStatus();
      setTodayRecord(record);
    } catch (err) {
      console.error('Không tải được trạng thái chấm công hôm nay:', err);
    }
  }, []);

  // Tab 1: Personal Logs
  const [personalAllLogs, setPersonalAllLogs] = useState<AttendanceLogDto[]>([]);
  const [loadingPersonalLogs, setLoadingPersonalLogs] = useState(false);
  const [selectedPersonalDate, setSelectedPersonalDate] = useState<string | null>(null);

  const fetchPersonalAllLogs = useCallback(async () => {
    if (!user?.id) return;
    setLoadingPersonalLogs(true);
    try {
      const res = await attendanceApi.listLogs({ userId: user.id, pageSize: 2000 });
      setPersonalAllLogs(res.items);
    } catch (err) {
      console.error('Không tải được lịch sử chấm công cá nhân:', err);
    } finally {
      setLoadingPersonalLogs(false);
    }
  }, [user?.id]);

  // Tab 2: Locations Pagination
  const [locationSearch, setLocationSearch] = useState('');
  const fetchLocations = useCallback(
    (params: any) => attendanceApi.listLocations({ ...params, search: locationSearch }),
    [locationSearch]
  );
  const locations = usePagination<AttendanceLocationDto>(fetchLocations);

  // Drill-down Staff Logs State
  const [drillDownUser, setDrillDownUser] = useState<UserDto | null>(null);
  const [drillDownDate, setDrillDownDate] = useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedUserLogs, setSelectedUserLogs] = useState<AttendanceLogDto[]>([]);
  const [loadingUserLogs, setLoadingUserLogs] = useState(false);

  // Locations Form & Modal State
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AttendanceLocationDto | null>(null);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [savingLocation, setSavingLocation] = useState(false);

  // New Dedicated Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignLocation, setAssignLocation] = useState<AttendanceLocationDto | null>(null);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [assignTab, setAssignTab] = useState<'depts' | 'users'>('depts');
  const [assignUserSearch, setAssignUserSearch] = useState('');
  const [assignDeptSearch, setAssignDeptSearch] = useState('');



  // Ticking digital clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request browser geolocation on mount or tab select
  const getBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setFetchingGeo(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setFetchingGeo(false);
      },
      (err) => {
        let msg = 'Không thể lấy được vị trí GPS hiện tại.';
        if (err.code === 1) msg = 'Vui lòng cấp quyền truy cập GPS cho trình duyệt.';
        else if (err.code === 2) msg = 'Vị trí GPS không khả dụng.';
        else if (err.code === 3) msg = 'Hết thời gian yêu cầu lấy vị trí GPS.';
        setGeoError(msg);
        setFetchingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (activeTab === 'checkin') {
      getBrowserLocation();
      fetchTodayStatus();
      if (user?.id) {
        fetchPersonalAllLogs().catch(() => undefined);
      }
    }
  }, [activeTab, getBrowserLocation, fetchTodayStatus, user?.id]);

  // Load locations on tab switch
  useEffect(() => {
    if (activeTab === 'locations' && refReady && canManageLocations) {
      locations.load(1, locations.pageSize).catch(() => undefined);
    }
  }, [activeTab, locationSearch, refReady, canManageLocations]);

  // Fetch users list for assigning locations or history viewing
  useEffect(() => {
    if (((locationModalOpen || assignModalOpen) && canManageLocations) || (activeTab === 'logs' && canReadLogs)) {
      usersApi.listAll()
        .then(setAllUsers)
        .catch(() => setError('Không tải được danh sách nhân sự'));
    }
  }, [locationModalOpen, assignModalOpen, activeTab, canManageLocations, canReadLogs]);

  // Fetch logs for drill-down user
  useEffect(() => {
    if (drillDownUser) {
      setLoadingUserLogs(true);
      attendanceApi.listLogs({ userId: drillDownUser.id, pageSize: 2000 })
        .then((res) => {
          setSelectedUserLogs(res.items);
        })
        .catch(() => {
          setError('Không tải được lịch sử chấm công của nhân viên.');
        })
        .finally(() => {
          setLoadingUserLogs(false);
        });
    } else {
      setSelectedUserLogs([]);
    }
  }, [drillDownUser]);

  // Handler for Check-In/Check-Out
  async function handleCheckIn(type: AttendanceType) {
    if (!coords) {
      setError('Vui lòng bật định vị GPS trước khi thực hiện chấm công.');
      return;
    }

    setCheckingIn(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await attendanceApi.checkIn({
        latitude: coords.latitude,
        longitude: coords.longitude,
        type,
      });

      if (result.isSuccess) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }

      // Reload today's status and personal history logs
      await fetchTodayStatus();
      await fetchPersonalAllLogs();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chấm công thất bại. Vui lòng thử lại.');
    } finally {
      setCheckingIn(false);
    }
  }

  // Handle click to check-in/out and show confirmation modal if already done
  function handleCheckInClick(type: AttendanceType) {
    const isAlreadyDone = type === 'CheckIn' ? !!todayRecord?.checkInTime : !!todayRecord?.checkOutTime;
    if (isAlreadyDone) {
      setConfirmType(type);
      setShowConfirmModal(true);
    } else {
      handleCheckIn(type);
    }
  }

  // Location Form Helper Functions
  function openCreateLocation() {
    setEditingLocation(null);
    setLocationForm({
      ...emptyLocationForm,
      assignedUserIds: [],
      assignedDepartmentIds: [],
    });
    setLocationModalOpen(true);
  }

  function openEditLocation(loc: AttendanceLocationDto) {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusInMeters: loc.radiusInMeters,
      isActive: loc.isActive,
      assignedUserIds: [...loc.assignedUserIds],
      assignedDepartmentIds: [...loc.assignedDepartmentIds],
    });
    setLocationModalOpen(true);
  }

  async function handleSaveLocation(e: FormEvent) {
    e.preventDefault();
    setSavingLocation(true);
    setError(null);

    const payload = {
      name: locationForm.name,
      latitude: Number(locationForm.latitude),
      longitude: Number(locationForm.longitude),
      radiusInMeters: Number(locationForm.radiusInMeters),
      assignedUserIds: editingLocation ? editingLocation.assignedUserIds : [],
      assignedDepartmentIds: editingLocation ? editingLocation.assignedDepartmentIds : [],
    };

    try {
      if (editingLocation) {
        await attendanceApi.updateLocation(editingLocation.id, {
          ...payload,
          isActive: locationForm.isActive,
        });
        setSuccess('Cập nhật vị trí chấm công thành công.');
      } else {
        await attendanceApi.createLocation(payload);
        setSuccess('Thêm vị trí chấm công thành công.');
      }
      setLocationModalOpen(false);
      await locations.load(locations.page, locations.pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Không lưu được vị trí chấm công.');
    } finally {
      setSavingLocation(false);
    }
  }

  function openAssignLocation(loc: AttendanceLocationDto) {
    setAssignLocation(loc);
    setAssignedDeptIds([...loc.assignedDepartmentIds]);
    setAssignedUserIds([...loc.assignedUserIds]);
    setAssignTab('depts');
    setAssignUserSearch('');
    setAssignDeptSearch('');
    setAssignModalOpen(true);
  }

  async function handleSaveAssignments() {
    if (!assignLocation) return;
    setSavingLocation(true);
    setError(null);
    try {
      await attendanceApi.updateLocation(assignLocation.id, {
        name: assignLocation.name,
        latitude: assignLocation.latitude,
        longitude: assignLocation.longitude,
        radiusInMeters: assignLocation.radiusInMeters,
        isActive: assignLocation.isActive,
        assignedDepartmentIds: assignedDeptIds,
        assignedUserIds: assignedUserIds,
      });
      setSuccess('Cập nhật gán đối tượng áp dụng thành công.');
      setAssignModalOpen(false);
      await locations.load(locations.page, locations.pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Không lưu được cấu hình gán.');
    } finally {
      setSavingLocation(false);
    }
  }

  const getWorkDuration = (inTimeStr?: string, outTimeStr?: string) => {
    if (!inTimeStr || !outTimeStr) return '—';
    const tIn = new Date(inTimeStr);
    const tOut = new Date(outTimeStr);
    const diffMs = tOut.getTime() - tIn.getTime();
    if (diffMs <= 0) return '—';
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  const groupedDays = selectedUserLogs.reduce((acc, log) => {
    const dateStr = new Date(log.checkTime).toLocaleDateString('vi-VN');
    if (!acc[dateStr]) {
      acc[dateStr] = {
        dateStr,
        rawDate: new Date(log.checkTime).toISOString().slice(0, 10),
        checkIn: null as AttendanceLogDto | null,
        checkOut: null as AttendanceLogDto | null,
        logs: [] as AttendanceLogDto[]
      };
    }
    acc[dateStr].logs.push(log);
    if (log.isSuccess) {
      if (log.type === 'CheckIn' && (!acc[dateStr].checkIn || new Date(log.checkTime) < new Date(acc[dateStr].checkIn.checkTime))) {
        acc[dateStr].checkIn = log;
      }
      if (log.type === 'CheckOut' && (!acc[dateStr].checkOut || new Date(log.checkTime) > new Date(acc[dateStr].checkOut.checkTime))) {
        acc[dateStr].checkOut = log;
      }
    }
    return acc;
  }, {} as Record<string, { dateStr: string; rawDate: string; checkIn: AttendanceLogDto | null; checkOut: AttendanceLogDto | null; logs: AttendanceLogDto[] }>);

  const daysList = Object.values(groupedDays).sort((a, b) => b.rawDate.localeCompare(a.rawDate));

  const groupedPersonalDays = personalAllLogs.reduce((acc, log) => {
    const dateStr = new Date(log.checkTime).toLocaleDateString('vi-VN');
    if (!acc[dateStr]) {
      acc[dateStr] = {
        dateStr,
        rawDate: new Date(log.checkTime).toISOString().slice(0, 10),
        checkIn: null as AttendanceLogDto | null,
        checkOut: null as AttendanceLogDto | null,
        logs: [] as AttendanceLogDto[]
      };
    }
    acc[dateStr].logs.push(log);
    if (log.isSuccess) {
      if (log.type === 'CheckIn' && (!acc[dateStr].checkIn || new Date(log.checkTime) < new Date(acc[dateStr].checkIn.checkTime))) {
        acc[dateStr].checkIn = log;
      }
      if (log.type === 'CheckOut' && (!acc[dateStr].checkOut || new Date(log.checkTime) > new Date(acc[dateStr].checkOut.checkTime))) {
        acc[dateStr].checkOut = log;
      }
    }
    return acc;
  }, {} as Record<string, { dateStr: string; rawDate: string; checkIn: AttendanceLogDto | null; checkOut: AttendanceLogDto | null; logs: AttendanceLogDto[] }>);

  const personalDaysList = Object.values(groupedPersonalDays).sort((a, b) => b.rawDate.localeCompare(a.rawDate));

  const filteredStaff = allUsers.filter((u) => {
    const q = staffSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.employeeCode.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });


  const getShiftTargets = useCallback((u: UserDto | null) => {
    if (!u) return { checkIn: '08:00', checkOut: '17:00' };
    const dept = departments.find(d => d.id === u.departmentId);
    const checkIn = u.checkInTimeTarget || dept?.checkInTimeTarget || '08:00';
    const checkOut = u.checkOutTimeTarget || dept?.checkOutTimeTarget || '17:00';
    return { checkIn, checkOut };
  }, [departments]);

  const checkLate = (checkTimeStr: string | undefined, targetTime: string) => {
    if (!checkTimeStr) return false;
    const time = new Date(checkTimeStr);
    const timeStr = time.toTimeString().slice(0, 5); // "HH:mm"
    return timeStr > targetTime;
  };

  const checkEarly = (checkTimeStr: string | undefined, targetTime: string) => {
    if (!checkTimeStr) return false;
    const time = new Date(checkTimeStr);
    const timeStr = time.toTimeString().slice(0, 5); // "HH:mm"
    return timeStr < targetTime;
  };

  return (
    <div>
      <PageHeader
        title="Chấm công bằng vị trí"
        subtitle="Thực hiện chấm công hàng ngày qua tọa độ GPS hoặc quản lý các địa điểm chấm công"
        actions={
          activeTab === 'locations' && canManageLocations ? (
            <button type="button" className="btn btn-primary" onClick={openCreateLocation}>
              + Cấu hình vị trí mới
            </button>
          ) : undefined
        }
      />

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="attendance-tabs">
        <button
          type="button"
          className={`attendance-tab-btn ${activeTab === 'checkin' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkin')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Clock size={16} />
          Chấm công cá nhân
        </button>
        {canManageLocations && (
          <button
            type="button"
            className={`attendance-tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <MapPin size={16} />
            Vị trí chấm công ({locations.totalCount})
          </button>
        )}
        {canReadLogs && (
          <button
            type="button"
            className={`attendance-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={16} />
            Nhật ký nhân viên
          </button>
        )}
      </div>

      {activeTab === 'checkin' && (
        <div className="checkin-grid">
          <div className="checkin-card">
            <div className="clock-display">
              <div className="clock-time">{now.toLocaleTimeString()}</div>
              <div className="clock-date">
                {now.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className="attendance-status-summary">
              {(() => {
                const { checkIn: targetIn, checkOut: targetOut } = getShiftTargets(user);
                return (
                  <>
                    <div className="status-row">
                      <span className="status-label">Quy định ca:</span>
                      <span className="status-value font-medium">
                        {targetIn} - {targetOut}
                      </span>
                    </div>
                    <div className="status-row">
                      <span className="status-label">Vào (Check-In):</span>
                      <span className="status-value">
                        {todayRecord?.checkInTime ? (
                          <span className="text-success font-medium" style={{ color: '#10b981' }}>
                            {new Date(todayRecord.checkInTime).toLocaleTimeString('vi-VN')}
                            {checkLate(todayRecord.checkInTime, targetIn) && (
                              <span className="text-danger font-bold" style={{ color: '#ef4444', marginLeft: '6px' }}>
                                (Đi muộn)
                              </span>
                            )}
                            <span className="location-tag block text-xs muted">{todayRecord.checkInLocationName}</span>
                          </span>
                        ) : (
                          <span className="text-muted">Chưa chấm vào</span>
                        )}
                      </span>
                    </div>
                    <div className="status-row">
                      <span className="status-label">Ra (Check-Out):</span>
                      <span className="status-value">
                        {todayRecord?.checkOutTime ? (
                          <span className="text-indigo font-medium" style={{ color: '#6366f1' }}>
                            {new Date(todayRecord.checkOutTime).toLocaleTimeString('vi-VN')}
                            {checkEarly(todayRecord.checkOutTime, targetOut) && (
                              <span className="text-danger font-bold" style={{ color: '#ef4444', marginLeft: '6px' }}>
                                (Về sớm)
                              </span>
                            )}
                            <span className="location-tag block text-xs muted">{todayRecord.checkOutLocationName}</span>
                          </span>
                        ) : (
                          <span className="text-muted">Chưa chấm ra</span>
                        )}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="checkin-buttons-container">
              {/* Check-In Button */}
              <div className="btn-checkin-wrapper">
                {!todayRecord?.checkInTime && !fetchingGeo && !checkingIn && (
                  <>
                    <div className="radar-pulse" style={{ width: '120px', height: '120px' }} />
                    <div className="radar-pulse" style={{ width: '120px', height: '120px', animationDelay: '0.8s' }} />
                  </>
                )}
                <button
                  type="button"
                  className={`btn-checkin-action type-checkin ${checkingIn ? 'disabled' : ''} ${todayRecord?.checkInTime ? 'overwrite' : ''}`}
                  onClick={() => handleCheckInClick('CheckIn')}
                  disabled={fetchingGeo || checkingIn || !!geoError}
                >
                  <Clock size={24} />
                  <span>{todayRecord?.checkInTime ? 'Vào lại' : 'Vào'}</span>
                </button>
                {todayRecord?.checkInTime && (
                  <span className="badge-overwrite-info">Đã chấm vào (Nhấn để chấm lại)</span>
                )}
              </div>

              {/* Check-Out Button */}
              <div className="btn-checkin-wrapper">
                {!todayRecord?.checkOutTime && todayRecord?.checkInTime && !fetchingGeo && !checkingIn && (
                  <>
                    <div className="radar-pulse" style={{ width: '120px', height: '120px' }} />
                    <div className="radar-pulse" style={{ width: '120px', height: '120px', animationDelay: '0.8s' }} />
                  </>
                )}
                <button
                  type="button"
                  className={`btn-checkin-action type-checkout ${checkingIn ? 'disabled' : ''} ${todayRecord?.checkOutTime ? 'overwrite' : ''}`}
                  onClick={() => handleCheckInClick('CheckOut')}
                  disabled={fetchingGeo || checkingIn || !!geoError}
                >
                  <Clock size={24} />
                  <span>{todayRecord?.checkOutTime ? 'Ra lại' : 'Ra'}</span>
                </button>
                {todayRecord?.checkOutTime && (
                  <span className="badge-overwrite-info">Đã chấm ra (Nhấn để chấm lại)</span>
                )}
              </div>
            </div>

            {fetchingGeo && <p className="muted">Đang lấy tọa độ GPS của bạn...</p>}

            {geoError && <p className="text-danger small text-center">{geoError}</p>}

            {coords && (
              <div className="coords-box">
                <div className="coords-row">
                  <span className="muted">Vĩ độ (Lat):</span>
                  <code>{coords.latitude.toFixed(6)}</code>
                </div>
                <div className="coords-row">
                  <span className="muted">Kinh độ (Lon):</span>
                  <code>{coords.longitude.toFixed(6)}</code>
                </div>
                <div className="coords-row">
                  <span className="muted">Độ chính xác:</span>
                  <span className="coords-accuracy">±{coords.accuracy.toFixed(1)}m</span>
                </div>
                <button type="button" className="btn btn-sm btn-ghost mt-8" onClick={getBrowserLocation}>
                  Tải lại GPS
                </button>
              </div>
            )}
          </div>

          <div className="table-card">
            {selectedPersonalDate === null ? (
              <>
                <h3 className="section-title pad-h">Nhật ký chấm công của bạn</h3>
                {loadingPersonalLogs ? (
                  <p className="muted pad">Đang tải...</p>
                ) : personalDaysList.length === 0 ? (
                  <p className="muted pad text-center">Bạn chưa thực hiện chấm công nào.</p>
                ) : (
                  <table className="data-table responsive-table personal-logs-table">
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Giờ vào (Check-In)</th>
                        <th>Vị trí vào</th>
                        <th>Giờ ra (Check-Out)</th>
                        <th>Vị trí ra</th>
                        <th>Thời gian làm</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {personalDaysList.map((day) => {
                        const { checkIn: targetIn, checkOut: targetOut } = getShiftTargets(user);
                        const isLate = day.checkIn ? checkLate(day.checkIn.checkTime, targetIn) : false;
                        const isEarly = day.checkOut ? checkEarly(day.checkOut.checkTime, targetOut) : false;
                        return (
                          <tr key={day.dateStr}>
                            <td><strong>{day.dateStr}</strong></td>
                            <td>
                              {day.checkIn ? (
                                <span className="text-success font-medium" style={{ color: '#10b981' }}>
                                  {new Date(day.checkIn.checkTime).toLocaleTimeString('vi-VN')}
                                  {isLate && (
                                    <span className="text-danger font-bold" style={{ color: '#ef4444', marginLeft: '6px' }}>
                                      (Đi muộn)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td>{day.checkIn?.attendanceLocationName || <span className="muted">—</span>}</td>
                            <td>
                              {day.checkOut ? (
                                <span className="text-indigo font-medium" style={{ color: '#6366f1' }}>
                                  {new Date(day.checkOut.checkTime).toLocaleTimeString('vi-VN')}
                                  {isEarly && (
                                    <span className="text-danger font-bold" style={{ color: '#ef4444', marginLeft: '6px' }}>
                                      (Về sớm)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td>{day.checkOut?.attendanceLocationName || <span className="muted">—</span>}</td>
                            <td>
                              <strong>{getWorkDuration(day.checkIn?.checkTime, day.checkOut?.checkTime)}</strong>
                            </td>
                            <td className="actions-cell">
                              <button type="button" className="btn btn-sm" onClick={() => setSelectedPersonalDate(day.dateStr)}>
                                Xem toàn bộ log ({day.logs.length})
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <>
                <div className="pad-h pt-12" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span className="muted" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setSelectedPersonalDate(null)}>Nhật ký của bạn</span>
                    <span className="muted">/</span>
                    <strong>Ngày {selectedPersonalDate}</strong>
                  </div>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedPersonalDate(null)}>
                    Quay lại danh sách ngày
                  </button>
                </div>
                <table className="data-table responsive-table personal-log-details-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Loại</th>
                      <th>Tọa độ</th>
                      <th>Vị trí chấm công</th>
                      <th>Khoảng cách</th>
                      <th>Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!groupedPersonalDays[selectedPersonalDate] || groupedPersonalDays[selectedPersonalDate].logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="muted text-center pad">
                          Không có log chi tiết cho ngày này.
                        </td>
                      </tr>
                    ) : (
                      groupedPersonalDays[selectedPersonalDate].logs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <strong>{new Date(log.checkTime).toLocaleTimeString('vi-VN')}</strong>
                            <small className="block muted">{new Date(log.checkTime).toLocaleDateString('vi-VN')}</small>
                          </td>
                          <td>
                            <span className={`attendance-type-badge ${log.type === 'CheckIn' ? 'checkin' : 'checkout'}`}>
                              {log.type === 'CheckIn' ? 'Vào' : 'Ra'}
                            </span>
                          </td>
                          <td>
                            <code className="small">
                              {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                            </code>
                          </td>
                          <td>{log.attendanceLocationName || <span className="muted">—</span>}</td>
                          <td>
                            {log.distanceInMeters != null ? (
                              <span>{log.distanceInMeters.toFixed(1)}m</span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`log-status-badge ${log.isSuccess ? 'success' : 'fail'}`}>
                              {log.isSuccess ? 'Thành công' : 'Thất bại'}
                            </span>
                            {!log.isSuccess && log.failureReason && (
                              <small className="block text-danger mt-2">{log.failureReason}</small>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'locations' && canManageLocations && (
        <div className="locations-view-container">
          <div className="locations-toolbar">
            <div className="search-wrapper">
              <Search className="search-icon" size={18} />
              <input
                className="locations-search-input"
                placeholder="Tìm kiếm địa điểm chấm công..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
              />
            </div>
            <div className="locations-stats-badge">
              Đang quản lý <strong>{locations.totalCount}</strong> địa điểm
            </div>
          </div>

          {locations.loading ? (
            <div className="loading-placeholder">
              <div className="loading-spinner" />
              <p className="muted">Đang tải danh sách địa điểm...</p>
            </div>
          ) : locations.items.length === 0 ? (
            <div className="empty-state-card">
              <p className="muted">Chưa cấu hình địa điểm chấm công nào.</p>
              <button type="button" className="btn btn-primary btn-sm mt-12" onClick={openCreateLocation} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} />
                Thêm địa điểm đầu tiên
              </button>
            </div>
          ) : (
            <div className="locations-grid">
              {locations.items.map((loc) => (
                <div key={loc.id} className={`location-card ${loc.isActive ? 'active' : 'inactive'}`}>
                  <div className="location-card-header">
                    <h4 className="location-card-title">{loc.name}</h4>
                    <span className={`status-pill ${loc.isActive ? 'active' : 'inactive'}`}>
                      {loc.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                  
                  <div className="location-card-body">
                    <div className="location-meta-row" style={{ display: 'flex', gap: '10px' }}>
                      <MapPin size={16} className="text-muted" style={{ marginTop: '2px', color: 'var(--text-muted)' }} />
                      <div className="meta-details">
                        <span className="meta-label">Tọa độ:</span>
                        <code className="meta-value">{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</code>
                      </div>
                    </div>
                    
                    <div className="location-meta-row" style={{ display: 'flex', gap: '10px' }}>
                      <Compass size={16} className="text-muted" style={{ marginTop: '2px', color: 'var(--text-muted)' }} />
                      <div className="meta-details">
                        <span className="meta-label">Bán kính:</span>
                        <span className="meta-value font-medium">{loc.radiusInMeters}m</span>
                      </div>
                    </div>

                    <div className="location-assignments">
                      <div className="assignment-badge">
                        <Building size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{loc.assignedDepartmentIds.length} Phòng ban</span>
                      </div>
                      <div className="assignment-badge">
                        <User size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{loc.assignedUserIds.length} Nhân sự</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="location-card-footer" style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                    <button type="button" className="btn-edit-location" onClick={() => openEditLocation(loc)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Settings size={14} />
                      Cấu hình
                    </button>
                    <button type="button" className="btn-assign-location" onClick={() => openAssignLocation(loc)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} />
                      Gán áp dụng
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            page={locations.page}
            pageSize={locations.pageSize}
            totalCount={locations.totalCount}
            totalPages={locations.totalPages}
            hasPreviousPage={locations.hasPreviousPage}
            hasNextPage={locations.hasNextPage}
            onPageChange={locations.goToPage}
            onPageSizeChange={locations.changePageSize}
          />
        </div>
      )}

      {activeTab === 'logs' && canReadLogs && (
        <div>
          {/* Level 1: View Employee List */}
          {drillDownUser === null && (
            <div className="table-card">
              <div className="toolbar" style={{ padding: '12px 16px' }}>
                <input
                  className="search-input"
                  placeholder="Tìm nhân viên theo tên, mã NV..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  style={{ maxWidth: '350px' }}
                />
                <span className="muted">{filteredStaff.length} nhân viên</span>
              </div>
              <table className="data-table responsive-table staff-table">
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Họ tên</th>
                    <th>Phòng ban</th>
                    <th>Cấp bậc</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted text-center pad">
                        Không tìm thấy nhân viên nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((u) => (
                      <tr key={u.id}>
                        <td><code>{u.employeeCode}</code></td>
                        <td>
                          <strong>{u.fullName}</strong>
                          <small className="block muted">{u.email}</small>
                        </td>
                        <td>{u.departmentName}</td>
                        <td>{u.jobLevelName}</td>
                        <td>
                          <Badge active={u.isActive}>{u.isActive ? 'Hoạt động' : 'Tạm dừng'}</Badge>
                        </td>
                        <td className="actions-cell">
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => { setDrillDownUser(u); setDrillDownDate(null); }}>
                            Xem lịch sử
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Level 2: View Days for selected employee */}
          {drillDownUser !== null && drillDownDate === null && (
            <div className="table-card">
              <div className="pad-h pt-12" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <span className="muted" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setDrillDownUser(null)}>Nhật ký nhân viên</span>
                  <span className="muted">/</span>
                  <strong>
                    {drillDownUser.fullName} (<code>{drillDownUser.employeeCode}</code>)
                    {(() => {
                      const { checkIn, checkOut } = getShiftTargets(drillDownUser);
                      return ` - Ca: ${checkIn} - ${checkOut}`;
                    })()}
                  </strong>
                </div>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDrillDownUser(null)}>
                  Quay lại danh sách nhân sự
                </button>
              </div>

              {loadingUserLogs ? (
                <p className="muted pad">Đang tải lịch sử chấm công...</p>
              ) : daysList.length === 0 ? (
                <p className="muted pad text-center">Nhân viên này chưa thực hiện chấm công nào.</p>
              ) : (
                <table className="data-table responsive-table staff-days-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Giờ vào (Check-In)</th>
                      <th>Vị trí vào</th>
                      <th>Giờ ra (Check-Out)</th>
                      <th>Vị trí ra</th>
                      <th>Thời gian làm</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {daysList.map((day) => {
                      const { checkIn: targetIn, checkOut: targetOut } = getShiftTargets(drillDownUser);
                      const isLate = day.checkIn ? checkLate(day.checkIn.checkTime, targetIn) : false;
                      const isEarly = day.checkOut ? checkEarly(day.checkOut.checkTime, targetOut) : false;
                      return (
                        <tr key={day.dateStr}>
                          <td><strong>{day.dateStr}</strong></td>
                          <td>
                            {day.checkIn ? (
                              <span className="text-success font-medium" style={{ color: '#10b981' }}>
                                {new Date(day.checkIn.checkTime).toLocaleTimeString('vi-VN')}
                                {isLate && (
                                  <span className="text-danger font-bold" style={{ color: '#ef4444', marginLeft: '6px' }}>
                                    (Đi muộn)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>{day.checkIn?.attendanceLocationName || <span className="muted">—</span>}</td>
                          <td>
                            {day.checkOut ? (
                              <span className="text-indigo font-medium" style={{ color: '#6366f1' }}>
                                {new Date(day.checkOut.checkTime).toLocaleTimeString('vi-VN')}
                                {isEarly && (
                                  <span className="text-danger font-bold" style={{ color: '#ef4444', marginLeft: '6px' }}>
                                    (Về sớm)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>{day.checkOut?.attendanceLocationName || <span className="muted">—</span>}</td>
                          <td>
                            <strong>{getWorkDuration(day.checkIn?.checkTime, day.checkOut?.checkTime)}</strong>
                          </td>
                          <td className="actions-cell">
                            <button type="button" className="btn btn-sm" onClick={() => setDrillDownDate(day.dateStr)}>
                              Xem toàn bộ log ({day.logs.length})
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Level 3: View detailed logs for selected employee on selected day */}
          {drillDownUser !== null && drillDownDate !== null && (
            <div className="table-card">
              <div className="pad-h pt-12" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <span className="muted" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setDrillDownUser(null)}>Nhật ký nhân viên</span>
                  <span className="muted">/</span>
                  <span className="muted" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setDrillDownDate(null)}>{drillDownUser.fullName}</span>
                  <span className="muted">/</span>
                  <strong>Ngày {drillDownDate}</strong>
                </div>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDrillDownDate(null)}>
                  Quay lại danh sách ngày
                </button>
              </div>

              <table className="data-table responsive-table staff-log-details-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Loại</th>
                    <th>Tọa độ check-in</th>
                    <th>Vị trí chấm công</th>
                    <th>Khoảng cách</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {!groupedDays[drillDownDate] || groupedDays[drillDownDate].logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted text-center pad">
                        Không có log chi tiết cho ngày này.
                      </td>
                    </tr>
                  ) : (
                    groupedDays[drillDownDate].logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{new Date(log.checkTime).toLocaleTimeString('vi-VN')}</strong>
                          <small className="block muted">{new Date(log.checkTime).toLocaleDateString('vi-VN')}</small>
                        </td>
                        <td>
                          <span className={`attendance-type-badge ${log.type === 'CheckIn' ? 'checkin' : 'checkout'}`}>
                            {log.type === 'CheckIn' ? 'Vào' : 'Ra'}
                          </span>
                        </td>
                        <td>
                          <code className="small">
                            {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                          </code>
                        </td>
                        <td>{log.attendanceLocationName || <span className="muted">—</span>}</td>
                        <td>
                          {log.distanceInMeters != null ? (
                            <span>{log.distanceInMeters.toFixed(1)}m</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`log-status-badge ${log.isSuccess ? 'success' : 'fail'}`}>
                            {log.isSuccess ? 'Thành công' : 'Thất bại'}
                          </span>
                          {!log.isSuccess && log.failureReason && (
                            <small className="block text-danger mt-2">{log.failureReason}</small>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Locations Add/Edit Modal */}
      <Modal
        open={locationModalOpen}
        title={editingLocation ? `Cập nhật vị trí: ${editingLocation.name}` : 'Cấu hình vị trí mới'}
        onClose={() => setLocationModalOpen(false)}
        wide
      >
        <form className="form-stack" onSubmit={handleSaveLocation}>
          <div className="form-grid">
            <label className="span-2">
              Tên địa điểm chấm công *
              <input
                required
                placeholder="VD: Văn phòng Hỏa Lò, DigiFNB Chi nhánh 1..."
                value={locationForm.name}
                onChange={(e) => setFormVal('name', e.target.value)}
              />
            </label>
            <label>
              Vĩ độ (Latitude) *
              <input
                type="number"
                step="any"
                required
                value={locationForm.latitude}
                onChange={(e) => setFormVal('latitude', Number(e.target.value))}
              />
            </label>
            <label>
              Kinh độ (Longitude) *
              <input
                type="number"
                step="any"
                required
                value={locationForm.longitude}
                onChange={(e) => setFormVal('longitude', Number(e.target.value))}
              />
            </label>
            <label>
              Bán kính cho phép (Meters) *
              <input
                type="number"
                required
                min={10}
                max={5000}
                value={locationForm.radiusInMeters}
                onChange={(e) => setFormVal('radiusInMeters', Number(e.target.value))}
              />
            </label>
            {editingLocation && (
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                <input
                  type="checkbox"
                  checked={locationForm.isActive}
                  onChange={(e) => setFormVal('isActive', e.target.checked)}
                />
                <span style={{ marginLeft: '8px' }}>Địa điểm đang hoạt động</span>
              </label>
            )}

            <div className="span-2" style={{ marginTop: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="font-medium" style={{ fontSize: '13px' }}>Chọn vị trí trên bản đồ hoặc lấy vị trí hiện tại:</span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setLocationForm(prev => ({
                            ...prev,
                            latitude: Number(position.coords.latitude),
                            longitude: Number(position.coords.longitude)
                          }));
                        },
                        (err) => alert('Không thể lấy vị trí hiện tại: ' + err.message),
                        { enableHighAccuracy: true }
                      );
                    } else {
                      alert('Trình duyệt không hỗ trợ GPS.');
                    }
                  }}
                >
                  Lấy vị trí hiện tại của tôi
                </button>
              </div>
              {locationModalOpen && (
                <MapContainer
                  key={`${locationForm.latitude}-${locationForm.longitude}`}
                  center={[locationForm.latitude || 21.0285, locationForm.longitude || 105.8542]}
                  zoom={15}
                  style={{ height: '260px', borderRadius: '8px', border: '1px solid var(--border)', zIndex: 1 }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickEvents
                    onClick={(lat, lng) => {
                      setLocationForm(prev => ({
                        ...prev,
                        latitude: Number(lat),
                        longitude: Number(lng)
                      }));
                    }}
                  />
                  {locationForm.latitude && locationForm.longitude && (
                    <>
                      <Marker
                        position={[locationForm.latitude, locationForm.longitude]}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            setLocationForm(prev => ({
                              ...prev,
                              latitude: Number(position.lat),
                              longitude: Number(position.lng)
                            }));
                          }
                        }}
                      />
                      <Circle
                        center={[locationForm.latitude, locationForm.longitude]}
                        radius={locationForm.radiusInMeters || 100}
                        pathOptions={{
                          color: '#2563eb',
                          fillColor: '#3b82f6',
                          fillOpacity: 0.15
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              )}
            </div>
          </div>

          <div className="modal-footer mt-16">
            <div className="modal-footer-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setLocationModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingLocation}>
                {savingLocation ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Locations Assignment Modal with Transfer List */}
      <Modal
        open={assignModalOpen}
        title={assignLocation ? `Gán đối tượng áp dụng: ${assignLocation.name}` : ''}
        onClose={() => setAssignModalOpen(false)}
        wide
      >
        <div className="assign-modal-layout">
          <div className="assign-tabs">
            <button
              type="button"
              className={`assign-tab-btn ${assignTab === 'depts' ? 'active' : ''}`}
              onClick={() => setAssignTab('depts')}
            >
              🏢 Gán theo Phòng ban ({assignedDeptIds.length})
            </button>
            <button
              type="button"
              className={`assign-tab-btn ${assignTab === 'users' ? 'active' : ''}`}
              onClick={() => setAssignTab('users')}
            >
              👤 Gán theo Nhân sự ({assignedUserIds.length})
            </button>
          </div>

          {assignTab === 'depts' && (
            <div className="transfer-container">
              {/* Left Column: Available */}
              <div className="transfer-column">
                <div className="transfer-column-header">
                  <span>Phòng ban chưa gán</span>
                  <input
                    type="text"
                    className="transfer-search"
                    placeholder="Tìm phòng ban..."
                    value={assignDeptSearch}
                    onChange={(e) => setAssignDeptSearch(e.target.value)}
                  />
                </div>
                <div className="transfer-list">
                  {departments
                    .filter(d => !assignedDeptIds.includes(d.id))
                    .filter(d => {
                      const q = assignDeptSearch.trim().toLowerCase();
                      return !q || d.departmentName.toLowerCase().includes(q) || d.departmentCode.toLowerCase().includes(q);
                    })
                    .map(d => (
                      <div
                        key={d.id}
                        className="transfer-item add"
                        onClick={() => setAssignedDeptIds(prev => [...prev, d.id])}
                      >
                        <span className="item-text">{d.departmentCode} — {d.departmentName}</span>
                        <span className="item-action-icon">➕</span>
                      </div>
                    ))}
                  {departments.filter(d => !assignedDeptIds.includes(d.id)).length === 0 && (
                    <div className="transfer-empty">Tất cả phòng ban đã được gán</div>
                  )}
                </div>
              </div>

              {/* Right Column: Assigned */}
              <div className="transfer-column assigned">
                <div className="transfer-column-header">
                  <span>Phòng ban đang áp dụng</span>
                  <span className="badge-count">{assignedDeptIds.length}</span>
                </div>
                <div className="transfer-list">
                  {departments
                    .filter(d => assignedDeptIds.includes(d.id))
                    .map(d => (
                      <div
                        key={d.id}
                        className="transfer-item remove"
                        onClick={() => setAssignedDeptIds(prev => prev.filter(id => id !== d.id))}
                      >
                        <span className="item-text">{d.departmentCode} — {d.departmentName}</span>
                        <span className="item-action-icon">❌</span>
                      </div>
                    ))}
                  {assignedDeptIds.length === 0 && (
                    <div className="transfer-empty">Chưa gán phòng ban nào</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {assignTab === 'users' && (
            <div className="transfer-container">
              {/* Left Column: Available */}
              <div className="transfer-column">
                <div className="transfer-column-header">
                  <span>Nhân viên chưa gán</span>
                  <input
                    type="text"
                    className="transfer-search"
                    placeholder="Tìm nhân sự..."
                    value={assignUserSearch}
                    onChange={(e) => setAssignUserSearch(e.target.value)}
                  />
                </div>
                <div className="transfer-list">
                  {allUsers
                    .filter(u => !assignedUserIds.includes(u.id))
                    .filter(u => {
                      const q = assignUserSearch.trim().toLowerCase();
                      return !q || u.fullName.toLowerCase().includes(q) || u.employeeCode.toLowerCase().includes(q);
                    })
                    .slice(0, 100)
                    .map(u => (
                      <div
                        key={u.id}
                        className="transfer-item add"
                        onClick={() => setAssignedUserIds(prev => [...prev, u.id])}
                      >
                        <span className="item-text">
                          <strong>{u.fullName}</strong> <small className="muted">({u.employeeCode} — {u.departmentName})</small>
                        </span>
                        <span className="item-action-icon">➕</span>
                      </div>
                    ))}
                  {allUsers.filter(u => !assignedUserIds.includes(u.id)).length === 0 && (
                    <div className="transfer-empty">Tất cả nhân viên đã được gán</div>
                  )}
                </div>
              </div>

              {/* Right Column: Assigned */}
              <div className="transfer-column assigned">
                <div className="transfer-column-header">
                  <span>Nhân viên đang áp dụng</span>
                  <span className="badge-count">{assignedUserIds.length}</span>
                </div>
                <div className="transfer-list">
                  {allUsers
                    .filter(u => assignedUserIds.includes(u.id))
                    .map(u => (
                      <div
                        key={u.id}
                        className="transfer-item remove"
                        onClick={() => setAssignedUserIds(prev => prev.filter(id => id !== u.id))}
                      >
                        <span className="item-text">
                          <strong>{u.fullName}</strong> <small className="muted">({u.employeeCode})</small>
                        </span>
                        <span className="item-action-icon">❌</span>
                      </div>
                    ))}
                  {assignedUserIds.length === 0 && (
                    <div className="transfer-empty">Chưa gán nhân viên nào</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer mt-16">
            <div className="modal-footer-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAssignModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveAssignments} disabled={savingLocation}>
                {savingLocation ? 'Đang lưu...' : 'Lưu cài đặt gán'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Check-In/Check-Out overwrite */}
      <Modal
        open={showConfirmModal}
        title={confirmType === 'CheckIn' ? 'Xác nhận chấm vào lại' : 'Xác nhận chấm ra lại'}
        onClose={() => setShowConfirmModal(false)}
      >
        <div className="form-stack">
          <p style={{ fontSize: '15px', lineHeight: '1.5', margin: '8px 0 20px 0', color: 'var(--text)' }}>
            Bạn đã thực hiện chấm <strong>{confirmType === 'CheckIn' ? 'vào' : 'ra'}</strong> hôm nay. 
            Bạn có chắc chắn muốn thực hiện chấm <strong>{confirmType === 'CheckIn' ? 'vào lại' : 'ra lại'}</strong> không? 
            Mốc thời gian và kết quả mới sẽ được ghi nhận lại vào hệ thống.
          </p>
          <div className="modal-footer">
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowConfirmModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (confirmType) {
                    handleCheckIn(confirmType);
                  }
                  setShowConfirmModal(false);
                }}
              >
                Đồng ý chấm lại
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );

  function setFormVal(key: string, val: any) {
    setLocationForm((prev) => ({ ...prev, [key]: val }));
  }
}
