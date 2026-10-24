# Minto English · Trang chung

Trang chủ và các trang dùng chung cho mọi web học của Minto English trên `mangomint1805.github.io`:
[IELTS](https://mangomint1805.github.io/cam/), [TOEIC](https://mangomint1805.github.io/toeic/),
[Tóm tắt TOEIC Pre](https://mangomint1805.github.io/summary-new/).

| File | Dùng để |
|---|---|
| `index.html` | trang chủ, chọn web học |
| `ho-so.html` | hồ sơ của học viên: tiến độ, nhận xét của thầy |
| `ket-qua.html` | kết quả bài làm |
| `xep-hang.html` | bảng xếp hạng tuần |
| `gv.html` | bảng theo dõi lớp cho giáo viên (cần mã giáo viên) |
| `chinh-sach.html` | chính sách quyền riêng tư |
| `acc.js` | đăng nhập Google + đồng bộ tiến độ qua Firebase (project `minto-english`) |
| `progress.js` | tổng hợp tiến độ từ web TOEIC và IELTS |
| `firestore.rules` | **bản đề xuất** luật bảo mật Firestore (xem bên dưới) |

## Luật bảo mật Firestore

Ai được đọc/ghi dữ liệu nào trên Firebase do *Rules* trong Firebase Console quyết định, không phải code trong repo này.
File `firestore.rules` là bản đề xuất, soạn theo cách các trang đang đọc/ghi dữ liệu:

- học viên chỉ đọc/ghi tiến độ, bài nói và nhận xét **của chính mình**;
- bảng xếp hạng: ai đăng nhập cũng xem được, chỉ sửa được dòng của mình;
- mã giáo viên (`config/gv`) và dữ liệu cả lớp: **chỉ thầy** đọc được.

Áp dụng: Firebase Console → Firestore Database → Rules → so với bản đang dùng → thay `EMAIL_GIAO_VIEN` bằng email Google của thầy → Publish.
Sau đó thử lại: đăng nhập bằng tài khoản học viên (đồng bộ tiến độ, bảng xếp hạng, ghi âm Speaking) và tài khoản thầy (`gv.html`).
