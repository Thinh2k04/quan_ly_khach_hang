# Quản lý khách hàng

Ứng dụng React + Vite để quản lý danh sách khách hàng từ API.

## Chức năng

- Tải danh sách khách hàng từ `GET /api/khachhang`
- Tìm kiếm theo tên, loại, ngành hàng, người tạo hoặc NPP
- Xóa khách hàng bằng `DELETE /api/khachhang/:id`
- Hiển thị thống kê nhanh và giao diện dashboard

## Chạy dự án

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Cấu hình API

Nếu cần đổi base URL, đặt biến môi trường:

```bash
VITE_KHACHHANG_API_URL=https://your-api-host/api/khachhang
```