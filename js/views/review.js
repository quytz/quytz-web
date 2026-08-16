/**
 * QuizMaster Web - Answer Review Modal Component
 */
import { i18n } from "../localization/i18n.js";
import { formatMarkdownHTML } from "../components/reading-pane.js";

export function renderReviewModal(quiz, progress, filterMode = "all") {
  const isWrongFilter = filterMode === "wrong";
  
  const displayedQuestions = quiz.questions.filter(q => {
    const userOptId = progress.userSelectedOptionIds ? progress.userSelectedOptionIds[q.id] : null;
    const correctOptId = q.options[q.correctAnswerIndex]?.id;
    const isCorrect = userOptId === correctOptId;
    if (isWrongFilter) {
      return !isCorrect;
    }
    return true;
  });

  return `
    <div class="modal-overlay open" id="review-modal-overlay">
      <div class="modal-container" style="max-width: 820px; width: 100%; height: 85vh;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">📖</span>
            <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
              ${i18n.t("reviewTitle")}
            </h2>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="segmented-control">
              <button class="segment-btn ${!isWrongFilter ? 'active' : ''}" id="btn-review-filter-all">
                ${i18n.t("filterAll")} (${quiz.questions.length})
              </button>
              <button class="segment-btn ${isWrongFilter ? 'active' : ''}" id="btn-review-filter-wrong">
                ${i18n.t("filterWrong")}
              </button>
            </div>

            <button class="btn btn-ghost btn-icon-only" id="btn-close-review">✕</button>
          </div>
        </div>

        <div class="modal-body">
          ${displayedQuestions.length === 0 ? `
            <div style="text-align: center; padding: 48px; color: var(--text-secondary);">
              <div style="font-size: 42px; margin-bottom: 8px;">🎉</div>
              <div style="font-size: var(--text-md); font-weight: 700;">Không có câu hỏi làm sai nào!</div>
            </div>
          ` : displayedQuestions.map((q, idx) => {
            const userOptId = progress.userSelectedOptionIds ? progress.userSelectedOptionIds[q.id] : null;
            const correctOpt = q.options[q.correctAnswerIndex] || q.options[0];
            const userOpt = q.options.find(o => o.id === userOptId);
            const isCorrect = userOptId === correctOpt.id;

            return `
              <div class="glass-card" style="margin-bottom: 16px; border-left: 4px solid ${isCorrect ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                  <span class="badge ${isCorrect ? 'badge-green' : 'badge-red'}">
                    ${isCorrect ? '✓ Đúng' : '✕ Sai'} • Câu ${idx + 1}
                  </span>
                  ${q.skill ? `<span class="badge badge-purple">${q.skill}</span>` : ''}
                </div>

                <div style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                  ${formatMarkdownHTML(q.text)}
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                  <div style="padding: 10px; border-radius: var(--radius-sm); background: ${isCorrect ? 'rgba(46, 158, 102, 0.1)' : 'rgba(214, 71, 82, 0.1)'}; border: 1px solid ${isCorrect ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">
                    <div style="font-size: var(--text-xs); font-weight: 700; color: ${isCorrect ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">${i18n.t("yourChoice")}</div>
                    <div style="font-size: var(--text-sm); font-weight: 600; margin-top: 4px;">
                      ${userOpt ? `${userOpt.label}. ${escapeHtml(userOpt.text)}` : 'Chưa chọn đáp án'}
                    </div>
                  </div>

                  <div style="padding: 10px; border-radius: var(--radius-sm); background: rgba(46, 158, 102, 0.1); border: 1px solid var(--color-emerald-mint);">
                    <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-emerald-mint);">${i18n.t("correctChoice")}</div>
                    <div style="font-size: var(--text-sm); font-weight: 600; margin-top: 4px;">
                      ${correctOpt.label}. ${escapeHtml(correctOpt.text)}
                    </div>
                  </div>
                </div>

                ${q.explanation ? `
                  <div style="padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-secondary); font-size: var(--text-sm); line-height: 1.5;">
                    <strong style="color: var(--color-ocean-blue);">💡 Giải thích chi tiết:</strong><br>
                    ${formatMarkdownHTML(q.explanation)}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" id="btn-finish-review">
            ${i18n.t("close")}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindReviewEvents(onFilterChange, onClose) {
  const filterAll = document.getElementById("btn-review-filter-all");
  if (filterAll) filterAll.onclick = () => onFilterChange("all");

  const filterWrong = document.getElementById("btn-review-filter-wrong");
  if (filterWrong) filterWrong.onclick = () => onFilterChange("wrong");

  const closeBtn = document.getElementById("btn-close-review");
  if (closeBtn) closeBtn.onclick = () => onClose();

  const finishBtn = document.getElementById("btn-finish-review");
  if (finishBtn) finishBtn.onclick = () => onClose();
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
