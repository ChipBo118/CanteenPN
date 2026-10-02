# CanteenPN

CanteenPN là hệ thống quản lý căng tin gồm:

- `apps/web`: Next.js, cổng `3000`.
- `apps/api`: NestJS, cổng `3001`.
- PostgreSQL: dữ liệu nghiệp vụ.
- Redis: đồng bộ sự kiện Socket.IO khi chạy nhiều API process.

Repository sử dụng pnpm workspace và Prisma. Có thể chạy toàn bộ bằng Docker hoặc chạy native trên máy.

## Triển khai miễn phí: Vercel + Render + Neon + Cloudinary

Kiến trúc production được chuẩn bị theo hướng sau:

- **Vercel** chạy giao diện Next.js.
- **Render** chạy một instance NestJS API và Socket.IO.
- **Neon** lưu PostgreSQL lâu dài, độc lập với vòng đời máy chủ Render.
- **Cloudinary** lưu ảnh đại diện và ảnh món ăn lâu dài.
- Redis chưa bắt buộc khi chỉ chạy một API instance. Có thể bổ sung Redis sau nếu mở rộng thành nhiều instance.

### 1. Tạo các dịch vụ dữ liệu

1. Tạo PostgreSQL project miễn phí trên Neon và sao chép connection string vào `DATABASE_URL`.
2. Tạo Cloudinary account miễn phí và lấy `cloud name`, `API key`, `API secret`.

### 2. Deploy API lên Render

Repository đã có `render.yaml`. Trong Render, chọn **New Blueprint**, kết nối repository và điền các biến đang để `sync: false`:

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | Connection string của Neon |
| `WEB_ORIGIN` | URL Vercel, ví dụ `https://canteenpn.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloud name của Cloudinary |
| `CLOUDINARY_API_KEY` | API key của Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret của Cloudinary |
| `SEED_DEMO_PASSWORD` | Mật khẩu tài khoản demo do bạn chọn |

Hai JWT secret được Render tự sinh. Khi container khởi động, migration luôn được áp dụng nhưng dữ liệu mẫu chỉ được nạp nếu database hoàn toàn trống. Khởi động lại hoặc deploy lại không xóa dữ liệu đang có.

Sau khi deploy, kiểm tra `https://<ten-dich-vu>.onrender.com/api/health`.

### 3. Deploy web lên Vercel

Import cùng repository vào Vercel, đặt Root Directory là `apps/web` và thêm:

| Biến | Giá trị |
| --- | --- |
| `API_PROXY_TARGET` | URL Render không có `/api`, ví dụ `https://canteenpn-api.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | Cùng URL Render ở trên |

Không cần đặt `NEXT_PUBLIC_API_URL` trên Vercel: trình duyệt gọi `/api` cùng domain Vercel, sau đó rewrite chuyển tiếp đến Render. Sau lần deploy đầu tiên, cập nhật `WEB_ORIGIN` trên Render bằng đúng URL Vercel rồi deploy lại API.

### 4. Nạp lại dữ liệu mẫu khi cần

- `pnpm db:init`: chạy migration và chỉ seed nếu database trống; an toàn cho startup/deploy.
- `pnpm db:seed`: chủ động xóa dữ liệu nghiệp vụ hiện tại và tạo lại toàn bộ dữ liệu mẫu.

Muốn đặt lại database Neon, chạy `pnpm db:seed` từ máy local với `DATABASE_URL` tạm thời trỏ tới Neon. Đây là thao tác phá hủy dữ liệu hiện có, vì vậy hãy kiểm tra đúng database trước khi chạy.

## Phần 1 — Khởi chạy bằng Docker

### 1. Yêu cầu

- Git.
- Docker Desktop trên Windows/macOS, hoặc Docker Engine kèm Compose plugin trên Linux.
- Khoảng 10–15 GB dung lượng trống cho image và build cache trong lần build đầu.

Không cần cài Node.js, pnpm, PostgreSQL hay Redis trên máy host.

### 2. Clone repository

```powershell
git clone https://github.com/lesyeuxdelamour/CanteenPN.git
cd CanteenPN
```

### 3. Build và khởi chạy

Mở Docker Desktop, chờ Docker Engine sẵn sàng rồi chạy:

```powershell
docker compose up --build -d
```

Compose sẽ tự động:

1. Tải PostgreSQL 16 và Redis 7.
2. Build image cho web và API.
3. Tạo Prisma Client.
4. Chạy toàn bộ migration.
5. Seed dữ liệu demo nếu database đang trống.
6. Khởi động và healthcheck các dịch vụ.

Theo dõi trạng thái:

```powershell
docker compose ps
```

Bốn dịch vụ `web`, `api`, `postgres` và `redis` cần ở trạng thái `healthy`.

### 4. Địa chỉ sử dụng

| Dịch vụ | Địa chỉ |
| --- | --- |
| Web | `http://localhost:3000` |
| API health | `http://localhost:3001/api/health` |
| Swagger | `http://localhost:3001/api/docs` |
| PostgreSQL từ host | `127.0.0.1:5434` |
| Redis từ host | `127.0.0.1:6379` |

