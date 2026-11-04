# Game Caro (PWA) – bản 3

Mới trong bản này:
- Chơi với máy có 5 cấp độ: Dễ, Trung bình, Khó, Rất khó, Siêu khó.
- Tài khoản: đăng ký / đăng nhập bằng email, hoặc chơi với tư cách khách. Khách có thể đăng ký sau để giữ nguyên Elo.

## Cập nhật lên GitHub
Tải đè các file trong thư mục này lên repository (Add file → Upload files → Commit changes).
**KHÔNG có file `firebase-config.js` trong gói này, hãy giữ nguyên file bạn đã điền trên GitHub.**
Bản này đã đổi sw.js sang `caro-v4`, nên người dùng sẽ thấy nút "Có bản mới – bấm để cập nhật".

## Bật đăng nhập bằng email (làm một lần trên Firebase)
1. Vào console.firebase.google.com → project của bạn → Authentication → tab Sign-in method.
2. Bấm Add new provider → chọn Email/Password → gạt công tắc đầu tiên (Email/Password) sang Enable, không cần bật "Email link" → Save.
Anonymous (khách) vẫn giữ Enabled như cũ.

## Cách hoạt động của tài khoản
- Lần đầu bấm Chơi Online hoặc Bảng xếp hạng, game hỏi bạn đăng nhập, đăng ký hay chơi khách.
- Khách đăng ký sau: bấm Tài khoản → nhập email, mật khẩu → Đăng ký. Elo và tên giữ nguyên.
- Đăng nhập tài khoản có sẵn trên máy mới: bấm Tài khoản → Đăng nhập. Tên và avatar được lấy về từ tài khoản. Elo của tài khoản khách đang dùng trên máy đó sẽ không được gộp.
- Email không được lưu vào bảng xếp hạng, chỉ tên và avatar.
- Chưa có chức năng quên mật khẩu.

## Lưu ý
- Elo tính trên máy người chơi, chưa chống gian lận hoàn toàn (chống gian lận chuẩn cần server riêng).
- Elo bị trừ ngay khi trận online bắt đầu và chỉ hoàn lại khi bạn thắng.
