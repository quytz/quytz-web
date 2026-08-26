# HƯỚNG DẪN SỬ DỤNG CHI TIẾT QUÝTZ WEB (v2.0.1)

Tác giả: **@tozn607**  
Nền tảng: Web (Trình duyệt máy tính & di động)  
Ngày soạn: **26 Tháng 8 năm 2026**  
Dành cho phiên bản: **v2.0.1**


## CHƯƠNG 1: MÀN HÌNH HƯỚNG DẪN CẤU HÌNH BAN ĐẦU & API KEY

Khi truy cập **Quýtz Web** lần đầu tiên trên trình duyệt, ứng dụng sẽ tự động hiển thị **Màn hình Cấu hình Ban đầu** gồm 4 bước đơn giản:

1. **Bước 1: Giới thiệu chung**
   - Giới thiệu tổng quan về các tính năng của Quýtz Web. Nhấn nút **"Bắt đầu Cấu hình ➔"** để chuyển sang bước tiếp theo.

2. **Bước 2: Cài đặt API Key Gemini AI**
   - **Tại sao lại cần API Key cá nhân?:** Để đảm bảo quyền riêng tư và để ứng dụng dễ tiếp cận hơn với số đông, tác giả không tích hợp sẵn API Key mà để người dùng tự cấu hình bằng API Key miễn phí đến từ Google. Mỗi tài khoản Google của bạn được cấp một hạn mức sử dụng model Gemini 3.5 Flash Lite miễn phí, dư dả để tạo một lượng lớn đề thi và lời giải trong một ngày. Việc tự nhập API Key cá nhân giúp giữ ứng dụng miễn phí và có mã nguồn mở. Ngược lại, nếu tác giả đính kèm sẵn API Key thì lượng sử dụng từ cộng đồng sẽ vượt hạn mức và tác giả sẽ phải trả phí dịch vụ cho Google.
   - Nhấn nút **"Lấy API Key từ Google AI Studio ↗"** để mở trang đăng ký API Key miễn phí của Google.
   - Ở góc phía trên bên phải của trang web, nhấn **Create API Key**, đặt tên cho Key và chọn **Default Gemini Project**, sau đó sao chép chuỗi mã API Key.
   - Dán API Key vào ô nhập liệu và nhấn nút **"Kiểm tra API Key"** (khi kết nối thành công, ứng dụng sẽ hiển thị thông báo màu xanh `✓ API Key hợp lệ`).
   - Nhấn **"Tiếp tục ➔"**.

3. **Bước 3: Tùy chỉnh Giao diện & Hướng dẫn Nhanh**
   - Chọn **Chủ đề giao diện** (Sáng / Tối / Tự động theo hệ thống).
   - Xem qua tóm tắt các phím tắt và thao tác nhanh để tiện sử dụng trên máy tính.

4. **Bước 4: Hoàn tất Cấu hình**
   - Bấm **"Vào sử dụng Quýtz ngay 🚀"** để bắt đầu hành trình ôn tập.

*(Nếu muốn thay đổi lại API Key hoặc Giao diện sau này, bạn có thể bấm vào biểu tượng **Cài đặt (⚙️)** ở thanh bên bất kỳ lúc nào).*

<details>
  <summary>Nhấn vào đây để xem cách chỉnh sửa lại Cài đặt & API Key</summary>

   1. Mở trang **Quýtz Web** trên trình duyệt của bạn.
   2. Nhấn vào biểu tượng **Cài đặt (⚙️)** ở đầu thanh bên (Sidebar).
   3. Nếu cần lấy mã mới, bấm nút **"Lấy API Key từ Google AI Studio ↗"**, tạo và sao chép mã dán vào ô **"Google AI Studio Key (Gemini API)"**.
   4. Nhấn **"Kiểm tra API Key"** để chắc chắn hệ thống phản hồi tốt (hiển thị thông báo màu xanh `✓ API Key hợp lệ`).
   5. Tùy chỉnh Chủ đề giao diện (Sáng / Tối / Tự động).
