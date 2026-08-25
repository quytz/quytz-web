/**
 * QuizMaster Web - User Feedback & Bug Report Modal View
 */
import { i18n } from "../localization/i18n.js";
import { logger } from "../services/logger.js";
import { renderSF } from "../components/icons.js";

export const FEEDBACK_SECTIONS = [
  {
    id: "bug",
    title: "Báo lỗi hệ thống",
    icon: "ladybug",
    description: "Báo cáo sự cố hoặc tính năng hoạt động không đúng kỳ vọng",
    placeholder: "Mô tả chi tiết lỗi bạn gặp phải: Đã bấm nút gì, màn hình nào, có thông báo lỗi gì xuất hiện...",
    subCategories: [
      "Nhập tài liệu & Quét tệp",
      "Tạo câu hỏi bằng AI",
      "Luyện tập & Thi thử",
      "Thẻ ghi nhớ 3D",
      "Giao diện & Hiển thị",
      "Lưu trữ & Dữ liệu",
      "Lỗi khác"
    ],
    defaultIncludeLogs: true
  },
  {
    id: "feature",
    title: "Đề xuất tính năng mới",
    icon: "sparkles",
    description: "Chia sẻ ý tưởng hoặc tính năng bạn muốn QuizMaster có thêm",
    placeholder: "Mô tả ý tưởng hoặc tính năng mới bạn mong muốn: Tính năng này giúp bạn học tập hoặc tạo đề thi thế nào...",
    subCategories: [
      "Chế độ học & Luyện thi",
      "Tính năng AI & Tạo câu hỏi",
      "Nhập / Xuất định dạng tệp",
      "Phím tắt & Tiện ích thao tác",
      "Gợi ý tính năng khác"
    ],
    defaultIncludeLogs: false
  },
  {
    id: "content",
    title: "Góp ý nội dung câu hỏi & Lời giải",
    icon: "doc.text",
    description: "Phản ánh câu hỏi bị sai đáp án hoặc lời giải AI chưa chuẩn",
    placeholder: "Nhập nội dung câu hỏi hoặc phần giải thích bạn thấy chưa chuẩn xác kèm góp ý sửa đổi...",
    subCategories: [
      "Đáp án chưa chính xác",
      "Lời giải thích AI chưa rõ ràng",
      "Định dạng đề thi THPT",
      "Từ vựng tiếng Anh theo CEFR",
      "Góp ý nội dung khác"
    ],
    defaultIncludeLogs: false
  },
  {
    id: "general",
    title: "Góp ý chung & Trải nghiệm",
    icon: "bubble.left.and.bubble.right",
    description: "Đóng góp cảm nhận, khen ngợi hoặc phản hồi trải nghiệm sử dụng",
    placeholder: "Chia sẻ cảm nhận, lời khuyên hoặc trải nghiệm của bạn khi sử dụng QuizMaster Web...",
    subCategories: [
      "Trải nghiệm người dùng",
      "Góp ý thiết kế giao diện",
      "Khen ngợi & Động viên tác giả",
      "Ý kiến đóng góp khác"
    ],
    defaultIncludeLogs: false
  }
];

