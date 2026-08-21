/**
 * QuizMaster Web - 3D Flashcard Mode View
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { keyboard } from "../components/keyboard.js";
import { formatMarkdownHTML } from "../components/reading-pane.js";
import { CEFR_LEVELS } from "../models/types.js";

export function renderFlashcardView(project, quiz, cardState) {
  const isLL = (quiz.quizType === "languageLearning" || project.projectType === "languageLearning") && quiz.vocabularies && quiz.vocabularies.length > 0;
  const isCompleted = cardState.isCompleted;

  if (isCompleted) {
    return renderCompletionScreen(project, quiz, cardState, isLL);
  }

  const currentItem = isLL ? cardState.currentVocab : cardState.currentCard;
  const remainingCount = isLL ? (cardState.vocabQueue.length + (cardState.currentVocab ? 1 : 0)) : (cardState.cardQueue.length + (cardState.currentCard ? 1 : 0));
  const isFlipped = cardState.isFlipped;

  return `
    <div class="study-view-shell" id="flashcard-view-shell">
      <!-- Top Header -->
      <div class="study-header">
        <button class="btn btn-ghost" id="btn-quit-flashcard" title="${i18n.t("quitQuiz")}">
          <span>←</span> <span class="btn-text-hide-mobile">${i18n.t("quitQuiz")}</span>
        </button>

        <div class="study-header-center">
          <div class="study-header-title">
            ${escapeHtml(quiz.title)} • <span style="color: var(--color-deep-purple);">${isLL ? 'Thẻ từ vựng CEFR' : i18n.t("flashcardMode")}</span>
          </div>
          <div class="study-header-counter">
            Vòng ${cardState.studyRound} • Còn lại ${remainingCount} thẻ
          </div>
        </div>

        <div class="study-header-actions">
          ${isLL ? `
            <select class="form-select" id="select-cefr-filter">
              ${Object.values(CEFR_LEVELS).map(lvl => `
                <option value="${lvl.id}" ${cardState.cefrFilter === lvl.id ? 'selected' : ''}>${lvl.badge}</option>
              `).join('')}
            </select>
          ` : ''}

          <button class="btn btn-pill ${cardState.showNavPane ? 'active' : 'btn-secondary'}" id="btn-toggle-nav-pane" title="Danh sách thẻ">
            <span>☰</span> <span>Danh sách thẻ</span>
          </button>
        </div>
      </div>

      <!-- Main Flashcard Stage -->
      <div class="study-body-split">
        <div class="flashcard-stage">
          ${currentItem ? `
            <div class="flashcard-3d-box ${isFlipped ? 'flipped' : ''}" id="flashcard-3d-box">
              <!-- FRONT FACE -->
              <div class="flashcard-face face-front">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="badge ${isLL ? 'badge-purple' : 'badge-blue'}">
                    ${isLL ? (currentItem.wordType || 'Từ vựng') : i18n.t("questionSide")}
                  </span>
                  ${isLL && currentItem.cefrLevel ? `
                    <span class="badge badge-teal">CEFR ${currentItem.cefrLevel}</span>
                  ` : ''}
                </div>

                ${isLL ? `
                  <div style="margin: auto 0; text-align: center;">
                    <div class="flashcard-vocab-word">${escapeHtml(currentItem.word)}</div>
                    ${currentItem.phonetic ? `<div class="flashcard-vocab-ipa">${escapeHtml(currentItem.phonetic)}</div>` : ''}
                  </div>
                ` : `
                  <div class="flashcard-main-text">
                    ${formatMarkdownHTML(currentItem.text)}
                  </div>
                `}

                <div style="text-align: center; font-size: var(--text-xs); color: var(--text-secondary);">
                  💡 Nhấn phím Cách (Spacebar) hoặc chạm để lật thẻ
                </div>
              </div>

              <!-- BACK FACE -->
              <div class="flashcard-face face-back">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="badge badge-green">
                    ${isLL ? 'Nghĩa & ví dụ' : i18n.t("answerSide")}
                  </span>
                  ${isLL && currentItem.cefrLevel ? `
                    <span class="badge badge-teal">CEFR ${currentItem.cefrLevel}</span>
                  ` : ''}
                </div>

                ${isLL ? `
                  <div style="margin: auto 0; text-align: center;">
                    <div class="flashcard-vocab-meaning">${escapeHtml(currentItem.vietnameseMeaning)}</div>
                    ${currentItem.exampleSentence ? `
                      <div class="flashcard-example-sentence">
                        "${formatMarkdownHTML(currentItem.exampleSentence)}"
                      </div>
                    ` : ''}
                  </div>
                ` : `
                  <div style="margin: auto 0; width: 100%;">
                    <div style="font-size: var(--text-sm); font-weight: 800; color: var(--color-emerald-mint); margin-bottom: 8px;">
                      Đáp án đúng: ${currentItem.options[currentItem.correctAnswerIndex]?.label || 'A'}
                    </div>
                    <div class="flashcard-answer-text">
                      ${formatMarkdownHTML(currentItem.options[currentItem.correctAnswerIndex]?.text || '')}
                    </div>
                    ${currentItem.explanation ? `
                      <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); line-height: 1.55;">
                        <strong style="color: var(--color-ocean-blue);">Giải thích:</strong>
                        ${formatMarkdownHTML(currentItem.explanation)}
                      </div>
                    ` : ''}
                  </div>
                `}

                <div style="text-align: center; font-size: var(--text-xs); color: var(--text-secondary);">
                  💡 Chọn Đã thuộc (1) hoặc Chưa thuộc (2)
                </div>
              </div>
            </div>

            <!-- Action Buttons Bar -->
            <div class="flashcard-actions-bar">
              <button class="btn btn-secondary" id="btn-card-prev" ${(isLL ? cardState.vocabHistory.length === 0 : cardState.historyStack.length === 0) ? 'disabled' : ''}>
                <span>←</span> ${i18n.t("prevCard")}
              </button>

              <button class="btn btn-primary btn-green" id="btn-card-correct">
                Đã thuộc bài (1)
              </button>

              <button class="btn btn-primary btn-red" id="btn-card-wrong">
                Chưa thuộc (2)
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Right Card Navigator -->
        ${cardState.showNavPane ? `
          <aside class="question-nav-pane">
            <div style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); letter-spacing: 0.05em;">
              ${isLL ? 'Danh sách từ vựng' : 'Danh sách thẻ'}
            </div>
            <div class="nav-grid">
              ${(isLL ? cardState.allVocabs : cardState.allQuestions).map((item, idx) => {
                const isCur = isLL ? cardState.currentVocab?.id === item.id : cardState.currentCard?.id === item.id;
                const isMastered = cardState.masteredIds.has(item.id);
                const isNeedRev = cardState.needReviewIds.has(item.id);

                let navClass = "";
                if (isCur) navClass = "current";
                else if (isMastered) navClass = "answered-correct";
                else if (isNeedRev) navClass = "answered-wrong";

                return `
                  <button class="nav-item-btn ${navClass}" data-card-idx="${idx}">
                    ${idx + 1}
                  </button>
                `;
              }).join('')}
            </div>
          </aside>
        ` : ''}
      </div>

      <!-- Footer Bar -->
      <footer class="study-footer">
        <div class="shortcuts-hint">
          <span>Phím tắt:</span>
          <span class="kbd-tag">Spacebar</span> <span>Lật thẻ</span>
          <span>•</span>
          <span class="kbd-tag">1</span> hoặc <span class="kbd-tag">V</span> <span>Đã thuộc</span>
          <span>•</span>
          <span class="kbd-tag">2</span> hoặc <span class="kbd-tag">X</span> <span>Chưa thuộc</span>
          <span>•</span>
          <span class="kbd-tag">←</span> <span>Thẻ trước</span>
        </div>
      </footer>
    </div>
  `;
}

function renderCompletionScreen(project, quiz, cardState, isLL) {
  const totalCount = isLL ? cardState.allVocabs.length : cardState.allQuestions.length;
  const masteredCount = cardState.masteredIds.size;
  const wrongCount = cardState.needReviewIds.size;
  const is100Percent = wrongCount === 0;

  return `
    <div class="study-view-shell" id="flashcard-view-shell">
      <div class="study-header">
        <button class="btn btn-ghost" id="btn-quit-flashcard">
          <span>←</span> ${i18n.t("quitQuiz")}
        </button>
      </div>

      <div style="margin: auto; max-width: 500px; padding: 24px;">
        <div class="glass-card" style="text-align: center; padding: 36px 28px;">
          <div style="font-size: 54px; margin-bottom: 12px;">
            ${is100Percent ? '🏆' : '🎉'}
          </div>

          <div style="font-size: var(--text-2xl); font-weight: 800; color: var(--text-primary);">
            ${i18n.t("roundCompleted")}
          </div>

          <p style="margin: 12px 0 24px; color: var(--text-secondary); line-height: 1.5;">
            ${is100Percent
              ? `Chúc mừng! Bạn đã ghi nhớ xuất sắc 100% (${totalCount}/${totalCount} thẻ) trong bộ đề thi!`
              : `Kết thúc Vòng ${cardState.studyRound}: Thuộc ${masteredCount}/${totalCount} thẻ. Còn lại ${wrongCount} thẻ chưa thuộc.`
            }
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${!is100Percent ? `
              <button class="btn btn-primary btn-orange" id="btn-continue-round" style="width: 100%;">
                Tiếp tục học Vòng ${cardState.studyRound + 1} (${wrongCount} thẻ chưa thuộc)
              </button>
            ` : ''}

            <button class="btn btn-primary" id="btn-study-again" style="width: 100%;">
              ${i18n.t("studyAgain")}
            </button>

            <button class="btn btn-secondary" id="btn-finish-dashboard" style="width: 100%;">
              ${i18n.t("backToDashboard")}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindFlashcardEvents(project, quiz, cardState, handlers) {
  // Quit
  const quitBtn = document.getElementById("btn-quit-flashcard");
  if (quitBtn) quitBtn.onclick = () => handlers.onQuit();

  const finishBtn = document.getElementById("btn-finish-dashboard");
  if (finishBtn) finishBtn.onclick = () => handlers.onQuit();

  // 3D Card Tap Flip
  const cardBox = document.getElementById("flashcard-3d-box");
  if (cardBox) {
    cardBox.onclick = () => {
      cardBox.classList.toggle("flipped");
      cardState.isFlipped = cardBox.classList.contains("flipped");
      if (handlers.onFlip) handlers.onFlip(cardState.isFlipped);
    };
  }

  // Prev / Wrong / Correct
  const prevBtn = document.getElementById("btn-card-prev");
  if (prevBtn) prevBtn.onclick = () => handlers.onPrev();

  const wrongBtn = document.getElementById("btn-card-wrong");
  if (wrongBtn) wrongBtn.onclick = () => handlers.onMark(false);

  const correctBtn = document.getElementById("btn-card-correct");
  if (correctBtn) correctBtn.onclick = () => handlers.onMark(true);

  // CEFR Filter
  const cefrSelect = document.getElementById("select-cefr-filter");
  if (cefrSelect) {
    cefrSelect.onchange = (e) => handlers.onChangeCEFR(e.target.value);
  }

  // Toggle Nav
  const navToggle = document.getElementById("btn-toggle-nav-pane");
  if (navToggle) {
    navToggle.onclick = () => {
      cardState.showNavPane = !cardState.showNavPane;
      handlers.onUpdateView();
    };
  }

  // Jump
  document.querySelectorAll(".nav-item-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.cardIdx, 10);
      handlers.onJump(idx);
    };
  });

  // Completion screen buttons
  const continueBtn = document.getElementById("btn-continue-round");
  if (continueBtn) continueBtn.onclick = () => handlers.onContinueNextRound();

  const againBtn = document.getElementById("btn-study-again");
  if (againBtn) againBtn.onclick = () => handlers.onStudyAgain();

  // Keyboard shortcuts
  keyboard.setHandler((e) => {
    if (e.key === "Escape") {
      handlers.onQuit();
      return;
    }

    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (cardBox) {
        cardBox.classList.toggle("flipped");
        cardState.isFlipped = cardBox.classList.contains("flipped");
        if (handlers.onFlip) handlers.onFlip(cardState.isFlipped);
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      handlers.onPrev();
      e.preventDefault();
      return;
    }

    const key = e.key.toLowerCase();
    if (key === "1" || key === "v") {
      handlers.onMark(true);
      e.preventDefault();
      return;
    }

    if (key === "2" || key === "x") {
      handlers.onMark(false);
      e.preventDefault();
      return;
    }
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
