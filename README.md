# QuizMaster Web 🚀
### Ứng dụng Ôn tập & Tạo Đề thi Trắc nghiệm Thông minh bằng Gemini AI (Client-First Web Edition)

QuizMaster Web là phiên bản Web hoàn chỉnh (v1.1.0) được chuyển đổi từ ứng dụng macOS gốc, mang lại trải nghiệm ôn tập trắc nghiệm cao cấp chuẩn Apple Liquid Glass, xử lý 100% trên thiết bị người dùng (Client-Side) với chi phí hosting bằng **0 đồng**.

![QuizMaster Web](assets/AppIcon.png)

---

## ✨ Điểm nổi bật & Tính năng chính

1. **Kiến trúc Client-First (Không tốn chi phí Server)**:
   - **Zero Backend**: Hoạt động hoàn toàn trên trình duyệt người dùng.
   - **Bảo mật & Riêng tư**: API Key cá nhân từ Google AI Studio và toàn bộ dữ liệu bộ đề thi được lưu trong `localStorage` / `IndexedDB` của người dùng.
   - **Xử lý tài liệu tức thì**: Trích xuất văn bản từ tệp Word (`.docx`), PDF (`.pdf`), TXT, JSON và Zip Bundle ngay trên trình duyệt mà không cần tải file lên máy chủ trung gian.

2. **Tạo Đề thi Thông minh với Google Gemini 3.5 Flash Lite**:
   - Sử dụng độc quyền mô hình **Google Gemini 3.5 Flash Lite** tối ưu tốc độ và độ chính xác.
   - Tự động quét và phân tích bài giảng / tài liệu học tập thành câu hỏi trắc nghiệm kèm lời giải thích chi tiết.
   - **3 Chế độ Quét chuyên sâu (Depth Mode)**:
     - 🎯 **Trọng tâm (Core)**: Tập trung vào các định lý, quy tắc và luận điểm cốt lõi.
     - ⚖️ **Tiêu chuẩn (Normal)**: Độ phủ đồng đều, cân bằng.
     - 🔬 **Toàn diện (Thorough)**: Quét chi tiết từng dòng, định nghĩa, mốc thời gian và ví dụ.
   - **Chế độ Luyện thi Ngoại ngữ Chuyên sâu (WIP)**: Phân tích đề thi THPT Quốc gia / IELTS, trích xuất đoạn văn đọc hiểu song song, câu hỏi ngữ pháp/phát âm và bộ thẻ từ vựng phân loại theo khung tham chiếu Châu Âu **CEFR (A1 - C2)**.

3. **3 Chế độ Ôn tập Thông minh**:
   - ✏️ **Luyện tập (Practice)**: Phản hồi đáp án đúng/sai ngay lập tức, bảng điều hướng câu hỏi phân loại theo kỹ năng, công cụ "Hỏi Gemini AI" giải thích từng bước.
   - ⏱️ **Thi thử (Exam Mode)**: Môi trường làm bài thi chuẩn hóa, đồng hồ đếm ngược (15p, Pomodoro 25p, 45p, tùy chỉnh), tự động nộp bài khi hết giờ.
   - 🎴 **Thẻ ghi nhớ 3D (3D Flashcard)**: Hiệu ứng lật thẻ 3D mượt mà với phím Spacebar, học nhiều vòng lặp cách quãng (Spaced Repetition) cho đến khi thuộc 100%.

4. **Công cụ Quản lý & Xuất bản**:
   - **Xuất Gói Zip Bundle**: Xuất bộ câu hỏi (.rtf), đáp án (.rtf) và tệp `quiz_bundle.json` để nhập lại trên bất kỳ thiết bị nào mà không lo mất dữ liệu.
   - **Xuất Word (.docx)**: Xuất đề thi và đáp án sang file Word chuẩn định dạng.
   - **Sao lưu & Khôi phục**: Tải xuống tệp cơ sở dữ liệu JSON và khôi phục nhanh chóng.
   - **Bộ biên tập đề thi (In-App Quiz Editor)**: Thêm, sửa, xóa câu hỏi, phương án và giải thích trực tiếp.

