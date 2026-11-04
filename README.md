# Game Caro (PWA)

## 1. Đưa lên web miễn phí (GitHub Pages)
1. Tạo tài khoản GitHub, tạo repository mới (ví dụ `caro`), chế độ Public.
2. Tải toàn bộ file trong thư mục này lên repository (kéo thả trên trang GitHub, bao gồm cả `.nojekyll`).
3. Vào Settings → Pages → Source: chọn nhánh `main`, thư mục `/ (root)` → Save.
4. Sau 1–2 phút, game chạy tại `https://TEN-CUA-BAN.github.io/caro/`. Đây là bản web, cũng là link để cài lên điện thoại.

## 2. Người dùng cài một lần
- iPhone/iPad: mở link bằng Safari → nút Chia sẻ → "Thêm vào Màn hình chính".
- Android: mở bằng Chrome → menu ⋮ → "Cài đặt ứng dụng".

## 3. Cập nhật cho mọi người
1. Sửa code, rồi đổi `const V = 'caro-v1'` trong `sw.js` thành `caro-v2`, `caro-v3`...
2. Tải lại các file đã sửa lên GitHub.
3. Lần mở app tiếp theo, người dùng sẽ thấy nút "Có bản mới – bấm để cập nhật". Không cần cài lại.

## 4. File APK cho Android (miễn phí)
- Cách nhanh: vào pwabuilder.com, nhập link GitHub Pages của bạn, chọn Android và tải gói về.
- Để ẩn thanh địa chỉ của Chrome trong APK, cần file `.well-known/assetlinks.json` ở gốc tên miền; với GitHub Pages thì repository phải tên `TEN-CUA-BAN.github.io`.
- Giữ cẩn thận file keystore (ký APK); mất nó thì không thể phát hành bản cập nhật cùng gói.