</details>

### Lưu ý về Lưu trữ & Quyền riêng tư trên Trình duyệt:
- Toàn bộ dữ liệu bộ đề thi, tiến độ học tập và API Key của bạn đều được lưu trữ trực tiếp trong bộ nhớ trình duyệt (`localStorage` và `IndexedDB`) trên chính thiết bị của bạn.
- Ứng dụng hoạt động theo kiến trúc xử lý thuần phía máy khách (Client-Side), hoàn toàn không gửi tài liệu hay dữ liệu học tập lên bất kỳ máy chủ trung gian nào.
- Bạn nên sử dụng tính năng **Sao lưu Dữ liệu** trong phần Cài đặt định kỳ để đề phòng trường hợp vô tình xóa dữ liệu duyệt web hoặc khi muốn chuyển đổi thiết bị.


## CHƯƠNG 2: QUÉT TÀI LIỆU & TẠO BỘ ĐỀ BẰNG GEMINI AI

1. Bấm nút **"Nhập Tài liệu / Bộ đề"** với dải màu cầu vồng nổi bật ở góc trên màn hình chính.
2. Chọn tệp bài giảng PDF, Word (`.docx`), văn bản TXT, tệp JSON hoặc gói Zip Bundle.
   - *💡 Lưu ý thời lượng quét:* Tài liệu càng dài thì thời gian Gemini AI đọc và phân tích sẽ càng lâu hơn. Bạn nên lọc bớt những phần bìa, mục lục hoặc nội dung phụ trước khi quét để đạt kết quả tốt nhất.
3. Nếu là tệp bài giảng lý thuyết thông thường: Bật tùy chọn **"Tạo câu hỏi trắc nghiệm tự động"** và chọn 1 trong 3 mức độ quét:
   - **Trọng tâm**: Tập trung vào các khái niệm cốt lõi, quy tắc và định nghĩa quan trọng nhất (~8-15 câu).
   - **Tiêu chuẩn**: Độ phủ cân đối, rải đều các nội dung bài học (~12-20 câu).
   - **Toàn diện**: Quét chuyên sâu từng chi tiết, số liệu, mốc thời gian và định lý (~35-60+ câu).  
   *Lưu ý:* Nếu tệp tải lên là đề thi trắc nghiệm đã có sẵn câu hỏi: Bạn không cần bật chế độ tạo tự động; ứng dụng sẽ tự trích xuất nguyên văn câu hỏi, các phương án A/B/C/D và phần giải thích có trong tài liệu.
4. Bấm **"Bắt đầu Quét với Gemini AI"** và chờ trong giây lát để hệ thống tạo bộ đề thi.

### 2.1. CHẾ ĐỘ HỌC NGOẠI NGỮ
> ⚠️ **Lưu ý**: Chế độ Học Ngoại ngữ là tính năng chuyên sâu dành riêng cho các **Dự án Học Ngoại ngữ**, hiện đang trong giai đoạn phát triển và hoàn thiện (WIP).

1. **Tạo Dự án Ngoại ngữ**: Khi bấm nút `+` ở thanh bên, chọn loại dự án là **"Dự án Học Ngoại ngữ"**.
2. **Nhập Đề thi Ngoại ngữ**:
   - Bấm **"Nhập Tài liệu / Bộ đề"** và mở rộng mục **"Học Ngoại Ngữ"**.
   - Chọn tệp đề thi (Word, PDF, TXT) theo chuẩn cấu trúc đề thi THPT Quốc gia, IELTS hoặc TOEIC.
   - Chọn **Khung trình độ CEFR** (A1, A2, B1, B2, C1, C2) để AI tự động trích xuất danh sách thẻ từ vựng tương ứng với cấp độ đã chọn.