PostgreSQL dùng cổng mặc định `5432` bên trong container và được map ra cổng `5434` trên máy host. Redis dùng cổng mặc định `6379`.

### 5. Xem log

```powershell
docker compose logs -f
```

Chỉ xem một dịch vụ:

```powershell
docker compose logs -f api
docker compose logs -f web
```

### 6. Dừng hoặc xóa môi trường Docker

Dừng và xóa container/network nhưng giữ database cùng file trong volume:

```powershell
docker compose down
```

Xóa cả volume và toàn bộ dữ liệu demo:

```powershell
docker compose down -v
```

> Cảnh báo: `docker compose down -v` xóa database, Redis data và file upload trong Docker volumes. Khởi động lại API thông thường không đặt lại dữ liệu nghiệp vụ.

### 7. Lỗi Docker thường gặp

- Port `3000`, `3001`, `5434` hoặc `6379` đang được dùng: dừng ứng dụng chiếm port hoặc đổi phần bên trái của mapping trong `docker-compose.yml`.
- Docker Engine chưa chạy: mở Docker Desktop và đợi đến khi `docker version` hiển thị cả Client lẫn Server.
- Build cache hỏng hoặc thiếu dung lượng: giải phóng dung lượng, khởi động lại Docker Desktop rồi chạy lại `docker compose up --build -d`.

## Phần 2 — Khởi chạy không dùng Docker

### 1. Yêu cầu

- Node.js 22 LTS trở lên.
- Corepack và pnpm `11.19.0`.
- PostgreSQL 16 trở lên.
- Redis là tùy chọn khi chỉ chạy một API process ở môi trường local.

Kiểm tra:

```powershell
node --version
corepack --version
psql --version
```

### 2. Kích hoạt pnpm và cài dependency

Tại thư mục gốc repository:

```powershell
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
```

Nếu `corepack enable` báo thiếu quyền trên Windows, mở PowerShell bằng quyền Administrator và chạy lại riêng lệnh đó.

### 3. Tạo role và database PostgreSQL

Đăng nhập PostgreSQL bằng tài khoản quản trị:

```powershell
psql -U postgres
```

Chạy SQL:

```sql
CREATE ROLE canteengo WITH LOGIN PASSWORD 'canteengo';
ALTER ROLE canteengo CREATEDB;
CREATE DATABASE canteengo OWNER canteengo;
```

Nếu role hoặc database đã tồn tại thì không cần tạo lại. PostgreSQL native thường dùng cổng mặc định `5432`.

### 4. Tạo file môi trường

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Kiểm tra các biến chính trong `.env`:

```dotenv
DATABASE_URL=postgresql://canteengo:canteengo@127.0.0.1:5432/canteengo
REDIS_URL=redis://127.0.0.1:6379
PORT=3001
WEB_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-another-32-random-characters
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
SEED_DEMO_PASSWORD=CanteenGo@123
```

Thay hai JWT secret bằng chuỗi ngẫu nhiên đủ dài. Không commit `.env`.

Nếu PostgreSQL chạy cổng khác, chỉ cần sửa cổng trong `DATABASE_URL`; không cần sửa code của repository.

### 5. Migration và seed

```powershell
pnpm db:generate
pnpm db:init
```

`db:init` chạy migration và chỉ seed khi database trống. Khi chủ động muốn xóa dữ liệu nghiệp vụ rồi tải lại bộ dữ liệu mẫu, chạy `pnpm db:seed`.

### 6. Khởi chạy web và API

Chạy cả hai bằng Turbo:

```powershell
pnpm dev
```

Hoặc mở hai terminal riêng:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

Chờ API hiển thị `Nest application successfully started`, sau đó truy cập:

- Web: `http://localhost:3000`
- API health: `http://localhost:3001/api/health`
- Swagger: `http://localhost:3001/api/docs`

Dừng các tiến trình foreground bằng `Ctrl+C`.

### 7. Redis có bắt buộc không?

Không bắt buộc cho môi trường local chỉ có một API process. Nếu Redis không chạy, API ghi cảnh báo và Socket.IO tự chuyển sang adapter in-memory. Đăng nhập, menu, giỏ hàng, đặt món và quản trị vẫn hoạt động.

Redis cần thiết khi chạy nhiều API process/server để các kết nối realtime nhận cùng một sự kiện.

### 8. Kiểm tra chất lượng

```powershell
pnpm typecheck
pnpm test
pnpm build
```

### 9. Lỗi native thường gặp

