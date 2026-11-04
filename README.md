# Game Caro (PWA) – bản 2

Tính năng mới: menu Online/Offline, Elo + bảng xếp hạng, bàn cờ vô hạn có zoom, thanh tên/avatar/Elo phía trên, giới hạn 30 giây mỗi lượt (hết giờ là thua).

## Cập nhật lên GitHub
Tải đè TẤT CẢ file trong thư mục này lên repository (index.html, app.js, sw.js, firebase-config.js, firebase-rules.json, manifest, icon...). Chế độ Offline hoạt động ngay, chưa cần Firebase.

## Bật chơi Online (Firebase, gói Spark miễn phí)
1. Vào console.firebase.google.com → Add project (có thể tắt Google Analytics).
2. Build → Authentication → Get started → tab Sign-in method → bật **Anonymous**.
3. Build → Realtime Database → Create Database → chọn vị trí (ví dụ Singapore) → Start in locked mode.
4. Trong Realtime Database, tab **Rules**: xóa nội dung cũ, dán toàn bộ nội dung file `firebase-rules.json` → Publish.
5. Project settings (biểu tượng bánh răng) → Your apps → biểu tượng Web `</>` → đặt tên app → copy khối `firebaseConfig`.
6. Mở `firebase-config.js`, thay các giá trị `PASTE...` bằng thông tin vừa copy. Dòng `databaseURL` nằm ở trang Realtime Database nếu khối config không có.
7. Nếu bị lỗi tên miền: Authentication → Settings → Authorized domains → thêm `TEN-CUA-BAN.github.io`.
8. Tải `firebase-config.js` lên GitHub. Đổi `caro-v2` thành `caro-v3` trong `sw.js` mỗi lần phát hành.

## Lưu ý
- Elo được tính trên máy người chơi, nên chưa chống gian lận hoàn toàn (người rành kỹ thuật vẫn có thể sửa điểm). Chống gian lận chuẩn cần server riêng (Cloud Functions, phải bật gói trả phí). Hiện tại cách này đủ cho nhóm bạn bè.
- Để hạn chế bỏ trận: Elo bị trừ ngay khi trận bắt đầu và chỉ được hoàn lại khi bạn thắng.
- Tài khoản là ẩn danh, gắn với trình duyệt/app đã cài. Xóa dữ liệu trình duyệt, hoặc cài lại bản PWA trên iPhone (bộ nhớ riêng với Safari), sẽ tạo người chơi mới với 1000 Elo.
- Gói Spark có giới hạn kết nối đồng thời và dung lượng, hãy xem trang giá Firebase để biết con số hiện hành.
