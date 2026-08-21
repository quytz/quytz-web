/**
 * QuizMaster Web - Ask Gemini AI Tutor Modal
 */
import { i18n } from "../localization/i18n.js";
import { formatMarkdownHTML } from "../components/reading-pane.js";

export function renderAskGeminiModal(question, askState) {
  const isQuerying = askState.isQuerying;
  const errorMsg = askState.errorMessage;
  const aiText = askState.aiResponseText || question.explanation || "";

  return `
    <div class="modal-overlay open" id="ask-gemini-modal-overlay">
      <div class="modal-container" style="max-width: 760px; width: 100%; height: 85vh;">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 22px; color: var(--color-ocean-blue);">✨</span>
            <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
              Hỏi Gemini AI về Câu hỏi này
            </h2>
          </div>

          <button class="btn btn-ghost btn-icon-only" id="btn-close-ask-gemini">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Rate Limit Warning Banner -->
          <div style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: var(--radius-md); background: rgba(224, 117, 51, 0.12); border: 1px solid rgba(224, 117, 51, 0.35);">
            <span style="font-size: 18px; color: var(--color-sunset-orange);">⚠️</span>
            <div>
              <div style="font-size: var(--text-xs); font-weight: 800; color: var(--color-sunset-orange);">
                CẢNH BÁO GIỚI HẠN API (API RATE LIMIT):
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                Chỉ nên đặt câu hỏi trực tiếp cho AI đối với những câu thực sự quan trọng hoặc phức tạp để tránh quá tải hạn ngạch sử dụng Google AI Studio API Key của bạn.
              </div>
            </div>
          </div>

          <!-- Question Preview Card -->
          <div class="glass-card">
            <span class="badge badge-blue" style="margin-bottom: 8px;">Câu hỏi đang xem</span>
            <div style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
              ${formatMarkdownHTML(question.text)}
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${question.options.map(opt => {
                const isCorrect = opt.id === question.options[question.correctAnswerIndex]?.id;
                return `
                  <div style="font-size: var(--text-xs); color: ${isCorrect ? 'var(--color-emerald-mint)' : 'var(--text-secondary)'}; font-weight: ${isCorrect ? '700' : '400'};">
                    ${opt.label}. ${escapeHtml(opt.text)} ${isCorrect ? '✓ (Đáp án đúng)' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Quick Presets -->
          <div>
            <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">
              Gợi ý thắc mắc nhanh:
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-pill btn-secondary preset-chip" data-query="Hãy giải thích chi tiết vì sao đáp án đúng là chính xác.">
                Giải thích tại sao đáp án đúng
              </button>
              <button class="btn btn-pill btn-secondary preset-chip" data-query="Hãy phân tích chi tiết vì sao từng phương án còn lại là sai.">
                Phân tích các đáp án sai
              </button>
              <button class="btn btn-pill btn-secondary preset-chip" data-query="Hãy cho thêm ví dụ minh họa thực tế để hiểu rõ câu hỏi này.">
                Thêm ví dụ minh họa
              </button>
            </div>
          </div>

          <!-- Custom Query Input -->
          <div class="glass-card">
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              Thắc mắc cụ thể của bạn (Tùy chọn):
            </label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <input type="text" class="form-input" id="ask-user-query-input" placeholder="Ví dụ: Tại sao phương án B lại sai trong trường hợp này?..." value="${escapeHtml(askState.userQuery || '')}" style="flex: 1; min-width: 200px;">
              <button class="btn btn-primary" id="btn-send-gemini-query" ${isQuerying ? 'disabled' : ''}>
                Gửi tới Gemini
              </button>
            </div>
          </div>

          <!-- Loading State -->
          ${isQuerying ? `
            <div style="text-align: center; padding: 24px;">
              <div style="font-size: 28px; animation: pulse 1s infinite; margin-bottom: 8px;">✨</div>
              <div style="font-size: var(--text-sm); font-weight: 700; color: var(--color-ocean-blue);">
                Gemini AI đang phân tích và soạn câu trả lời chi tiết...
              </div>
            </div>
          ` : ''}

          <!-- Error Alert -->
          ${errorMsg ? `
            <div style="padding: 12px; border-radius: var(--radius-sm); background: rgba(214, 71, 82, 0.12); border: 1px solid var(--color-coral-red); color: var(--color-coral-red); font-size: var(--text-xs); font-weight: 600;">
              ✕ Lỗi: ${escapeHtml(errorMsg)}
            </div>
          ` : ''}

          <!-- AI Response Card -->
          ${aiText && !isQuerying ? `
            <div class="glass-card" style="border-left: 4px solid var(--color-ocean-blue);">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <span style="color: var(--color-ocean-blue);">✨</span>
                <span style="font-size: var(--text-sm); font-weight: 800; color: var(--color-ocean-blue);">
                  Giải thích Chi tiết từ Gemini AI:
                </span>
              </div>
              <div style="font-size: var(--text-sm); line-height: 1.6; color: var(--text-primary);">
                ${formatMarkdownHTML(aiText)}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-done-ask-gemini">
            ${i18n.t("close")}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindAskGeminiEvents(askState, handlers) {
  const closeBtn = document.getElementById("btn-close-ask-gemini");
  if (closeBtn) closeBtn.onclick = () => handlers.onClose();

  const doneBtn = document.getElementById("btn-done-ask-gemini");
  if (doneBtn) doneBtn.onclick = () => handlers.onClose();

  const queryInput = document.getElementById("ask-user-query-input");
  if (queryInput) {
    queryInput.oninput = (e) => { askState.userQuery = e.target.value; };
    queryInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        handlers.onSendQuery();
      }
    };
  }

  const sendBtn = document.getElementById("btn-send-gemini-query");
  if (sendBtn) sendBtn.onclick = () => handlers.onSendQuery();

  document.querySelectorAll(".preset-chip").forEach(chip => {
    chip.onclick = () => {
      askState.userQuery = chip.dataset.query;
      handlers.onSendQuery();
    };
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