3. **Các Điểm Nổi Bật**:
   - **Khung đọc bài chuyên dụng**: Tự động tách bài đọc hiểu sang cột bên trái màn hình với thanh công cụ điều chỉnh cỡ chữ (A- / A+), kiểu chữ (Không chân, Có chân, Hệ thống), màu giấy nền (Sepia, Trắng, Tối) và khoảng cách dòng.
   - **Phân nhóm Kỹ năng**: Danh sách câu hỏi tự động được phân chia theo kỹ năng (Phát âm, Ngữ pháp, Điền từ, Đọc hiểu) giúp bạn dễ dàng theo dõi từng phần thi.
   - **Thẻ từ vựng CEFR**: Tự động tạo danh sách thẻ từ vựng kèm từ loại, phiên âm chuẩn quốc tế, nghĩa tiếng Việt và câu ví dụ minh họa in đậm từ khóa.

### 2.2. CHẾ ĐỘ ĐỀ THI THPT QUỐC GIA (3 PHẦN)
> ⚠️ **Lưu ý**: Chế độ Đề thi THPT Quốc gia là tính năng chuyên sâu dành riêng cho các **Dự án THPT Quốc gia**, hiện đang trong giai đoạn phát triển và thử nghiệm (WIP).

1. **Tạo Dự án THPT Quốc gia**: Khi bấm nút `+` ở thanh bên, chọn loại dự án là **"Dự án THPT Quốc gia (3 Phần)"**.
2. **Nhập Đề thi THPT Quốc gia**:
   - Bấm **"Nhập Tài liệu / Bộ đề"** và chọn tệp đề thi Word (`.docx`), PDF hoặc văn bản TXT.
   - AI sẽ tự động phân tích và chia đề thi theo đúng cấu trúc 3 phần chuẩn của Bộ Giáo dục & Đào tạo.
3. **Cấu trúc 3 Phần và Cách Tính Điểm**:
   - **Phần I - Trắc nghiệm 4 lựa chọn**: Thí sinh chọn 1 trong 4 phương án A, B, C, D (0.25 điểm / câu).
   - **Phần II - Trắc nghiệm Đúng / Sai (4 ý a, b, c, d)**: Thí sinh chọn Đúng hoặc Sai cho từng ý. Điểm số được tính tự động theo công thức của Bộ GD&ĐT:
     - Đúng 1 ý: **0.1 điểm**
     - Đúng 2 ý: **0.25 điểm**
     - Đúng 3 ý: **0.5 điểm**
     - Đúng 4 ý: **1.0 điểm**
   - **Phần III - Trả lời ngắn**: Thí sinh tự điền đáp án số hoặc chữ ngắn vào ô trả lời (0.25 hoặc 0.5 điểm / câu).
4. **Trình Chỉnh sửa & Kiểm tra**: Do độ phức tạp của công thức toán học và hình vẽ, bạn nên mở **Trình Chỉnh sửa** (`✏️`) để kiểm tra lại công thức và hình ảnh minh họa nếu cần thiết.


## CHƯƠNG 3: BA CHẾ ĐỘ ÔN TẬP VÀ THANH ĐIỀU HƯỚNG CÂU HỎI

Sau khi tạo hoặc nhập xong, bộ đề thi sẽ xuất hiện trên màn hình chính của Dự án tương ứng. Bạn có thể lựa chọn 1 trong 3 chế độ học:

