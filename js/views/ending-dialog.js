/**
 * QuizMaster Web - Ending Dialog View Component
 */
import { i18n } from "../localization/i18n.js";
import { formatMarkdownHTML } from "../components/reading-pane.js";

export function renderEndingModal(quiz, progress, onRedoWrong, onReviewAnswers, onBackDashboard) {
  const totalQ = quiz.questions.length;
  let correctCount = 0;
  let wrongCount = 0;

  quiz.questions.forEach(q => {
    const userOptId = progress.userSelectedOptionIds ? progress.userSelectedOptionIds[q.id] : null;
    const correctOptId = q.options[q.correctAnswerIndex]?.id;
    if (userOptId && userOptId === correctOptId) {
      correctCount++;
    } else if (userOptId) {
      wrongCount++;
    }
  });

  const percent = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const isPerfect = percent === 100;
  const starCount = percent >= 85 ? 3 : (percent >= 60 ? 2 : (percent >= 30 ? 1 : 0));

  const starsHtml = "⭐".repeat(starCount) + "☆".repeat(3 - starCount);

  return `
    <div class="modal-overlay open" id="ending-modal-overlay">
      <div class="modal-container" style="max-width: 520px; width: 100%;">
        <div class="modal-header" style="text-align: center; justify-content: center;">
          <h2 style="font-size: var(--text-xl); font-weight: 800; color: var(--text-primary);">
            ${i18n.t("quizFinishedTitle")}
          </h2>
        </div>

        <div class="modal-body" style="text-align: center;">
          <div style="font-size: 54px; margin-bottom: 12px;">
            ${isPerfect ? '🏆' : '🎯'}
          </div>

          <div style="font-size: 32px; letter-spacing: 4px; margin-bottom: 16px;">
            ${starsHtml}
          </div>

          <div style="font-size: var(--text-3xl); font-weight: 800; color: var(--color-emerald-mint);">
            ${percent}%
          </div>
          <div style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); margin-top: 4px;">
            ${i18n.t("masteryLevel")}: ${correctCount} / ${totalQ} câu đúng
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0 12px;">
            <div class="glass-card" style="padding: 12px; text-align: center; border-color: rgba(46, 158, 102, 0.3);">
              <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-emerald-mint);">${correctCount}</div>
              <div style="font-size: var(--text-xs); color: var(--text-secondary);">Câu làm Đúng</div>
            </div>
            <div class="glass-card" style="padding: 12px; text-align: center; border-color: rgba(214, 71, 82, 0.3);">
              <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-coral-red);">${wrongCount}</div>
              <div style="font-size: var(--text-xs); color: var(--text-secondary);">Câu làm Sai</div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="flex-direction: column; gap: 10px;">
          ${wrongCount > 0 ? `
            <button class="btn btn-primary btn-orange" id="btn-redo-wrong" style="width: 100%;">
              ${i18n.t("btnRedoWrongOnly")} (${wrongCount} câu)
            </button>
          ` : ''}

          <button class="btn btn-primary" id="btn-review-answers" style="width: 100%;">
            ${i18n.t("btnReviewWithAnswers")}
          </button>

          <button class="btn btn-secondary" id="btn-ending-dashboard" style="width: 100%;">
            ${i18n.t("backToDashboard")}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindEndingModalEvents(onRedoWrong, onReviewAnswers, onBackDashboard) {
  const redoBtn = document.getElementById("btn-redo-wrong");
  if (redoBtn) redoBtn.onclick = () => onRedoWrong();

  const reviewBtn = document.getElementById("btn-review-answers");
  if (reviewBtn) reviewBtn.onclick = () => onReviewAnswers();

  const backBtn = document.getElementById("btn-ending-dashboard");
  if (backBtn) backBtn.onclick = () => onBackDashboard();
}
