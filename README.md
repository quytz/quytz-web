<p align="center">
  <img src="assets/AppIcon.png" width="128" height="128" alt="QuizMaster Web App Icon">
</p>

# QuizMaster Web (v2.0.0)

[![Web Supported](https://img.shields.io/badge/Web-Modern_Browsers-blue.svg)](https://tozn607.github.io/quizmaster-web/)
[![Language](https://img.shields.io/badge/Stack-Vanilla_JS_•_CSS3-orange.svg)](js/)
[![AI Powered](https://img.shields.io/badge/Gemini_AI-3.5_Flash_Lite-purple.svg)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **Ứng dụng Web tự học trắc nghiệm & tạo bộ đề với AI**  
> *Phát triển bởi [@tozn607](https://github.com/tozn607)*

---

### Mở ứng dụng ngay:
Bấm vào nút bên dưới 👇   
  
[![](https://img.shields.io/badge/Trải_nghiệm_ngay_QuizMaster_Web-Bản_Mới_Nhất-blue?style=for-the-badge&logo=googlechrome)](https://tozn607.github.io/quizmaster-web/)

> **Toàn bộ dữ liệu, đề thi và API Key được xử lý trực tiếp trên trình duyệt của bạn thông, hoàn toàn không phụ thuộc vào máy chủ trung gian và đảm bảo quyền riêng tư.**

---

## Tài liệu Hướng dẫn

Nhấn vào đây: **[Hướng dẫn Sử dụng Chi tiết](User_guide.md)**

## Tổng quan & Tính năng Nổi bật

**QuizMaster Web** là phiên bản web hoàn chỉnh được phát triển thuần bằng **HTML5**, **Vanilla JavaScript** và **CSS3 Modern Glass**, không cần máy chủ backend. Ứng dụng kết nối với mô hình AI **Gemini 3.5 Flash Lite** từ Google AI Studio giúp sinh viên, học sinh và giáo viên tự động quét tài liệu bài giảng (PDF, Word `.docx`, TXT, Zip Bundle) để tạo ra các bộ đề thi trắc nghiệm chất lượng cao.

### Về trách nhiệm sử dụng AI tạo sinh (Generative AI):
- **QuizMaster Web** được hỗ trợ biên soạn mã nguồn bằng model AI tạo sinh **Gemini 3.7 Flash**. Việc chỉnh sửa và kiểm nghiệm mã nguồn đều do con người (tác giả [@tozn607](https://github.com/tozn607)) thực hiện.
- **Điều quan trọng nhất**, với vai trò là một sinh viên đang trong quá trình học tập, tác giả tin rằng tất cả các nội dung do AI tạo ra đều **mang tính chất tham khảo và cần được kiểm nghiệm bởi người sử dụng** để đảm bảo tính chính xác và phù hợp. Tác giả không chịu trách nhiệm về các sai sót có thể xảy ra khi người dùng sử dụng các nội dung do AI tạo ra.

### Các Tính năng Nổi bật:
- **Chế độ Đề thi THPT Quốc gia (3 Phần - Thử nghiệm)**: Hỗ trợ cấu trúc đề thi 3 phần chuẩn Bộ GD&ĐT gồm Phần I (Trắc nghiệm 4 lựa chọn), Phần II (Trắc nghiệm Đúng/Sai 4 ý chấm điểm theo công thức Bộ), Phần III (Trả lời ngắn). Tích hợp giải mã công thức toán MathType/LaTeX và chấm điểm tự động trên thang 10.0.
- **Chế độ Học Ngoại ngữ (Thử nghiệm)**: Hỗ trợ phân tích chuyên sâu các đề thi tiếng Anh (THPT Quốc Gia, IELTS, TOEIC), tự động tách bài đọc hiểu với thanh tùy biến định dạng font/màu giấy, chia nhóm kỹ năng (Phát âm, Ngữ pháp, Điền từ) và trích xuất bộ thẻ Flashcard từ vựng theo khung trình độ CEFR.
- **Quét Tài liệu & Tạo Đề bằng AI**: Tự động chuyển đổi tài liệu bài giảng PDF, Word (`.docx`), TXT thành bộ đề trắc nghiệm hoàn chỉnh kèm đáp án và lời giải chi tiết.
- **Hệ thống Icon Apple SF Symbols**: Toàn bộ icon trong ứng dụng được chuẩn hóa bằng thư viện vector SVG lấy cảm hứng từ Apple SF Symbols, mang lại giao diện tinh tế và sắc nét trên mọi độ phân giải.
- **Mức độ Chi tiết Câu hỏi**: 3 chế độ quét linh hoạt: **Trọng tâm** (~8-15 câu), **Tiêu chuẩn** (~12-20 câu), **Toàn diện** (~35-60+ câu).
- **Thẻ ghi nhớ 3D**: Lật thẻ mượt mà với nút "Thẻ trước" xem lại lịch sử thẻ. Khi kết thúc vòng học, màn hình tổng kết cho phép tiếp tục học các thẻ chưa thuộc hoặc học lại từ đầu.
- **Chế độ Thi thử**: Môi trường thi thật không hiện đáp án và ẩn nút Hỏi AI để đảm bảo đánh giá chính xác năng lực. Có đồng hồ đếm ngược linh hoạt và tự động nộp bài khi hết giờ.
- **Công tắc Xáo trộn**: Nút **"🔀 Xáo trộn"** bật/tắt xáo trộn vị trí câu hỏi và các phương án A/B/C/D linh hoạt, hoàn toàn bảo toàn kết quả đã chọn và lịch sử làm bài.
- **Thanh Điều hướng Câu hỏi**: Bảng bên phải hiển thị danh sách câu hỏi theo màu trạng thái (Đúng, Sai, Đã thuộc, Chưa làm) giúp di chuyển nhanh giữa các câu.
- **Lưu Vị trí Học Tự động**: Tự động lưu tiến độ làm bài luyện tập, cho phép thoát ra và quay lại đúng câu đang làm dở.
- **Trình Chỉnh sửa Đề thi**: Thêm, chỉnh sửa hoặc xóa câu hỏi, phương án và giải thích chi tiết trực tiếp trong ứng dụng.
- **Xuất & Sao lưu Dữ liệu**: Hỗ trợ xuất gói Zip Bundle (chứa RTF và JSON để nhập lại), xuất tệp Word (`.docx`) để in ấn ra giấy, sao lưu và khôi phục toàn bộ dữ liệu chỉ với một nút bấm.

### Phím tắt Bàn phím

| Chế độ | Phím tắt | Thao tác |
| :--- | :--- | :--- |
| **Luyện tập & Thi thử** | `A`, `B`, `C`, `D` (hoặc `1`, `2`, `3`, `4`) | Chọn phương án A, B, C, D |
| **Luyện tập & Thi thử** | `Enter (↵)` | Sang câu tiếp theo / Nộp bài |
| **Thi thử** | `Mũi tên Trái / Phải (← →)` | Di chuyển qua lại giữa các câu |
| **Thẻ ghi nhớ**| `Phím Cách (Spacebar ␣)` | Lật mặt trước / mặt sau của thẻ |
| **Thẻ ghi nhớ**| `Mũi tên Trái (←)` | Quay lại thẻ trước |
| **Thẻ ghi nhớ**| `Phím V` (hoặc `1`) | Đánh dấu thẻ **V - Đã thuộc** |
| **Thẻ ghi nhớ**| `Phím X` (hoặc `2`) | Đánh dấu thẻ **X - Chưa thuộc** |
| **Tất cả các chế độ** | `Phím Esc` | Thoát chế độ học về màn hình chính |

---

## Chạy Thử nghiệm Cục bộ & Triển khai

### 1. Chạy Thử nghiệm Cục bộ

Bạn có thể khởi chạy ứng dụng nhanh chóng bằng Python hoặc Node.js:

```bash
# Clone repository
git clone https://github.com/tozn607/quizmaster-web.git
cd quizmaster-web

# Cách 1: Chạy bằng Python 3
python3 -m http.server 8000

# Cách 2: Chạy bằng Node.js npx serve
npx serve .
```

Sau đó mở trình duyệt tại `http://localhost:8000`.

### 2. Triển khai Miễn phí (Hosting)

- **GitHub Pages**: Đẩy mã nguồn lên nhánh `main`, vào **Settings** > **Pages** và chọn Deploy từ thư mục `/ (root)`.
- **Cloudflare Pages**: Kết nối với kho mã nguồn trên GitHub, chọn Deploy trực tiếp (0 Workers call, phân phối qua CDN toàn cầu).

---

## Tác giả & Giấy phép

- **Tác giả**: [@tozn607](https://github.com/tozn607)
- **Giấy phép**: Phát hành theo giấy phép MIT.
