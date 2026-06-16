import { useNavigate } from 'react-router-dom';
import { IconBell } from '../ui/Icons';
import { useNotifications } from '../../context/NotificationContext';

export function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount, items, loading, panelOpen, setPanelOpen, markRead, markAllRead } =
    useNotifications();

  async function handleClickItem(id: string, linkUrl?: string | null, isRead?: boolean) {
    if (!isRead) {
      try {
        await markRead(id);
      } catch {
        /* ignore */
      }
    }
    setPanelOpen(false);
    if (linkUrl) {
      navigate(linkUrl.startsWith('/') ? linkUrl : `/${linkUrl}`);
    }
  }

  return (
    <div className="notification-bell-wrap">
      <button
        type="button"
        className="btn btn-ghost notification-bell-btn"
        aria-label="Thông báo"
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <IconBell width={20} height={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {panelOpen && (
        <>
          <button
            type="button"
            className="notification-backdrop"
            aria-label="Đóng"
            onClick={() => setPanelOpen(false)}
          />
          <div className="notification-panel">
            <div className="notification-panel-head">
              <strong>Thông báo</strong>
              {unreadCount > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => markAllRead()}>
                  Đọc tất cả
                </button>
              )}
            </div>
            <div className="notification-list">
              {loading && items.length === 0 && <p className="muted pad">Đang tải…</p>}
              {!loading && items.length === 0 && <p className="muted pad">Không có thông báo</p>}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notification-item${n.isRead ? '' : ' unread'}`}
                  onClick={() => handleClickItem(n.id, n.linkUrl, n.isRead)}
                >
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <small>{new Date(n.createdAt).toLocaleString('vi-VN')}</small>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
