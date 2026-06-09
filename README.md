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

**http://localhost:810** — Tài khoản seed: `admin@company.com` / `AdminPassword123!`

## Cấu hình

| Mục | Giá trị |
|-----|---------|
| Port | `810` |
| Proxy | `/api` → `http://localhost:7000` |

## Cấu trúc

```
src/
├── api/           # HTTP client + services
├── context/       # AuthContext
├── pages/         # Màn hình ERP
├── components/    # Layout, Modal, UI
└── types/         # DTO types
```
