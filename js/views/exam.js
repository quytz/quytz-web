/**
 * QuizMaster Web - Exam Mode View Component
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { keyboard } from "../components/keyboard.js";
import { renderReadingPassagePane, bindReadingPaneEvents, formatMarkdownHTML } from "../components/reading-pane.js";

export function renderExamView(project, quiz, examState) {
  const qList = examState.activeQuestions || [];
  const currentIdx = examState.currentIndex || 0;
  const currentQ = qList[currentIdx];
  const totalQ = qList.length;

  if (!currentQ) {
    return `<div class="study-view-shell"><div style="margin: auto; font-size: 24px;">Đang tải đề thi...</div></div>`;
  }

  const userChosenOptId = examState.userSelectedOptionIds[currentQ.id];
  const answeredCount = Object.keys(examState.userSelectedOptionIds).length;
  const progressRatio = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;
  const hasReading = !!(currentQ.readingPassage && currentQ.readingPassage.trim());

  const remainingSeconds = examState.timeRemainingSeconds;
  const isUnlimited = remainingSeconds === null || remainingSeconds === undefined;
  const minutes = isUnlimited ? 0 : Math.floor(remainingSeconds / 60);
  const seconds = isUnlimited ? 0 : remainingSeconds % 60;
  const isTimeWarning = !isUnlimited && remainingSeconds <= 300; // <= 5 minutes

  return `
    <div class="study-view-shell" id="exam-view-shell">
      <!-- Top Header -->
      <div class="study-header">
        <button class="btn btn-ghost" id="btn-quit-exam" title="${i18n.t("quitQuiz")}">
          <span>←</span> <span class="btn-text-hide-mobile">${i18n.t("quitQuiz")}</span>
        </button>

        <div class="study-header-center">
          <div class="study-header-title">
            ${escapeHtml(quiz.title)}
          </div>
          <div class="study-header-counter">
            ${i18n.t("progressFormat", currentIdx + 1, totalQ)} • Đã làm ${answeredCount}/${totalQ} câu
          </div>
        </div>

        <div class="study-header-actions">
          <!-- Countdown Timer Widget -->
          <div class="timer-widget ${isTimeWarning ? 'warning' : ''}" id="timer-display-box">
            <span>${isUnlimited ? 'Không giới hạn' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}</span>
          </div>

          <button class="btn btn-pill ${storage.settings.isShuffleEnabled ? 'active' : 'btn-secondary'}" id="btn-exam-shuffle" title="${i18n.t("toggleShuffle")}">
            <span class="btn-text-hide-mobile">${i18n.t("toggleShuffle")}</span>
          </button>
          <button class="btn btn-pill ${examState.showNavPane ? 'active' : 'btn-secondary'}" id="btn-toggle-exam-nav" title="${i18n.t("questionNavPane")}">
            <span class="btn-text-hide-mobile">${i18n.t("questionNavPane")}</span>
          </button>
        </div>
      </div>

      <!-- Linear Progress Bar -->
      <div class="progress-bar-container" style="border-radius: 0; height: 3px;">
        <div class="progress-bar-fill" style="width: ${progressRatio}%; --progress-color: var(--color-sunset-orange);"></div>
      </div>

      <!-- Main Body Split -->
      <div class="study-body-split">
        <!-- Reading Passage Pane (Left) -->
        ${hasReading ? renderReadingPassagePane(currentQ.readingPassage, examState.readingState, () => {}) : ''}

        <!-- Main Question & Options Area (Center) -->
        <div class="study-main-area">
          <div class="question-box">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <span class="badge badge-orange">${i18n.t("questionHeader")} ${currentIdx + 1}</span>
            </div>

            ${currentQ.skill || currentQ.subTopic ? `
              <div style="display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
                ${currentQ.skill ? `<span style="font-size: var(--text-xs); font-weight: 700; color: var(--color-deep-purple);">${currentQ.skill}</span>` : ''}
                ${currentQ.subTopic ? `<span style="font-size: var(--text-xs); font-weight: 700; color: var(--color-cyan-teal);">${currentQ.subTopic}</span>` : ''}
              </div>
            ` : ''}

            <div class="question-text">
              ${formatMarkdownHTML(currentQ.text)}
            </div>
          </div>

          <!-- Options Grid -->
          <div class="options-grid">
            ${currentQ.options.map((opt, optIdx) => {
              const isSelected = userChosenOptId === opt.id;
              return `
                <button class="option-btn ${isSelected ? 'exam-selected' : ''}" data-opt-id="${opt.id}" data-opt-idx="${optIdx}">
                  <div class="option-label-circle">${opt.label}</div>
                  <div class="option-btn-text">${formatMarkdownHTML(opt.text)}</div>
                  ${isSelected ? `<span style="font-size: 18px; color: var(--color-sunset-orange);">●</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Question Navigator Sidebar (Right on desktop / Bottom sheet on mobile) -->
        ${examState.showNavPane ? `
          <aside class="question-nav-pane">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <div style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); letter-spacing: 0.05em;">
                ${i18n.t("questionNavPane")}
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-exam-nav" style="width: 24px; height: 24px; font-size: 12px;">✕</button>
            </div>
            <div class="nav-grid">
              ${qList.map((q, idx) => {
                const isCur = idx === currentIdx;
                const chosenId = examState.userSelectedOptionIds[q.id];
                const hasAns = !!chosenId;

                let navClass = "";
                if (isCur) navClass = "current";
                else if (hasAns) navClass = "answered-exam";

                return `
                  <button class="nav-item-btn ${navClass}" data-nav-idx="${idx}">
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
          <span>Phím:</span>
          <span class="kbd-tag">A</span> <span class="kbd-tag">B</span> <span class="kbd-tag">C</span> <span class="kbd-tag">D</span>
          <span>•</span>
          <span class="kbd-tag">←</span> <span class="kbd-tag">→</span> <span>Chuyển câu</span>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end; flex: 1; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="btn-exam-prev" ${currentIdx === 0 ? 'disabled' : ''}>
            <span>←</span> <span class="btn-text-hide-mobile">${i18n.t("prevQuestion")}</span>
          </button>
          <button class="btn btn-secondary" id="btn-exam-next" ${currentIdx + 1 >= totalQ ? 'disabled' : ''}>
            <span class="btn-text-hide-mobile">${i18n.t("nextQuestion")}</span> <span>→</span>
          </button>
          <button class="btn btn-primary btn-orange" id="btn-exam-submit">
            ${i18n.t("submitExamBtn")} (${answeredCount}/${totalQ})
          </button>
        </div>
      </footer>
    </div>
  `;
}

export function bindExamEvents(project, quiz, examState, handlers) {
  // Quit button
  const quitBtn = document.getElementById("btn-quit-exam");
  if (quitBtn) {
    quitBtn.onclick = () => {
      if (confirm(i18n.t("confirmQuitExamPrompt"))) {
        handlers.onQuit();
      }
    };
  }

  // Toggle Shuffle
  const shuffleBtn = document.getElementById("btn-exam-shuffle");
  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      storage.settings.isShuffleEnabled = !storage.settings.isShuffleEnabled;
      storage.saveSettings();
      handlers.onToggleShuffle();
    };
  }

  // Toggle Nav Pane
  const navToggle = document.getElementById("btn-toggle-exam-nav");
  if (navToggle) {
    navToggle.onclick = () => {
      examState.showNavPane = !examState.showNavPane;
      handlers.onUpdateView();
    };
  }

  const closeNavBtn = document.getElementById("btn-close-exam-nav");
  if (closeNavBtn) {
    closeNavBtn.onclick = () => {
      examState.showNavPane = false;
      handlers.onUpdateView();
    };
  }

  // Option buttons
  document.querySelectorAll(".option-btn").forEach(btn => {
    btn.onclick = () => {
      const optId = btn.dataset.optId;
      const optIdx = parseInt(btn.dataset.optIdx, 10);
      handlers.onSelectOption(optId, optIdx);
    };
  });

  // Prev / Next buttons
  const prevBtn = document.getElementById("btn-exam-prev");
  if (prevBtn) prevBtn.onclick = () => handlers.onPrev();

  const nextBtn = document.getElementById("btn-exam-next");
  if (nextBtn) nextBtn.onclick = () => handlers.onNext();

  // Submit button
  const submitBtn = document.getElementById("btn-exam-submit");
  if (submitBtn) {
    submitBtn.onclick = () => {
      const totalQ = examState.activeQuestions.length;
      const answeredCount = Object.keys(examState.userSelectedOptionIds).length;
      const unanswered = totalQ - answeredCount;
      let promptMsg = `Bạn có chắc chắn muốn nộp bài thi? Đã trả lời ${answeredCount}/${totalQ} câu.`;
      if (unanswered > 0) {
        promptMsg += ` (Còn ${unanswered} câu chưa trả lời)`;
      }
      if (confirm(promptMsg)) {
        handlers.onSubmit();
      }
    };
  }

  // Nav item jump
  document.querySelectorAll(".nav-item-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.navIdx, 10);
      examState.showNavPane = false;
      handlers.onJumpQuestion(idx);
    };
  });

  // Reading pane events
  bindReadingPaneEvents(examState.readingState, () => {
    handlers.onUpdateView();
  });

  // Keyboard shortcuts
  keyboard.setHandler((e) => {
    if (e.key === "Escape") {
      if (confirm(i18n.t("confirmQuitExamPrompt"))) {
        handlers.onQuit();
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      handlers.onPrev();
      return;
    }

    if (e.key === "ArrowRight") {
      handlers.onNext();
      return;
    }

    const currentQ = examState.activeQuestions[examState.currentIndex];
    if (currentQ && currentQ.options) {
      const key = e.key.toLowerCase();
      let selectedIdx = -1;

      if (key === "a" || key === "1") selectedIdx = 0;
      else if (key === "b" || key === "2") selectedIdx = 1;
      else if (key === "c" || key === "3") selectedIdx = 2;
      else if (key === "d" || key === "4") selectedIdx = 3;

      if (selectedIdx >= 0 && selectedIdx < currentQ.options.length) {
        const opt = currentQ.options[selectedIdx];
        handlers.onSelectOption(opt.id, selectedIdx);
        e.preventDefault();
      }
    }
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
