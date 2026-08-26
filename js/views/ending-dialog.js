/**
 * QuizMaster Web - Ending Dialog View Component
 */
import { i18n } from "../localization/i18n.js";
import { formatMarkdownHTML } from "../components/reading-pane.js";
import { calculateQuizScore } from "../models/types.js";
import { renderSF } from "../components/icons.js";

export function renderEndingModal(quiz, progress, onRedoWrong, onReviewAnswers, onBackDashboard) {
  const scoreRes = calculateQuizScore(quiz, progress);
  const totalQ = quiz.questions.length;
  const isPerfect = scoreRes.percentage === 100;
  const starCount = scoreRes.percentage >= 85 ? 3 : (scoreRes.percentage >= 60 ? 2 : (scoreRes.percentage >= 30 ? 1 : 0));

  const starsHtml = "⭐".repeat(starCount) + "☆".repeat(3 - starCount);

  return `
    <div class="modal-overlay open" id="ending-modal-overlay">
      <div class="modal-container" style="max-width: 540px; width: 100%;">
        <div class="modal-header" style="text-align: center; justify-content: center;">
          <h2 style="font-size: var(--text-xl); font-weight: 800; color: var(--text-primary);">
            ${i18n.t("quizFinishedTitle")}
          </h2>
        </div>

        <div class="modal-body" style="text-align: center;">
          <div style="margin-bottom: 12px; color: ${isPerfect ? 'var(--color-sunset-orange)' : 'var(--color-ocean-blue)'};">
            ${renderSF(isPerfect ? "trophy" : "target", { size: "54px" })}
          </div>

          <div style="font-size: 32px; letter-spacing: 4px; margin-bottom: 16px;">
            ${starsHtml}
          </div>

          ${scoreRes.isTHPT ? `
            <div style="font-size: var(--text-3xl); font-weight: 900; color: var(--color-emerald-mint);">
              ${scoreRes.scoreOutOf10} <span style="font-size: var(--text-lg); color: var(--text-secondary); font-weight: 600;">/ 10.0 đ</span>
            </div>
            <div style="font-size: var(--text-sm); font-weight: 700; color: var(--color-ocean-blue); margin-top: 4px;">
              Mức độ hoàn thành: ${scoreRes.percentage}% (${scoreRes.correctCount} / ${totalQ} câu hoàn thành)
            </div>
          ` : `
            <div style="font-size: var(--text-3xl); font-weight: 800; color: var(--color-emerald-mint);">
              ${scoreRes.percentage}%
            </div>
            <div style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); margin-top: 4px;">
              ${i18n.t("masteryLevel")}: ${scoreRes.correctCount} / ${totalQ} câu đúng
            </div>
          `}

          <!-- THPT Breakdown -->
          ${scoreRes.isTHPT ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 20px 0 12px;">
              <div class="glass-card" style="padding: 10px 6px; text-align: center; border-color: rgba(31, 122, 232, 0.3);">
                <div style="font-size: 11px; font-weight: 800; color: var(--color-ocean-blue);">PHẦN I</div>
                <div style="font-size: var(--text-md); font-weight: 800; margin-top: 2px;">${scoreRes.parts.part1.earned}đ</div>
                <div style="font-size: 10px; color: var(--text-secondary);">${scoreRes.parts.part1.correctCount}/${scoreRes.parts.part1.count} câu</div>
              </div>
              <div class="glass-card" style="padding: 10px 6px; text-align: center; border-color: rgba(122, 92, 204, 0.3);">
                <div style="font-size: 11px; font-weight: 800; color: var(--color-deep-purple);">PHẦN II</div>
                <div style="font-size: var(--text-md); font-weight: 800; margin-top: 2px;">${scoreRes.parts.part2.earned}đ</div>
                <div style="font-size: 10px; color: var(--text-secondary);">${scoreRes.parts.part2.correctCount}/${scoreRes.parts.part2.count} câu</div>
              </div>
              <div class="glass-card" style="padding: 10px 6px; text-align: center; border-color: rgba(245, 158, 11, 0.3);">
                <div style="font-size: 11px; font-weight: 800; color: var(--color-sunset-orange);">PHẦN III</div>
                <div style="font-size: var(--text-md); font-weight: 800; margin-top: 2px;">${scoreRes.parts.part3.earned}đ</div>
                <div style="font-size: 10px; color: var(--text-secondary);">${scoreRes.parts.part3.correctCount}/${scoreRes.parts.part3.count} câu</div>
              </div>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0 12px;">
              <div class="glass-card" style="padding: 12px; text-align: center; border-color: rgba(46, 158, 102, 0.3);">
                <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-emerald-mint);">${scoreRes.correctCount}</div>
                <div style="font-size: var(--text-xs); color: var(--text-secondary);">Câu làm Đúng</div>
              </div>
              <div class="glass-card" style="padding: 12px; text-align: center; border-color: rgba(214, 71, 82, 0.3);">
                <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-coral-red);">${scoreRes.wrongCount}</div>
                <div style="font-size: var(--text-xs); color: var(--text-secondary);">Câu làm Sai / Chưa xong</div>
              </div>
            </div>
          `}
        </div>

        <div class="modal-footer" style="flex-direction: column; gap: 10px;">
          ${scoreRes.wrongCount > 0 ? `
            <button class="btn btn-primary btn-orange" id="btn-redo-wrong" style="width: 100%;">
              ${renderSF("arrow.counterclockwise", { size: "15px" })} ${i18n.t("btnRedoWrongOnly")} (${scoreRes.wrongCount} câu)
            </button>
          ` : ''}

          <button class="btn btn-primary" id="btn-review-answers" style="width: 100%;">
            ${renderSF("book.closed", { size: "15px" })} ${i18n.t("btnReviewWithAnswers")}
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

