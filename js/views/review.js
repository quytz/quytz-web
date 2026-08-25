/**
 * QuizMaster Web - Answer Review Modal Component
 */
import { i18n } from "../localization/i18n.js";
import { formatMarkdownHTML } from "../components/reading-pane.js";
import { scoreQuestion, calculateQuizScore } from "../models/types.js";
import { renderSF } from "../components/icons.js";

export function renderReviewModal(quiz, progress, filterMode = "all") {
  const isWrongFilter = filterMode === "wrong";
  const overallScore = calculateQuizScore(quiz, progress);

  const displayedQuestions = quiz.questions.filter(q => {
    const userAns = progress?.userSelectedOptionIds?.[q.id] ?? progress?.userAnswers?.[q.id];
    const scoreRes = scoreQuestion(q, userAns);
    if (isWrongFilter) {
      return !scoreRes.isFullyCorrect;
    }
    return true;
  });

  return `
    <div class="modal-overlay open" id="review-modal-overlay">
      <div class="modal-container" style="max-width: 820px; width: 100%; height: 85vh;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${renderSF("book.closed", { size: "22px" })}
            <div>
              <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
                ${i18n.t("reviewTitle")}
              </h2>
              <div style="font-size: var(--text-xs); color: var(--text-secondary);">
                ${overallScore.isTHPT ? `Điểm số THPT QG: <strong style="color: var(--color-emerald-mint);">${overallScore.scoreOutOf10} / 10.0 đ</strong> (${overallScore.percentage}%)` : `Kết quả: <strong style="color: var(--color-emerald-mint);">${overallScore.percentage}%</strong> (${overallScore.correctCount}/${quiz.questions.length} câu đúng)`}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="segmented-control">
              <button class="segment-btn ${!isWrongFilter ? 'active' : ''}" id="btn-review-filter-all">
                ${i18n.t("filterAll")} (${quiz.questions.length})
              </button>
              <button class="segment-btn ${isWrongFilter ? 'active' : ''}" id="btn-review-filter-wrong">
                ${i18n.t("filterWrong")} (${overallScore.wrongCount})
              </button>
            </div>

            <button class="btn btn-ghost btn-icon-only" id="btn-close-review">
              ${renderSF("xmark", { size: "14px" })}
            </button>
          </div>
        </div>

        <div class="modal-body">
          ${displayedQuestions.length === 0 ? `
            <div style="text-align: center; padding: 48px; color: var(--text-secondary);">
              <div style="margin-bottom: 8px; color: var(--color-emerald-mint);">${renderSF("trophy", { size: "48px" })}</div>
              <div style="font-size: var(--text-md); font-weight: 700;">Không có câu hỏi làm sai nào!</div>
            </div>
          ` : displayedQuestions.map((q, idx) => {
            const userAns = progress?.userSelectedOptionIds?.[q.id] ?? progress?.userAnswers?.[q.id];
            const scoreRes = scoreQuestion(q, userAns);
            const isPart2 = q.part === "part2" || q.questionType === "trueFalseGroup";
            const isPart3 = q.part === "part3" || q.questionType === "shortAnswer";
            const isPart1 = !isPart2 && !isPart3;

            return `
              <div class="glass-card" style="margin-bottom: 16px; border-left: 4px solid ${scoreRes.isFullyCorrect ? 'var(--color-emerald-mint)' : (scoreRes.earnedPoints > 0 ? 'var(--color-sunset-orange)' : 'var(--color-coral-red)')};">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="badge ${scoreRes.isFullyCorrect ? 'badge-green' : (scoreRes.earnedPoints > 0 ? 'badge-orange' : 'badge-red')}">
                      ${scoreRes.isFullyCorrect ? renderSF("checkmark", { size: "11px" }) + ' Đúng' : (scoreRes.earnedPoints > 0 ? renderSF("checkmark", { size: "11px" }) + ' Một phần' : renderSF("xmark", { size: "11px" }) + ' Sai')} • Câu ${idx + 1}
                    </span>
                    <span class="badge badge-gray">+${scoreRes.earnedPoints} / ${scoreRes.maxPoints} đ</span>
                  </div>
                  ${q.skill ? `<span class="badge badge-purple">${q.skill}</span>` : ''}
                </div>

                <div style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                  ${formatMarkdownHTML(q.text)}
                </div>

                <!-- PART 1: Multiple Choice Review -->
                ${isPart1 ? (() => {
                  const correctOpt = q.options[q.correctAnswerIndex] || q.options[0];
                  const userOpt = q.options.find(o => o.id === userAns) || (typeof userAns === "number" ? q.options[userAns] : null);

                  return `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                      <div style="padding: 10px; border-radius: var(--radius-sm); background: ${scoreRes.isFullyCorrect ? 'rgba(46, 158, 102, 0.1)' : 'rgba(214, 71, 82, 0.1)'}; border: 1px solid ${scoreRes.isFullyCorrect ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">
                        <div style="font-size: var(--text-xs); font-weight: 700; color: ${scoreRes.isFullyCorrect ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">${i18n.t("yourChoice")}</div>
                        <div style="font-size: var(--text-sm); font-weight: 600; margin-top: 4px;">
                          ${userOpt ? `${userOpt.label}. ${formatMarkdownHTML(userOpt.text)}` : 'Chưa chọn đáp án'}
                        </div>
                      </div>

                      <div style="padding: 10px; border-radius: var(--radius-sm); background: rgba(46, 158, 102, 0.1); border: 1px solid var(--color-emerald-mint);">
                        <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-emerald-mint);">${i18n.t("correctChoice")}</div>
                        <div style="font-size: var(--text-sm); font-weight: 600; margin-top: 4px;">
                          ${correctOpt.label}. ${formatMarkdownHTML(correctOpt.text)}
                        </div>
                      </div>
                    </div>
                  `;
                })() : ''}

                <!-- PART 2: True/False Sub-items Review -->
                ${isPart2 ? (() => {
                  const subChoices = (typeof userAns === "object" && userAns !== null) ? userAns : {};
                  return `
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                      ${(q.subItems || []).map((sub, sIdx) => {
                        const userChoice = subChoices[sub.id];
                        const isSubMatch = userChoice !== undefined && Boolean(userChoice) === Boolean(sub.isCorrect);

                        return `
                          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: ${isSubMatch ? 'rgba(46, 158, 102, 0.08)' : 'rgba(214, 71, 82, 0.08)'}; border: 1px solid ${isSubMatch ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'}; border-radius: var(--radius-sm); font-size: var(--text-sm);">
                            <div style="flex: 1;">
                              <strong>${sub.label || String.fromCharCode(97 + sIdx)})</strong> ${formatMarkdownHTML(sub.text)}
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center; font-size: var(--text-xs); font-weight: 700;">
                              <span>Bạn chọn: <strong style="color: ${isSubMatch ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">${userChoice === true ? 'Đúng' : (userChoice === false ? 'Sai' : 'Chưa chọn')}</strong></span>
                              <span>•</span>
                              <span style="color: var(--color-emerald-mint);">Đáp án: <strong>${sub.isCorrect ? 'Đúng' : 'Sai'}</strong></span>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  `;
                })() : ''}

                <!-- PART 3: Short Answer Review -->
                ${isPart3 ? `
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div style="padding: 10px; border-radius: var(--radius-sm); background: ${scoreRes.isFullyCorrect ? 'rgba(46, 158, 102, 0.1)' : 'rgba(214, 71, 82, 0.1)'}; border: 1px solid ${scoreRes.isFullyCorrect ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">
                      <div style="font-size: var(--text-xs); font-weight: 700; color: ${scoreRes.isFullyCorrect ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">${i18n.t("yourChoice")}</div>
                      <div style="font-size: var(--text-sm); font-weight: 700; margin-top: 4px;">
                        ${typeof userAns === 'string' && userAns ? formatMarkdownHTML(userAns) : 'Chưa điền đáp án'}
                      </div>
                    </div>

                    <div style="padding: 10px; border-radius: var(--radius-sm); background: rgba(46, 158, 102, 0.1); border: 1px solid var(--color-emerald-mint);">
                      <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-emerald-mint);">${i18n.t("correctChoice")}</div>
                      <div style="font-size: var(--text-sm); font-weight: 700; margin-top: 4px;">
                        ${formatMarkdownHTML(q.shortAnswer || (q.acceptedAnswers || []).join(" / "))}
                      </div>
                    </div>
                  </div>
                ` : ''}

                ${q.explanation ? `
                  <div style="padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-secondary); font-size: var(--text-sm); line-height: 1.5;">
                    <strong style="color: var(--color-ocean-blue);">${renderSF("lightbulb", { size: "14px" })} Giải thích chi tiết:</strong><br>
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

