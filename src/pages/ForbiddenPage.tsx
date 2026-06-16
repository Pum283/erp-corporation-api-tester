import { Link } from 'react-router-dom';
import { useAccess } from '../hooks/useAccess';

export function ForbiddenPage() {
  const { firstAccessibleRoute } = useAccess();

  return (
    <div className="forbidden-page">
      <div className="forbidden-card">
        <span className="forbidden-code">403</span>
        <h1>Không có quyền truy cập</h1>
        <p>Bạn không có quyền xem nội dung này. Liên hệ quản trị viên nếu cần cấp thêm quyền.</p>
        <Link to={firstAccessibleRoute} className="btn btn-primary">
          Về trang được phép
        </Link>
      </div>
    </div>
  );
}