export function renderNationalAnthemModal() {
  return `
    <div class="modal-overlay open" id="national-anthem-modal-overlay" style="z-index: 1200;">
      <div class="modal-container" style="max-width: 540px; width: 100%; max-height: 90vh; max-height: 90dvh; display: flex; flex-direction: column; text-align: center;">
        <div class="modal-header" style="justify-content: center; position: relative;">
          <div style="font-size: 22px; margin-right: 6px;">🇻🇳</div>
          <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--color-coral-red);">
            TIẾN QUÂN CA
          </h2>
          <button class="btn btn-ghost btn-icon-only" id="btn-close-anthem" style="position: absolute; right: 12px; top: 10px;">
            ${renderSF("xmark", { size: "14px" })}
          </button>
        </div>

        <div class="modal-body" style="padding: 20px; overflow-y: auto;">
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); margin-bottom: 16px;">
            Quốc ca Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam<br>
            <span style="color: var(--color-ocean-blue);">Tác giả: Nhạc sĩ Văn Cao</span>
          </div>

          <div class="glass-card" style="padding: 18px; line-height: 1.8; font-size: var(--text-sm); color: var(--text-primary); text-align: center; background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%); border-color: rgba(239, 68, 68, 0.3);">
            <div style="font-weight: 700; margin-bottom: 12px; color: var(--color-coral-red);">— LỜI 1 —</div>
            <p style="margin: 0 0 12px; font-style: italic;">
              Đoàn quân Việt Nam đi chung lòng cứu quốc,<br>
              Bước chân dồn vang trên đường gập ghềnh xa.<br>
              Cờ in máu chiến thắng mang hồn nước,<br>
              Súng ngoài xa chen khúc quân hành ca.<br>
              Đường vinh quang xây xác quân thù,<br>
              Thắng gian lao cùng nhau lập chiến khu.<br>
              Vì nhân dân chiến đấu không ngừng,<br>
              Tiến mau ra sa trường,<br>
              Tiến lên, cùng tiến lên.<br>
              Nước non Việt Nam ta vững bền.
            </p>

            <div style="font-weight: 700; margin: 16px 0 12px; color: var(--color-coral-red);">— LỜI 2 —</div>
            <p style="margin: 0; font-style: italic;">
              Đoàn quân Việt Nam đi sao vàng phấp phới,<br>
              Dắt giống nòi quê hương qua nơi lầm than.<br>
              Cùng chung sức phấn đấu xây đời mới,<br>
              Đứng đều lên gông xích ta đập tan.<br>
              Từ bao lâu xưa chuốt căm hờn,<br>
              Vốn hy sinh đời ta tươi thắm hơn.<br>
              Vì nhân dân chiến đấu không ngừng,<br>
              Tiến mau ra sa trường,<br>
              Tiến lên, cùng tiến lên.<br>
              Nước non Việt Nam ta vững bền!
            </p>
          </div>

          <div style="margin-top: 14px; font-size: 11px; color: var(--text-muted);">
            ⭐ Tự hào Tổ quốc Việt Nam • Quýtz Web Edition 🇻🇳
          </div>
        </div>

        <div class="modal-footer" style="justify-content: center;">
          <button class="btn btn-primary btn-rainbow" id="btn-done-anthem" style="min-width: 140px;">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindNationalAnthemEvents(onClose) {
  const closeBtn = document.getElementById("btn-close-anthem");
  if (closeBtn) closeBtn.onclick = () => onClose();

  const doneBtn = document.getElementById("btn-done-anthem");
  if (doneBtn) doneBtn.onclick = () => onClose();
}