export function renderFeedbackModal(feedbackState) {
  const selectedSectionId = feedbackState.selectedSectionId || "bug";
  const currentSection = FEEDBACK_SECTIONS.find(s => s.id === selectedSectionId) || FEEDBACK_SECTIONS[0];
  const includeLogs = feedbackState.includeLogs !== undefined ? feedbackState.includeLogs : currentSection.defaultIncludeLogs;
  const isSending = feedbackState.isSending || false;
  const subCategory = feedbackState.subCategory || currentSection.subCategories[0];
  const diagnosticsPreview = logger.getFormattedDiagnostics();

  return `
    <div class="modal-overlay open" id="feedback-modal-overlay">
      <div class="modal-container" style="max-width: min(680px, 94vw); width: 100%; max-height: 90vh; max-height: 90dvh; display: flex; flex-direction: column;">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${renderSF("bubble.left.and.bubble.right", { size: "20px", extraClass: "text-blue" })}
            <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
              Gửi Phản Hồi & Báo Lỗi
            </h2>
          </div>

          <button class="btn btn-ghost btn-icon-only" id="btn-close-feedback" title="Đóng">
            ${renderSF("xmark", { size: "14px" })}
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1; padding: var(--space-4);">
          <!-- Category Section Tabs -->
          <div>
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              Chuyên mục phản hồi:
            </label>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px;">
              ${FEEDBACK_SECTIONS.map(sec => {
                const isActive = sec.id === selectedSectionId;
                return `
                  <button type="button" class="btn ${isActive ? 'btn-primary' : 'btn-secondary'}" data-feedback-section="${sec.id}" style="padding: 8px 10px; font-size: var(--text-xs); display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; border-radius: var(--radius-md); font-weight: ${isActive ? '700' : '500'};">
                    ${renderSF(sec.icon, { size: "14px" })}
                    <span>${sec.title}</span>
                  </button>
                `;
              }).join("")}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">
              ${currentSection.description}
            </div>
          </div>

          <!-- Sub-category selector -->
          <div class="glass-card" style="padding: 10px 14px;">
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              Phân loại chi tiết:
            </label>
            <select class="form-input" id="feedback-subcategory" style="width: 100%; font-size: var(--text-sm);">
              ${currentSection.subCategories.map(sub => `
                <option value="${escapeHtml(sub)}" ${sub === subCategory ? 'selected' : ''}>${escapeHtml(sub)}</option>
              `).join("")}
            </select>
          </div>

          <!-- Title / Subject -->
          <div>
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
              Tiêu đề ngắn gọn: <span style="color: var(--color-coral-red);">*</span>
            </label>
            <input type="text" class="form-input" id="feedback-title" placeholder="Tóm tắt vấn đề hoặc nội dung cần gửi..." value="${escapeHtml(feedbackState.title || '')}" maxlength="150" style="width: 100%; box-sizing: border-box;">
          </div>

          <!-- Message Details -->
          <div>
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
              Nội dung chi tiết: <span style="color: var(--color-coral-red);">*</span>
            </label>
            <textarea class="form-input" id="feedback-message" rows="4" placeholder="${escapeHtml(currentSection.placeholder)}" style="width: 100%; box-sizing: border-box; resize: vertical; min-height: 90px; line-height: 1.5; font-family: var(--font-family-system);">${escapeHtml(feedbackState.message || '')}</textarea>
          </div>

          <!-- Contact (Optional) -->
          <div>
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
              Thông tin liên hệ (Email hoặc Tên / Nickname - Không bắt buộc):
            </label>
            <input type="text" class="form-input" id="feedback-contact" placeholder="Nhập email hoặc tên nếu bạn muốn nhận phản hồi..." value="${escapeHtml(feedbackState.contact || '')}" maxlength="100" style="width: 100%; box-sizing: border-box;">
          </div>

          <!-- Diagnostic Logs Checkbox -->
          <div class="glass-card" style="padding: 10px 14px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
              <input type="checkbox" id="feedback-include-logs" ${includeLogs ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--color-ocean-blue); cursor: pointer;">
              <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary);">
                Đính kèm nhật ký chẩn đoán & thông tin hệ thống (Logs)
              </span>
            </label>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; margin-left: 24px; line-height: 1.4;">
              Giúp tác giả nhanh chóng khoanh vùng nguyên nhân lỗi. Cam kết bảo mật: API Key và thông tin cá nhân đều được tự động ẩn đi hoàn toàn.
            </div>

            <!-- Inspect logs preview -->
            <details style="margin-top: 8px; margin-left: 24px;">
              <summary style="font-size: 11px; color: var(--color-ocean-blue); font-weight: 600; cursor: pointer;">
                Xem trước nội dung Nhật ký (Logs) gửi đi
              </summary>
              <pre style="margin-top: 6px; padding: 8px; font-family: var(--font-family-mono); font-size: 11px; background: var(--bg-window); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); max-height: 160px; overflow: auto; white-space: pre-wrap; word-break: break-all; color: var(--text-secondary);">${escapeHtml(diagnosticsPreview)}</pre>
            </details>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn btn-secondary" id="btn-cancel-feedback" ${isSending ? 'disabled' : ''}>
            Hủy
          </button>
          <button class="btn btn-primary" id="btn-submit-feedback" ${isSending ? 'disabled' : ''} style="min-width: 130px;">
            ${isSending ? `
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                ${renderSF("arrow.triangle.2.circlepath", { size: "14px", extraClass: "spin" })}
                Đang gửi...
              </span>
            ` : `
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                ${renderSF("paperplane", { size: "14px" })}
                Gửi Phản Hồi
              </span>
            `}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindFeedbackModalEvents(feedbackState, handlers) {
  const closeBtn = document.getElementById("btn-close-feedback");
  if (closeBtn) closeBtn.onclick = () => handlers.onClose();

  const cancelBtn = document.getElementById("btn-cancel-feedback");
  if (cancelBtn) cancelBtn.onclick = () => handlers.onClose();

  // Category switch
  document.querySelectorAll("[data-feedback-section]").forEach(btn => {
    btn.onclick = () => {
      const secId = btn.dataset.feedbackSection;
      feedbackState.selectedSectionId = secId;
      const targetSec = FEEDBACK_SECTIONS.find(s => s.id === secId);
      if (targetSec) {
        feedbackState.subCategory = targetSec.subCategories[0];
        feedbackState.includeLogs = targetSec.defaultIncludeLogs;
      }
      handlers.onUpdateView();
    };
  });

  // Inputs
  const subCategoryEl = document.getElementById("feedback-subcategory");
  if (subCategoryEl) {
    subCategoryEl.onchange = (e) => {
      feedbackState.subCategory = e.target.value;
    };
  }

  const titleEl = document.getElementById("feedback-title");
  if (titleEl) {
    titleEl.oninput = (e) => {
      feedbackState.title = e.target.value;
    };
  }

  const messageEl = document.getElementById("feedback-message");
  if (messageEl) {
    messageEl.oninput = (e) => {
      feedbackState.message = e.target.value;
    };
  }

  const contactEl = document.getElementById("feedback-contact");
  if (contactEl) {
    contactEl.oninput = (e) => {
      feedbackState.contact = e.target.value;
    };
  }

  const includeLogsEl = document.getElementById("feedback-include-logs");
  if (includeLogsEl) {
    includeLogsEl.onchange = (e) => {
      feedbackState.includeLogs = e.target.checked;
    };
  }

  // Submit
  const submitBtn = document.getElementById("btn-submit-feedback");
  if (submitBtn) {
    submitBtn.onclick = () => {
      const title = (feedbackState.title || "").trim();
      const message = (feedbackState.message || "").trim();

      if (!title) {
        alert("Vui lòng nhập tiêu đề phản hồi.");
        titleEl?.focus();
        return;
      }

      if (!message) {
        alert("Vui lòng nhập nội dung chi tiết phản hồi.");
        messageEl?.focus();
        return;
      }

      handlers.onSubmit({
        sectionId: feedbackState.selectedSectionId || "bug",
        subCategory: feedbackState.subCategory || "Khác",
        title,
        message,
        contact: (feedbackState.contact || "").trim(),
        includeLogs: feedbackState.includeLogs !== undefined ? feedbackState.includeLogs : true
      });
    };
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