5. **Thiết kế & Trải nghiệm Người dùng**:
   - Giao diện Liquid Glass Apple mượt mà với chế độ Sáng / Tối / Tự động.
   - Menu thao tác 3 chấm thiết kế dạng Action Sheet bằng nút bấm tiện lợi.
   - Hệ thống phím tắt toàn diện: `1, 2, 3, 4` hoặc `A, B, C, D`, `Spacebar`, `Enter`, `Esc`, `← / →`.
   - Hỗ trợ đa ngôn ngữ: Tiếng Việt 🇻🇳 và English 🇬🇧.

---

## 🌐 Hướng dẫn Triển khai Miễn phí (Free Hosting)

Vì QuizMaster Web là một ứng dụng tĩnh (Static Single-Page App), bạn có thể lưu trữ miễn phí vĩnh viễn trên bất kỳ nền tảng nào:

### 1. GitHub Pages (Khuyên dùng)
1. Đẩy mã nguồn thư mục `quiz-web` lên một kho lưu trữ (Repository) trên GitHub.
2. Vào **Settings** > **Pages**.
3. Tại mục **Branch**, chọn `main` (hoặc `master`) và thư mục `/ (root)`, sau đó bấm **Save**.
4. Trang web sẽ sẵn sàng tại `https://<your-username>.github.io/<repo-name>/`.

### 2. Cloudflare Pages (Tiêu thụ 0 Functions/Workers Quota)
1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
2. Chọn **Create application** > **Pages** > **Connect to Git** (hoặc kéo thả thư mục `quiz-web` trực tiếp).
3. Bấm **Deploy**.
4. 💡 **Tối ưu Quota**: Toàn bộ ứng dụng được cấu hình tĩnh 100% với `_headers` và trang điều hướng tĩnh `404.html` (không cần tệp `_redirects`). Các tệp tĩnh được phân phối qua CDN toàn cầu mà **hoàn toàn không tiêu tốn hạn ngạch 100,000 lượt gọi Workers/Functions Free hàng ngày** của Cloudflare!

---

## 🔍 Tự động Co giãn Giao diện theo Trình duyệt (Browser Zoom)
Ứng dụng sử dụng hệ thống đơn vị đo lường linh hoạt (`rem`, `clamp`, fluid layout) thay vì các nút bấm co giãn thủ công, tự động tương thích mượt mà với:
- Phím tắt phóng to / thu nhỏ trình duyệt (`Cmd/Ctrl +` và `Cmd/Ctrl -`).
- Cài đặt kích thước phông chữ mặc định của hệ điều hành và trình duyệt trên mọi thiết bị (máy tính để bàn, laptop, tablet, điện thoại).

### 4. Chạy trên Thiết bị Phần cứng Thấp (Raspberry Pi / VPS 512MB RAM)
Với Nginx hoặc bất kỳ máy chủ web tĩnh nào:
```bash
# Cài đặt Nginx và copy file vào /var/www/html
sudo cp -r /Users/tozn/Misc/quiz-web/* /var/www/html/
sudo systemctl restart nginx
```

---

## 💻 Chạy Thử nghiệm Cục bộ (Local Development)

Bạn có thể chạy thử nghiệm cục bộ bằng bất kỳ công cụ dòng lệnh nào:

```bash
# Cách 1: Sử dụng npx serve (Node.js)
cd /Users/tozn/Misc/quiz-web
npx serve .

# Cách 2: Sử dụng Python
cd /Users/tozn/Misc/quiz-web
python3 -m http.server 8000
```
Sau đó mở trình duyệt tại địa chỉ: `http://localhost:8000` hoặc `http://localhost:3000`.

---

## 📜 Bản quyền & Tác giả
- **Tác giả**: @tozn607 (Anh Vinh)
- **Phiên bản**: v1.1.0 (Web Edition)
- Được phát triển với mục tiêu mang lại giải pháp tự học trắc nghiệm thông minh, hoàn toàn miễn phí và tôn trọng quyền riêng tư người dùng.
