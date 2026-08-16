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
    return `<div class="study-view-shell"><div style="margin: auto; font-size: 24px;">Đang chuẩn bị đề thi...</div></div>`;
  }

  const userChosenOptId = examState.userSelectedOptionIds[currentQ.id];
  const progressRatio = totalQ > 0 ? (Object.keys(examState.userSelectedOptionIds).length / totalQ) * 100 : 0;
  const hasReading = !!(currentQ.readingPassage && currentQ.readingPassage.trim());

  // Format timer
  const minutes = Math.floor(examState.timeRemainingSeconds / 60);
  const seconds = examState.timeRemainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTimeWarning = examState.timeRemainingSeconds <= 300;

  return `
    <div class="study-view-shell" id="exam-view-shell">
      <!-- Top Header -->
      <div class="study-header">
        <button class="btn btn-ghost" id="btn-quit-exam">
          <span>←</span> ${i18n.t("quitQuiz")}
        </button>

        <div style="text-align: center;">
          <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary); max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(quiz.title)} • <span style="color: var(--color-sunset-orange);">${i18n.t("examMode")}</span>
          </div>
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-sunset-orange); margin-top: 2px;">
            ${i18n.t("progressFormat", currentIdx + 1, totalQ)}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <!-- Timer Display -->
          <div class="timer-widget ${isTimeWarning ? 'warning' : ''}" id="timer-display-box" title="Thời gian làm bài còn lại">
            <span>⏱️</span>
            <span>${timeFormatted}</span>
          </div>

          <button class="btn btn-pill ${storage.settings.isShuffleEnabled ? 'active' : 'btn-secondary'}" id="btn-exam-shuffle">
            <span>${storage.settings.isShuffleEnabled ? '🔀' : '🔁'}</span>
            <span>${i18n.t("toggleShuffle")}</span>
          </button>

          <button class="btn btn-pill ${examState.showNavPane ? 'active' : 'btn-secondary'}" id="btn-toggle-nav-pane">
            <span>☰</span> ${i18n.t("questionNavPane")}
          </button>
        </div>
      </div>

      <!-- Linear Progress Bar -->
      <div class="progress-bar-container" style="border-radius: 0; height: 4px;">
        <div class="progress-bar-fill" style="width: ${progressRatio}%; --progress-color: var(--color-sunset-orange);"></div>
      </div>

      <!-- Main Body Split -->
      <div class="study-body-split">
        <!-- Reading Passage Pane (Left) -->
        ${hasReading ? renderReadingPassagePane(currentQ.readingPassage, examState.readingState, () => {}) : ''}

        <!-- Main Question & Options Area (Center) -->
        <div class="study-main-area">
          <div class="question-box">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
              <span class="badge badge-orange">${i18n.t("questionHeader")} ${currentIdx + 1}</span>
            </div>

            ${currentQ.skill || currentQ.subTopic ? `
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                ${currentQ.skill ? `<span style="font-size: var(--text-xs); font-weight: 700; color: var(--color-deep-purple); text-transform: uppercase;">📖 ${currentQ.skill}</span>` : ''}
                ${currentQ.subTopic ? `<span style="font-size: var(--text-xs); font-weight: 700; color: var(--color-cyan-teal); text-transform: uppercase;">🏷️ ${currentQ.subTopic}</span>` : ''}
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

        <!-- Question Navigator Sidebar (Right) -->
        ${examState.showNavPane ? `
          <aside class="question-nav-pane">
            <div style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); letter-spacing: 0.05em;">
              ${i18n.t("questionNavPane")}
            </div>
            <div class="nav-grid">
              ${qList.map((q, idx) => {
                const isCur = idx === currentIdx;
                const chosenId = examState.userSelectedOptionIds[q.id];
                const isAns = !!chosenId;

                let navClass = "";
                if (isCur) navClass = "current";
                else if (isAns) navClass = "answered-exam";

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
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-secondary" id="btn-exam-prev" ${currentIdx === 0 ? 'disabled' : ''}>
            <span>←</span> Câu trước
          </button>
          <button class="btn btn-secondary" id="btn-exam-next" ${currentIdx + 1 >= totalQ ? 'disabled' : ''}>
            Câu sau <span>→</span>
          </button>
        </div>

        <div class="shortcuts-hint">
          <span>Phím tắt:</span>
          <span class="kbd-tag">A</span> <span class="kbd-tag">B</span> <span class="kbd-tag">C</span> <span class="kbd-tag">D</span>
          <span>hoặc</span>
          <span class="kbd-tag">1</span> <span class="kbd-tag">2</span> <span class="kbd-tag">3</span> <span class="kbd-tag">4</span>
          <span>•</span>
          <span class="kbd-tag">←</span> <span class="kbd-tag">→</span> <span>Chuyển câu</span>
        </div>

        <div>
          <button class="btn btn-primary btn-orange" id="btn-submit-exam">
            Nộp bài thi (${Object.keys(examState.userSelectedOptionIds).length}/${totalQ} câu) ✓
          </button>
        </div>
      </footer>
    </div>
  `;
}

export function bindExamEvents(project, quiz, examState, handlers) {
  // Quit button
  const quitBtn = document.getElementById("btn-quit-exam");
  if (quitBtn) quitBtn.onclick = () => handlers.onQuit();

  // Prev / Next
  const prevBtn = document.getElementById("btn-exam-prev");
  if (prevBtn) prevBtn.onclick = () => handlers.onPrev();

  const nextBtn = document.getElementById("btn-exam-next");
  if (nextBtn) nextBtn.onclick = () => handlers.onNext();

  // Submit Exam
  const submitBtn = document.getElementById("btn-submit-exam");
  if (submitBtn) submitBtn.onclick = () => handlers.onSubmit();

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
  const navToggle = document.getElementById("btn-toggle-nav-pane");
  if (navToggle) {
    navToggle.onclick = () => {
      examState.showNavPane = !examState.showNavPane;
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

  // Nav item jump
  document.querySelectorAll(".nav-item-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.navIdx, 10);
      handlers.onJumpQuestion(idx);
    };
  });

  // Reading Pane events
  bindReadingPaneEvents(examState.readingState, () => {
    handlers.onUpdateView();
  });

  // Keyboard shortcuts
  keyboard.setHandler((e) => {
    if (e.key === "Escape") {
      handlers.onQuit();
      return;
    }

    if (e.key === "ArrowLeft") {
      handlers.onPrev();
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowRight") {
      handlers.onNext();
      e.preventDefault();
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
