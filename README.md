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
| `gv.html` | bảng theo dõi lớp cho giáo viên, 2 tab: **Kết quả & bài làm** (kết quả từ Google Sheet, tiến độ, góp ý, bài nói, bài viết; cần mã giáo viên) và **Truy cập web** (`gv.html#truy-cap`: ai đang online, lịch sử xem trang, chia TOEIC / IELTS / Tóm tắt lớp Ms.Hoa, lọc theo lớp). Trước đây phần Truy cập web nằm ở `summary-new/thong-ke-gv.html` (link cũ tự chuyển về). |
| `chinh-sach.html` | chính sách quyền riêng tư |
| `acc.js` | đăng nhập Google + đồng bộ tiến độ qua Firebase (project `minto-english`) |
| `progress.js` | tổng hợp tiến độ từ web TOEIC và IELTS |
| `firestore.rules` | **bản đề xuất** luật bảo mật Firestore (xem bên dưới) |

## Luật bảo mật Firebase

Ai được đọc/ghi dữ liệu nào trên Firebase do *Rules* trong Firebase Console quyết định, không phải code trong repo này.

Kiểm tra ngày 25/10/2026:
- **Firestore:** luật đang chạy (áp dụng 21/10) đã an toàn: học viên chỉ đọc/ghi dữ liệu của mình, mã giáo viên (`config/gv`) và dữ liệu cả lớp chỉ thầy đọc được. File `firestore.rules` trong repo chỉ là bản tham khảo cũ, **không Publish đè lên**.
- **Realtime Database:** `who/` và `log/` (có email học viên) chỉ thầy đọc được; `online/` đọc công khai (chỉ đếm số người). Mỗi bản ghi chỉ nhận các trường đã liệt kê (`"$other": {".validate": false}`); đã thêm trường `l` (mã lớp, web Tóm tắt) ngày 25/10. Muốn web gửi thêm trường mới thì phải thêm vào luật trước, nếu không Firebase từ chối cả lần ghi.