- `ECONNREFUSED 127.0.0.1:5432`: PostgreSQL chưa chạy hoặc `DATABASE_URL` dùng sai port/tài khoản.
- Cảnh báo không kết nối Redis: có thể bỏ qua khi chạy một API process.
- `ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK`: đóng các tiến trình pnpm khác rồi thử lại.
- `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`: chạy một lần với `$env:CI='true'`, sau đó `pnpm install --frozen-lockfile`.
- API chưa phản hồi ngay: lần biên dịch NestJS đầu tiên có thể mất 30–60 giây.

## Phần 3 — Tài khoản và dữ liệu mẫu

Tất cả tài khoản đã được seed sử dụng mật khẩu lấy từ `SEED_DEMO_PASSWORD`. Với cấu hình mặc định:

```text
CanteenGo@123
```

### 1. Tài khoản nhân viên

| Vai trò | Email | Mã nhân viên | Mật khẩu |
| --- | --- | --- | --- |
| Quản trị | `admin@canteen.hpn.edu.vn` | `VWA-ADM-001` | `CanteenGo@123` |
| Thu ngân | `thungan01@canteen.hpn.edu.vn` | `VWA-TN-001` | `CanteenGo@123` |
| Thu ngân | `thungan02@canteen.hpn.edu.vn` | `VWA-TN-002` | `CanteenGo@123` |
| Nhân viên bếp | `bep01@canteen.hpn.edu.vn` | `VWA-BEP-001` | `CanteenGo@123` |
| Nhân viên bếp | `bep02@canteen.hpn.edu.vn` | `VWA-BEP-002` | `CanteenGo@123` |

### 2. Tài khoản sinh viên đã đăng ký

Seed tạo tài khoản cho 50 sinh viên đầu tiên. Ví dụ:

| Họ tên | Mã sinh viên | Email | Mật khẩu |
| --- | --- | --- | --- |
| Nguyễn Thị Minh Anh | `2373240001` | `2373240001@hpn.edu.vn` | `CanteenGo@123` |
| Trần Quỳnh Lan | `2473410002` | `2473410002@hpn.edu.vn` | `CanteenGo@123` |
| Lê Phương Thảo | `2573430003` | `2573430003@hpn.edu.vn` | `CanteenGo@123` |

### 3. Sinh viên chưa đăng ký để test

Seed tạo 100 hồ sơ trong `StudentDirectory`, nhưng chỉ 50 hồ sơ đầu có tài khoản. Các hồ sơ từ số 51 đến 100 đủ điều kiện test trang `http://localhost:3000/auth/register`.

| Họ tên | Mã sinh viên | Email trường | Lớp | Ngành |
| --- | --- | --- | --- | --- |
| Dương Phương My | `2573240051` | `2573240051@hpn.edu.vn` | `K13TTDPTA` | Truyền thông đa phương tiện |
| Mai Hoài Yến | `2673410052` | `2673410052@hpn.edu.vn` | `K14QTKDB` | Quản trị kinh doanh |
| Nguyễn Thị Minh Giang | `2373430053` | `2373430053@hpn.edu.vn` | `K11QTDLA` | Quản trị dịch vụ du lịch và lữ hành |
| Trần Quỳnh Ngân | `2473810054` | `2473810054@hpn.edu.vn` | `K12LUATB` | Luật |
| Lê Phương Nam | `2577610055` | `2577610055@hpn.edu.vn` | `K13CTXHA` | Công tác xã hội |
| Phạm Hoài Hà | `2673240056` | `2673240056@hpn.edu.vn` | `K14TTDPTB` | Truyền thông đa phương tiện |
| Hoàng Thị Minh Phương | `2373410057` | `2373410057@hpn.edu.vn` | `K11QTKDA` | Quản trị kinh doanh |
| Phan Quỳnh Minh | `2473430058` | `2473430058@hpn.edu.vn` | `K12QTDLB` | Quản trị dịch vụ du lịch và lữ hành |
| Vũ Phương Hương | `2573810059` | `2573810059@hpn.edu.vn` | `K13LUATA` | Luật |
| Đặng Hoài Quỳnh | `2677610060` | `2677610060@hpn.edu.vn` | `K14CTXHB` | Công tác xã hội |

Quy trình test đăng ký:

1. Mở `http://localhost:3000/auth/register`.
2. Chọn một email trong bảng chưa được sử dụng.
3. Nhập mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số; ví dụ `Student@123`.
4. Nhập lại đúng mật khẩu xác nhận.
5. Gửi biểu mẫu. Họ tên, mã sinh viên, lớp và ngành được liên kết tự động từ `StudentDirectory`.
6. Sau khi đăng ký thành công, email đó không thể dùng để đăng ký lần thứ hai.

Danh sách này chỉ đúng ngay sau khi chạy seed. Muốn đặt lại toàn bộ dữ liệu demo, chạy `pnpm db:seed`. Lệnh này xóa dữ liệu nghiệp vụ hiện có trước khi tạo lại dữ liệu mẫu.