1. **Chế độ Luyện tập**:
   - Làm bài trắc nghiệm với phản hồi đúng hoặc sai ngay sau khi chọn đáp án.
   - **Lưu tiến độ tự động**: Vị trí câu đang làm và các đáp án đã chọn được lưu liên tục. Bạn có thể yên tâm đóng tab hoặc chuyển sang việc khác, khi mở lại bài học sẽ tiếp tục ngay tại câu đang làm dở.
   - **Thanh Điều hướng Câu hỏi**: Bảng danh sách bên phải hiển thị trạng thái từng câu theo màu sắc (Xanh lá = Đúng, Đỏ = Sai, Xám = Chưa làm), bấm vào số thứ tự để chuyển nhanh tới câu mong muốn.
   - **Hỏi Gemini AI**: Bấm nút **"✨ Hỏi AI"** ở dưới mỗi câu để yêu cầu trợ lý AI giải thích chi tiết phương pháp giải và lý do chọn đáp án.
   - **Làm lại câu sai**: Sau khi hoàn thành bài luyện tập, bạn có thể chọn "Làm lại câu sai" để tập trung củng cố những câu trả lời chưa đúng. Khi bạn chọn đúng, điểm số và tiến độ của bộ đề sẽ được tự động cập nhật lại.

2. **Chế độ Thi thử**:
   - Mô phỏng môi trường thi thật: không hiển thị đáp án đúng/sai tức thì và ẩn nút Hỏi AI để đảm bảo đánh giá khách quan năng lực.
   - **Tùy chỉnh Đồng hồ Đếm ngược**: Trước khi bắt đầu bài thi, bạn có thể chọn thời gian làm bài phù hợp (15 phút, 25 phút Pomodoro, 45 phút chuẩn hóa, 60 phút, 90 phút hoặc chế độ Không giới hạn thời gian).
   - Khi hết giờ làm bài, hệ thống sẽ tự động khóa và nộp bài.
   - Sau khi nộp bài, màn hình kết quả sẽ tổng kết chi tiết điểm số, tỷ lệ phần trăm và mở bảng phân tích từng câu hỏi.

3. **Chế độ Thẻ ghi nhớ 3D**:
   - Thẻ hiển thị câu hỏi ở mặt trước, bấm phím Cách hoặc nhấp chuột vào thẻ để lật xem đáp án và giải thích ở mặt sau với hiệu ứng xoay 3D mượt mà.
   - Sử dụng nút **"Đã thuộc bài"** (nút xanh) và **"Chưa thuộc"** (nút đỏ) để đánh giá mức độ ghi nhớ.
   - Nút **"Thẻ trước"** hỗ trợ lùi lại xem thẻ vừa duyệt qua mà không làm mất trạng thái.
   - **Lặp lại ngắt quãng**: Sau khi duyệt hết lượt đầu tiên, hệ thống sẽ tự động tổng hợp những thẻ chưa thuộc để bạn tiếp tục ôn luyện các vòng tiếp theo cho đến khi nắm vững 100%.


## CHƯƠNG 4: QUẢN LÝ DỰ ÁN, BỘ ĐỀ THI & CÔNG TẮC XÁO TRỘN

1. **Tạo Dự án mới**: Nhấn nút `+` ở thanh bên (Sidebar), nhập tên dự án (Ví dụ: *Lịch Sử 12*, *Tiếng Anh B2*, *Triết học Mác - Lênin*...).
2. **Quản lý Dự án**: Nhấn vào biểu tượng 3 chấm (`⋯`) cạnh tên dự án ở thanh bên để:
   - Đổi tên dự án.
   - Đặt lại tiến độ của tất cả bộ đề trong dự án về ban đầu.
   - Xóa dự án (có hộp thoại xác nhận an toàn).
3. **Quản lý Bộ đề thi**:
   - Nhấn vào biểu tượng cây bút (✏️) trên thẻ đề thi để mở **Trình biên tập đề thi**, cho phép chỉnh sửa nội dung câu hỏi, thêm/bớt phương án trả lời và cập nhật lời giải thích.
   - Nhấn vào biểu tượng 3 chấm (`⋯`) trên thẻ đề thi để đổi tên bộ đề, chuyển sang dự án khác, đặt lại tiến độ hoặc xóa bộ đề.
