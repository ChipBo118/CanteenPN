# CanteenPN

CanteenPN là hệ thống quản lý căng tin dành cho sinh viên và nhân viên nhà trường. Ứng dụng hỗ trợ toàn bộ quy trình từ xem thực đơn, đặt món, thanh toán và nhận món đến quản lý vận hành căng tin.

Website: [https://canteenpn.vercel.app](https://canteenpn.vercel.app)

## Chức năng chính

### Sinh viên

- Đăng ký bằng email có sẵn trong danh sách sinh viên của trường.
- Đăng nhập, xem và cập nhật hồ sơ cá nhân.
- Xem thực đơn, biến thể món, tùy chọn đường/đá và combo.
- Thêm món vào giỏ, áp dụng mã giảm giá, voucher hoặc điểm thưởng.
- Đặt món ăn tại chỗ hoặc mang đi, nhận ngay hoặc hẹn giờ.
- Theo dõi trạng thái đơn theo thời gian thực.
- Quản lý ví căng tin, điểm thưởng, voucher và món yêu thích.
- Đánh giá món và trao đổi với thu ngân theo từng đơn hàng.

### Thu ngân

- Tiếp nhận, xác nhận hoặc từ chối đơn.
- Theo dõi thanh toán và cập nhật trạng thái đơn.
- Trao đổi với sinh viên trong phòng chat của đơn hàng.
- Xử lý các nghiệp vụ tại quầy theo thời gian thực.

### Nhân viên bếp

- Xem danh sách món cần chuẩn bị.
- Nhận món, bắt đầu chế biến và đánh dấu hoàn tất.
- Theo dõi nguyên liệu và tình trạng còn hàng.

### Quản trị viên

- Xem dashboard, doanh thu, đơn hàng và báo cáo.
- Quản lý sinh viên, nhân viên, thực đơn, combo và danh mục.
- Quản lý kho, phiếu nhập, mã giảm giá, voucher và ví.
- Khóa/mở tài khoản, đặt lại mật khẩu và cấu hình căng tin.
- Tải ảnh đại diện hoặc ảnh món ăn lên kho ảnh.

## Luồng chạy thử đề xuất

Nên dùng nhiều cửa sổ trình duyệt hoặc cửa sổ ẩn danh để quan sát cập nhật thời gian thực giữa các vai trò.

### 1. Kiểm tra website

1. Mở [website CanteenPN](https://canteenpn.vercel.app).
2. Lần truy cập đầu có thể mất khoảng 30–60 giây để khởi động.

### 2. Chạy thử luồng sinh viên đặt món

1. Đăng nhập bằng tài khoản sinh viên `2373240001@hpn.edu.vn`.
2. Mở thực đơn và chọn một món.
3. Chọn biến thể hoặc tùy chọn nếu món hỗ trợ.
4. Thêm món vào giỏ hàng.
5. Mở giỏ, chọn hình thức nhận món và tạo đơn.
6. Mở danh sách đơn để theo dõi trạng thái.
7. Sau khi đơn hoàn tất, thử đánh giá món.

### 3. Chạy thử luồng thu ngân và bếp

1. Giữ cửa sổ sinh viên đang mở.
2. Mở cửa sổ ẩn danh thứ nhất và đăng nhập `thungan01@canteen.hpn.edu.vn`.
3. Thu ngân tiếp nhận đơn vừa tạo và chuyển sang trạng thái được chấp nhận.
4. Mở cửa sổ ẩn danh thứ hai và đăng nhập `bep01@canteen.hpn.edu.vn`.
5. Nhân viên bếp nhận món, bắt đầu chuẩn bị và đánh dấu món đã sẵn sàng.
6. Quay lại cửa sổ thu ngân để hoàn tất đơn.
7. Quan sát trạng thái tự cập nhật trong cửa sổ sinh viên.

### 4. Chạy thử quản trị

1. Đăng nhập `admin@canteen.hpn.edu.vn`.
2. Kiểm tra dashboard và danh sách 200 đơn mẫu.
3. Mở các màn hình sinh viên, nhân viên, thực đơn, kho và báo cáo.
4. Thử cập nhật một món hoặc cấu hình căng tin.
5. Thử tải ảnh mới và kiểm tra ảnh hiển thị lại trên website.

### 5. Chạy thử đăng ký tài khoản mới

1. Mở [trang đăng ký](https://canteenpn.vercel.app/auth/register).
2. Chọn một email trong mục **Email sinh viên chưa đăng ký** phía dưới.
3. Nhập mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số, ví dụ `Student@123`.
4. Nhập lại mật khẩu và gửi biểu mẫu.
5. Sau khi đăng ký thành công, đăng nhập bằng email và mật khẩu vừa tạo.

Mỗi email chỉ đăng ký được một lần. Nếu một người đã dùng email đó, hãy chọn email khác trong danh sách.

## Tài khoản đăng nhập mẫu

Các tài khoản đã được tạo sẵn dùng chung mật khẩu:

```text
CanteenGo@123
```

### Nhân viên và quản trị

| Vai trò | Email | Mã nhân viên |
| --- | --- | --- |
| Quản trị viên | `admin@canteen.hpn.edu.vn` | `VWA-ADM-001` |
| Thu ngân | `thungan01@canteen.hpn.edu.vn` | `VWA-TN-001` |
| Thu ngân | `thungan02@canteen.hpn.edu.vn` | `VWA-TN-002` |
| Nhân viên bếp | `bep01@canteen.hpn.edu.vn` | `VWA-BEP-001` |
| Nhân viên bếp | `bep02@canteen.hpn.edu.vn` | `VWA-BEP-002` |

### Sinh viên đã đăng ký

Có 50 tài khoản sinh viên được tạo sẵn. Một số tài khoản dùng để chạy thử nhanh:

| Họ tên | Email | Mã sinh viên |
| --- | --- | --- |
| Nguyễn Thị Minh Anh | `2373240001@hpn.edu.vn` | `2373240001` |
| Trần Quỳnh Lan | `2473410002@hpn.edu.vn` | `2473410002` |
| Lê Phương Thảo | `2573430003@hpn.edu.vn` | `2573430003` |

## Email sinh viên chưa đăng ký

50 email dưới đây có hồ sơ trong danh sách sinh viên nhưng chưa có tài khoản ngay sau khi seed. Có thể dùng chúng để chạy thử luồng đăng ký:

```text
2573240051@hpn.edu.vn
2673410052@hpn.edu.vn
2373430053@hpn.edu.vn
2473810054@hpn.edu.vn
2577610055@hpn.edu.vn
2673240056@hpn.edu.vn
2373410057@hpn.edu.vn
2473430058@hpn.edu.vn
2573810059@hpn.edu.vn
2677610060@hpn.edu.vn
2373240061@hpn.edu.vn
2473410062@hpn.edu.vn
2573430063@hpn.edu.vn
2673810064@hpn.edu.vn
2377610065@hpn.edu.vn
2473240066@hpn.edu.vn
2573410067@hpn.edu.vn
2673430068@hpn.edu.vn
2373810069@hpn.edu.vn
2477610070@hpn.edu.vn
2573240071@hpn.edu.vn
2673410072@hpn.edu.vn
2373430073@hpn.edu.vn
2473810074@hpn.edu.vn
2577610075@hpn.edu.vn
2673240076@hpn.edu.vn
2373410077@hpn.edu.vn
2473430078@hpn.edu.vn
2573810079@hpn.edu.vn
2677610080@hpn.edu.vn
2373240081@hpn.edu.vn
2473410082@hpn.edu.vn
2573430083@hpn.edu.vn
2673810084@hpn.edu.vn
2377610085@hpn.edu.vn
2473240086@hpn.edu.vn
2573410087@hpn.edu.vn
2673430088@hpn.edu.vn
2373810089@hpn.edu.vn
2477610090@hpn.edu.vn
2573240091@hpn.edu.vn
2673410092@hpn.edu.vn
2373430093@hpn.edu.vn
2473810094@hpn.edu.vn
2577610095@hpn.edu.vn
2673240096@hpn.edu.vn
2373410097@hpn.edu.vn
2473430098@hpn.edu.vn
2573810099@hpn.edu.vn
2677610100@hpn.edu.vn
```

Danh sách email chưa đăng ký chỉ chính xác ngay sau khi dữ liệu mẫu được nạp lại. Email đã đăng ký thành công sẽ không thể dùng để đăng ký lần thứ hai.
