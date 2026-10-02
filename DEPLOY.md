# Hướng dẫn deploy CanteenPN miễn phí

Tài liệu này triển khai hệ thống theo kiến trúc:

- **Vercel**: giao diện Next.js.
- **Render**: NestJS API và Socket.IO.
- **Neon**: PostgreSQL.
- **Cloudinary**: ảnh đại diện và ảnh món ăn.

Redis không bắt buộc khi Render chỉ chạy một API instance.

## Trạng thái triển khai hiện tại

| Thành phần | Nơi chạy/lưu trữ | Tên hoặc địa chỉ hiện tại | Nơi quản lý |
| --- | --- | --- | --- |
| Mã nguồn | GitHub | `ChipBo118/CanteenPN`, nhánh `main` | [GitHub](https://github.com/ChipBo118/CanteenPN) |
| Giao diện web | Vercel | [https://canteenpn.vercel.app](https://canteenpn.vercel.app) | [Vercel Dashboard](https://vercel.com/dashboard) |
| Backend/API và Socket.IO | Render | `canteenpn-api`, [health check](https://canteenpn-api.onrender.com/api/health) | [Render Dashboard](https://dashboard.render.com) |
| PostgreSQL | Neon | Project `CanteenPN`, database `neondb` | [Neon Console](https://console.neon.tech) |
| Ảnh tải lên | Cloudinary | Ảnh đại diện và ảnh món ăn | [Cloudinary Console](https://console.cloudinary.com) |

Máy tính cá nhân **không phải máy chủ production**. Sau khi code đã được push lên GitHub và deploy thành công, có thể tắt máy tính mà website vẫn hoạt động. GitHub chỉ lưu mã nguồn và kích hoạt auto-deploy; request của người dùng được Vercel và Render xử lý, còn dữ liệu nằm trên Neon và Cloudinary.

Luồng một request production:

```text
Trình duyệt
  -> Vercel (Next.js, canteenpn.vercel.app)
  -> /api được chuyển tiếp tới Render (NestJS)
  -> Render đọc/ghi PostgreSQL trên Neon
  -> Render tải và đọc ảnh trên Cloudinary
```

## Quản lý, tắt và bật dự án

### Cập nhật phiên bản mới

GitHub là điểm bắt đầu của việc cập nhật. Push vào nhánh `main` sẽ khiến Render tự deploy backend và Vercel tự deploy frontend theo cấu hình của từng nền tảng:

```powershell
git status
git add .
git commit -m "mô tả thay đổi"
git push origin main
```

Theo dõi quá trình tại **Deploys** trên Render và **Deployments** trên Vercel. Không cần để máy tính mở sau khi `git push` hoàn tất.

### Khởi động lại backend

1. Mở Render Dashboard và chọn `canteenpn-api`.
2. Mở trang **Deploys**.
3. Chọn **Manual Deploy → Restart service** để khởi động lại đúng commit/cấu hình đang chạy.
4. Nếu muốn lấy code mới nhất từ GitHub, chọn **Deploy latest commit**.
5. Chờ trạng thái **Live**, sau đó mở `/api/health` để kiểm tra.

Restart hoặc redeploy không xóa dữ liệu Neon. Khi database đã có dữ liệu, startup sẽ bỏ qua seed.

### Tắt và bật tạm thời

- **Render:** trong danh sách service, chọn `canteenpn-api`, mở menu hành động và chọn **Suspend**. Khi cần bật lại, chọn **Resume**. Khi backend bị suspend, giao diện Vercel vẫn mở được nhưng đăng nhập, menu và các chức năng dữ liệu sẽ không hoạt động.
- **Vercel:** project có thể được pause bằng chức năng pause project/API của Vercel. Khi project bị pause, URL production trả lỗi `503 DEPLOYMENT_PAUSED`. Để bật lại, mở project → **Settings** và chọn **Resume Service** trong thông báo project đang pause.
- **Render Free tự ngủ:** nếu không có truy cập khoảng 15 phút, Render tự spin down. Đây không phải tắt dự án và không cần thao tác bật; request hoặc kết nối WebSocket tiếp theo sẽ tự đánh thức service, thường làm lần mở đầu chậm 30–60 giây.
- **Neon và Cloudinary:** không cần tắt khi tạm ngừng website. Giữ hai dịch vụ này để database và ảnh không bị mất.

Muốn tắt toàn bộ khả năng truy cập công khai, pause Vercel và suspend Render. Muốn mở lại, resume Render trước, kiểm tra health, rồi resume Vercel.

Không chọn **Delete Project/Service** chỉ để tắt tạm thời. Xóa Vercel hoặc Render làm mất cấu hình deploy; xóa Neon có thể làm mất toàn bộ database; xóa tài nguyên Cloudinary có thể làm mất ảnh.

### Quản lý hằng ngày

| Việc cần làm | Nơi thao tác |
| --- | --- |
| Xem code, commit, nhánh | GitHub |
| Xem build frontend, domain và biến `API_PROXY_TARGET` | Vercel |
| Xem log API, restart, deploy và biến bí mật | Render |
| Xem bảng/dữ liệu, dung lượng và connection string | Neon |
| Xem, tìm và xóa ảnh đã tải lên | Cloudinary |

Không sao chép `DATABASE_URL`, API secret Cloudinary hoặc JWT secret vào GitHub, README, ảnh chụp màn hình hay tin nhắn công khai.

## 0. Chuẩn bị

Cần có tài khoản GitHub, [Neon](https://console.neon.tech), [Cloudinary](https://console.cloudinary.com), [Render](https://dashboard.render.com) và [Vercel](https://vercel.com/dashboard).

Các thay đổi deploy phải có trên GitHub trước khi Render và Vercel có thể sử dụng. Tại thư mục gốc dự án, kiểm tra rồi đẩy code:

```powershell
git status
git add .
git commit -m "chore: prepare production deployment"
git push origin main
```

Repository hiện được cấu hình với remote:

```text
https://github.com/ChipBo118/CanteenPN.git
```

Không đưa connection string, API secret hoặc mật khẩu thật vào GitHub.

## 1. Tạo PostgreSQL trên Neon

1. Mở [Neon Console](https://console.neon.tech) và chọn **New Project**.
2. Đặt tên, ví dụ `canteenpn`.
3. Chọn region gần Singapore nếu tài khoản cung cấp lựa chọn này.
4. Sau khi tạo, mở phần **Connection Details**.
5. Bật **Pooled connection** và sao chép connection string.

Connection string thường có dạng:

```text
postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

Giữ giá trị này để dùng cho biến `DATABASE_URL` trên Render. Không dán nó vào `.env.example`, `render.yaml` hoặc bất kỳ file nào được commit.

Neon hiện hỗ trợ Prisma migration qua pooled connection, vì vậy dự án chỉ cần một `DATABASE_URL`. Tham khảo [Neon và Prisma](https://neon.com/blog/better-postgres-with-prisma-experience).

## 2. Tạo nơi lưu ảnh trên Cloudinary

1. Mở [Cloudinary Console](https://console.cloudinary.com).
2. Trong Dashboard, sao chép **Cloud name**.
3. Mở **Settings → API Keys**.
4. Sao chép **API key** và **API secret**.

Chuẩn bị ba giá trị:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

API secret là thông tin bí mật, chỉ nhập vào Render. Xem hướng dẫn chính thức tại [Finding your Cloudinary credentials](https://cloudinary.com/documentation/finding_your_credentials_tutorial).

## 3. Deploy API lên Render

Repository đã có `render.yaml`, vì vậy nên dùng Blueprint:

1. Mở [Render Dashboard](https://dashboard.render.com).
2. Chọn **New + → Blueprint**.
3. Kết nối GitHub nếu chưa kết nối.
4. Chọn repository `ChipBo118/CanteenPN`.
5. Render tự nhận file `render.yaml` ở thư mục gốc.
6. Nhập các biến được Render yêu cầu.

| Biến | Giá trị cần nhập |
| --- | --- |
| `DATABASE_URL` | Pooled connection string từ Neon |
| `WEB_ORIGIN` | Tạm thời nhập `http://localhost:3000`; sẽ thay bằng URL Vercel ở bước 5 |
| `CLOUDINARY_CLOUD_NAME` | Cloud name từ Cloudinary |
| `CLOUDINARY_API_KEY` | API key từ Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret từ Cloudinary |
| `SEED_DEMO_PASSWORD` | Mật khẩu bạn muốn dùng cho các tài khoản mẫu |

`JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` được Render tự sinh từ cấu hình Blueprint. Không cần tự nhập hai biến này.

7. Chọn **Apply/Deploy Blueprint**.
8. Chờ build và deploy hoàn tất. Lần đầu có thể mất vài phút.
9. Trong log, kiểm tra migration hoàn tất và dữ liệu mẫu được tạo.
10. Sao chép URL Render, ví dụ:

```text
https://canteenpn-api.onrender.com
```

Mở URL health sau để kiểm tra:

```text
https://canteenpn-api.onrender.com/api/health
```

Nếu nhận phản hồi thành công, API đã hoạt động. Render Free có thể ngủ sau 15 phút không có truy cập; request đầu tiên sau đó sẽ chậm hơn trong lúc service khởi động lại. Xem [Render free web services](https://render.com/docs/your-first-deploy).

## 4. Deploy giao diện lên Vercel

1. Mở [Vercel Dashboard](https://vercel.com/dashboard).
2. Chọn **Add New → Project**.
3. Import repository `ChipBo118/CanteenPN`.
4. Đặt **Root Directory** thành `apps/web`. Giữ tùy chọn cho phép sử dụng file ngoài Root Directory để Vercel đọc workspace và lockfile ở thư mục gốc.
5. Framework Preset phải là **Next.js**.
6. Thêm hai biến môi trường sau cho Production và Preview:

| Biến | Giá trị |
| --- | --- |
| `API_PROXY_TARGET` | URL Render, không thêm `/api`, ví dụ `https://canteenpn-api.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | Cùng URL Render ở trên |

Không tạo `NEXT_PUBLIC_API_URL` trên Vercel. Web sẽ gọi `/api` trên cùng domain Vercel và chuyển tiếp request đến Render, giúp refresh cookie hoạt động đúng.

7. Chọn **Deploy**.
8. Khi hoàn tất, sao chép URL production, ví dụ:

```text
https://canteenpn.vercel.app
```

Nếu thay đổi biến môi trường Vercel sau này, phải redeploy để deployment mới nhận giá trị. Xem [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## 5. Cho phép domain Vercel gọi API Render

Sau khi đã có URL Vercel:

1. Quay lại Render Dashboard.
2. Mở service `canteenpn-api`.
3. Mở **Environment**.
4. Đổi `WEB_ORIGIN` thành đúng URL Vercel, ví dụ:

```text
https://canteenpn.vercel.app
```

Không thêm dấu `/` ở cuối URL.

5. Chọn lưu và **Save, rebuild, and deploy** nếu Render hỏi.
6. Chờ API deploy lại thành công.

Render hỗ trợ khai báo secret bằng `sync: false` và yêu cầu nhập trong lần tạo Blueprint; xem [Render Blueprint specification](https://render.com/docs/blueprint-spec).

## 6. Kiểm tra sau khi deploy

Thực hiện lần lượt:

1. Mở `https://<render-domain>/api/health`.
2. Mở URL Vercel và kiểm tra menu có dữ liệu.
3. Đăng nhập bằng một tài khoản mẫu và mật khẩu đã nhập ở `SEED_DEMO_PASSWORD`.
4. Thử tạo đơn hàng.
5. Mở màn hình thu ngân/bếp bằng máy hoặc trình duyệt khác để kiểm tra realtime.
6. Thử tải ảnh đại diện hoặc ảnh món ăn.
7. Mở Cloudinary Console để xác nhận ảnh xuất hiện trong thư mục `canteenpn`.

Tài khoản quản trị mẫu:

```text
Email: admin@canteen.hpn.edu.vn
Mật khẩu: giá trị SEED_DEMO_PASSWORD đã nhập trên Render
```

## 7. Cập nhật ứng dụng sau này

Sau khi Render và Vercel đã kết nối GitHub, chỉ cần đẩy code lên nhánh `main`:

```powershell
git add .
git commit -m "mô tả thay đổi"
git push origin main
```

Hai nền tảng sẽ tự tạo deployment mới. Deploy lại hoặc Render khởi động lại không xóa database Neon.

## 8. Nạp lại dữ liệu mẫu

### Chế độ an toàn

```powershell
pnpm db:init
```

Lệnh này chạy migration và chỉ seed nếu database hoàn toàn trống.

### Đặt lại toàn bộ dữ liệu mẫu

`pnpm db:seed` xóa dữ liệu nghiệp vụ hiện có rồi tạo lại dữ liệu mẫu. Để áp dụng cho Neon từ PowerShell:

```powershell
$env:DATABASE_URL='DAN_CONNECTION_STRING_NEON_VAO_DAY'
pnpm db:seed
Remove-Item Env:DATABASE_URL
```

Kiểm tra thật kỹ connection string trước khi chạy. Không dùng lệnh này nếu cần giữ đơn hàng, tài khoản hoặc dữ liệu mà người dùng đã tạo.

## 9. Lỗi thường gặp

### Render không thấy `render.yaml`

- Kiểm tra file đã được commit và push lên GitHub.
- Kiểm tra Blueprint đang chọn đúng repository và nhánh `main`.

### Render báo lỗi kết nối database

- Kiểm tra `DATABASE_URL` không có dấu ngoặc kép thừa.
- Dùng pooled connection string có `-pooler` và `sslmode=require`.
- Nếu đã đổi mật khẩu database trên Neon, cập nhật lại biến trên Render.

### Web mở được nhưng không tải được menu

- Kiểm tra URL `/api/health` của Render trước.
- Kiểm tra `API_PROXY_TARGET` trên Vercel không có `/api` ở cuối.
- Sau khi sửa biến Vercel, redeploy web.

### Lỗi CORS hoặc realtime không kết nối

- `WEB_ORIGIN` trên Render phải giống chính xác URL Vercel, gồm cả `https://`.
- Không thêm dấu `/` cuối URL.
- `NEXT_PUBLIC_SOCKET_URL` phải là URL Render, không có `/api`.

### Đăng nhập tài khoản mẫu không được

- Dùng đúng `SEED_DEMO_PASSWORD` đã nhập trong lần deploy đầu tiên.
- Nếu database đã có dữ liệu, startup sẽ bỏ qua seed để bảo vệ dữ liệu cũ.
- Chỉ dùng `pnpm db:seed` khi thực sự muốn đặt lại toàn bộ dữ liệu mẫu.

### Ảnh tải lên bị lỗi

- Kiểm tra đủ cả ba biến Cloudinary trên Render.
- Không nhập nguyên chuỗi `CLOUDINARY_URL`; dự án này dùng ba biến riêng.
- Redeploy API sau khi thay đổi biến môi trường.

## 10. Checklist hoàn tất

- [ ] Code mới nhất đã được push lên GitHub.
- [ ] Neon đã tạo database và đã lưu pooled connection string.
- [ ] Cloudinary đã lấy đủ ba thông tin xác thực.
- [ ] Render Blueprint deploy thành công.
- [ ] Render health endpoint phản hồi.
- [ ] Vercel deploy thành công.
- [ ] `WEB_ORIGIN` đã đổi thành URL Vercel.
- [ ] Đăng nhập và tải menu thành công.
- [ ] Realtime hoạt động giữa hai trình duyệt.
- [ ] Ảnh mới xuất hiện trên Cloudinary.