4. **Chọn nhiều bộ đề**: Bấm nút **"Chọn nhiều"** trên thanh công cụ chính để tích chọn hàng loạt đề thi và thực hiện chuyển dự án hoặc xóa nhanh chóng.
5. **Công tắc Xáo trộn Bất biến**: Bấm nút **"🔀 Xáo trộn"** trên thanh công cụ để bật/tắt xáo trộn thứ tự câu hỏi và vị trí các phương án A/B/C/D. Tính năng xáo trộn này hoàn toàn không làm sai lệch hay mất lịch sử làm bài trước đó của bạn.
6. **Thẻ đề thi hoàn thành**: Những bộ đề đạt độ thành thục cao sẽ được viền hiệu ứng chuyển màu rực rỡ kèm huy hiệu hoàn thành nổi bật.


## CHƯƠNG 5: PHÍM TẮT BÀN PHÍM

Hệ thống phím tắt giúp bạn thao tác nhanh chóng và thuận tiện khi học trên máy tính:

| Chế độ | Phím tắt | Thao tác |
| :--- | :--- | :--- |
| **Luyện tập & Thi thử** | `A`, `B`, `C`, `D` (hoặc `1`, `2`, `3`, `4`) | Chọn phương án tương ứng |
| **Luyện tập & Thi thử** | `Enter (↵)` | Chuyển sang câu tiếp theo / Nộp bài |
| **Thi thử** | `Mũi tên Trái / Phải (← →)` | Di chuyển qua lại giữa các câu hỏi |
| **Thẻ ghi nhớ** | `Phím Cách (Spacebar ␣)` | Lật mặt trước / mặt sau của thẻ |
| **Thẻ ghi nhớ** | `Mũi tên Trái (←)` | Quay lại thẻ phía trước |
| **Thẻ ghi nhớ** | `Phím V` (hoặc `1`) | Đánh dấu thẻ **Đã thuộc bài** |
| **Thẻ ghi nhớ** | `Phím X` (hoặc `2`) | Đánh dấu thẻ **Chưa thuộc** |
| **Tất cả các chế độ** | `Phím Esc` | Thoát chế độ học và quay về màn hình chính |


## CHƯƠNG PHỤ: XUẤT ĐỀ, SAO LƯU DỮ LIỆU & TIỆN ÍCH THÚ VỊ

1. **Xuất Đề thi & Chia sẻ**:
   - **Xuất gói Zip Bundle**: Tải về tệp `.zip` chứa đề thi (.rtf), đáp án (.rtf) và tệp dữ liệu `quiz_bundle.json`. Bạn có thể gửi file này cho bạn bè nạp lại trực tiếp vào Quýtz Web trên máy của họ.
   - **Xuất tệp Word (.docx)**: Xuất toàn bộ câu hỏi và đáp án ra file Word với định dạng ngay ngắn, sẵn sàng để in ấn ra giấy làm bài.

2. **Sao lưu & Khôi phục Dữ liệu**:
   - Mở **Cài đặt (⚙️)**, chọn **"Sao lưu Dữ liệu"** để tải về tệp JSON chứa toàn bộ các dự án, bộ đề và tiến độ học tập hiện tại.
   - Khi chuyển sang máy tính khác hoặc đổi trình duyệt, bạn chỉ cần chọn **"Khôi phục Dữ liệu"** và nạp lại tệp JSON này để tiếp tục học tập mà không bị gián đoạn.

3. **Những Chi tiết Thú vị (Easter Eggs)**:
   - **Lời chào theo buổi trong ngày**: Chạm hoặc bấm vào huy hiệu lời chào ở đầu màn hình chính để đổi ngẫu nhiên các câu chúc vui vẻ, dí dỏm và tạo động lực học tập.
   - **Thông điệp từ tác giả**: Nhấp đúp chuột hoặc chạm 2 lần vào tên tác giả trong màn hình Cài đặt để khám phá lời nhắn gửi nhỏ.
   - **Giai điệu tự hào**: Nhấp đúp vào dòng chữ bản quyền `Made in Vietnam` ở chân trang để mở điều bất ngờ.
