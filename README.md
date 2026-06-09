# erp-corporation-api-tester

Ứng dụng **ERP HRM & RBAC** (React) — giao diện quản trị đầy đủ, gọi trực tiếp API `erp-corporation-api-v2`.

Đặt ngang hàng với `erp-corporation-api-v2` và `erp-corporation-fe-v2`.

## Module

| Màn hình | API tương ứng |
|----------|----------------|
| Đăng nhập / Đăng xuất | `POST /api/auth/login`, `refresh`, `revoke`, `GET /api/auth/me` |
| Tổng quan | Thống kê + health check |
| Nhân sự | CRUD, gán vai trò, reset MK, kiêm nhiệm |
| Phòng ban | CRUD |
| Vai trò & Quyền | CRUD + gán permission |
| Cấp bậc | CRUD |

## Chạy

```bash
# API backend
cd erp-corporation-api-v2/src/API
dotnet run

# ERP tester
cd erp-corporation-api-tester
npm install
npm run dev
```

**http://localhost:810** — Tài khoản seed: `admin@company.com` / `!Abc123` (mật khẩu chung cho mọi user seed)

## Cấu hình

| Mục | Giá trị |
|-----|---------|
| Port FE | `810` |
| API URL | `https://localhost:7001` (biến `VITE_API_BASE_URL` trong `.env`) |

## Cấu trúc

```
src/
├── api/           # HTTP client + services
├── context/       # AuthContext
├── pages/         # Màn hình ERP
├── components/    # Layout, Modal, UI
└── types/         # DTO types
```
