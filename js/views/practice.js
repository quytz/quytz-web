/**
 * QuizMaster Web - Practice Mode View
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { keyboard } from "../components/keyboard.js";
import { renderReadingPassagePane, bindReadingPaneEvents, formatMarkdownHTML } from "../components/reading-pane.js";
import { createQuizProgress, shuffleQuestionOptions } from "../models/types.js";

export function renderPracticeView(project, quiz, practiceState) {
  const qList = practiceState.activeQuestions || [];
  const currentIdx = practiceState.currentIndex || 0;
  const currentQ = qList[currentIdx];
  const totalQ = qList.length;

  if (!currentQ) {
    return `<div class="study-view-shell"><div style="margin: auto; font-size: 24px;">Đang tải bài thi...</div></div>`;
  }

  const userChosenOptId = practiceState.userSelectedOptionIds[currentQ.id];
  const isAnswered = !!userChosenOptId || practiceState.userAnswers[currentQ.id] !== undefined;
  
  const correctOptId = (currentQ.correctAnswerIndex >= 0 && currentQ.correctAnswerIndex < currentQ.options.length)
    ? currentQ.options[currentQ.correctAnswerIndex].id
    : "";
  const isCorrect = userChosenOptId === correctOptId;

  const progressRatio = totalQ > 0 ? (Object.keys(practiceState.userAnswers).length / totalQ) * 100 : 0;
  const hasReading = !!(currentQ.readingPassage && currentQ.readingPassage.trim());

  return `
    <div class="study-view-shell" id="practice-view-shell">
      <!-- Top Header -->
      <div class="study-header">
        <button class="btn btn-ghost" id="btn-quit-practice">
          <span>←</span> ${i18n.t("quitQuiz")}
        </button>

        <div style="text-align: center;">
          <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary); max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(quiz.title)}
          </div>
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-ocean-blue); margin-top: 2px;">
            ${i18n.t("progressFormat", currentIdx + 1, totalQ)}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-pill ${storage.settings.isShuffleEnabled ? 'active' : 'btn-secondary'}" id="btn-practice-shuffle">
            <span>${storage.settings.isShuffleEnabled ? '🔀' : '🔁'}</span>
            <span>${i18n.t("toggleShuffle")}</span>
          </button>
          <button class="btn btn-pill ${practiceState.showNavPane ? 'active' : 'btn-secondary'}" id="btn-toggle-nav-pane">
            <span>☰</span> ${i18n.t("questionNavPane")}
          </button>
        </div>
      </div>

      <!-- Linear Progress Bar -->
      <div class="progress-bar-container" style="border-radius: 0; height: 4px;">
        <div class="progress-bar-fill" style="width: ${progressRatio}%; --progress-color: var(--color-ocean-blue);"></div>
      </div>

      <!-- Main Body Split -->
      <div class="study-body-split">
        <!-- Reading Passage Pane (Left) -->
        ${hasReading ? renderReadingPassagePane(currentQ.readingPassage, practiceState.readingState, () => {}) : ''}

        <!-- Main Question & Options Area (Center) -->
        <div class="study-main-area">
          <div class="question-box">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
              <span class="badge badge-blue">${i18n.t("questionHeader")} ${currentIdx + 1}</span>
              <button class="btn btn-pill btn-secondary" id="btn-ask-gemini" style="color: var(--color-deep-purple); border-color: rgba(122, 92, 204, 0.3); font-size: var(--text-xs);">
                ✨ Hỏi Gemini AI về câu này
              </button>
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
              const isCorrectOpt = opt.id === correctOptId;
              let optClass = "";
              if (isAnswered) {
                if (isCorrectOpt) optClass = "is-correct";
                else if (isSelected && !isCorrectOpt) optClass = "is-wrong";
              } else if (isSelected) {
                optClass = "selected";
              }

              return `
                <button class="option-btn ${optClass}" data-opt-id="${opt.id}" data-opt-idx="${optIdx}" ${isAnswered ? 'disabled' : ''}>
                  <div class="option-label-circle">${opt.label}</div>
                  <div class="option-btn-text">${formatMarkdownHTML(opt.text)}</div>
                  ${isAnswered && isCorrectOpt ? `<span style="font-size: 20px; color: var(--color-emerald-mint);">✓</span>` : ''}
                  ${isAnswered && isSelected && !isCorrectOpt ? `<span style="font-size: 20px; color: var(--color-coral-red);">✕</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Immediate Feedback / Explanation -->
          ${isAnswered ? `
            <div class="explanation-card ${isCorrect ? 'correct' : 'wrong'}">
              <div class="explanation-header">
                <span>${isCorrect ? '✓ ' + i18n.t("correctAnswer") : '✕ ' + i18n.t("wrongAnswer")}</span>
              </div>
              ${currentQ.explanation ? `
                <div class="explanation-content">
                  <strong>Giải thích:</strong><br>
                  ${formatMarkdownHTML(currentQ.explanation)}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Question Navigator Sidebar (Right) -->
        ${practiceState.showNavPane ? `
          <aside class="question-nav-pane">
            <div style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); letter-spacing: 0.05em;">
              ${i18n.t("questionNavPane")}
            </div>
            <div class="nav-grid">
              ${qList.map((q, idx) => {
                const isCur = idx === currentIdx;
                const chosenId = practiceState.userSelectedOptionIds[q.id];
                const hasAns = !!chosenId;
                const corrId = q.options[q.correctAnswerIndex]?.id;
                const right = chosenId === corrId;

                let navClass = "";
                if (isCur) navClass = "current";
                else if (hasAns) navClass = right ? "answered-correct" : "answered-wrong";

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
          <span>Phím tắt:</span>
          <span class="kbd-tag">A</span> <span class="kbd-tag">B</span> <span class="kbd-tag">C</span> <span class="kbd-tag">D</span>
          <span>hoặc</span>
          <span class="kbd-tag">1</span> <span class="kbd-tag">2</span> <span class="kbd-tag">3</span> <span class="kbd-tag">4</span>
          <span>•</span>
          <span class="kbd-tag">Enter</span> <span>${i18n.t("nextQuestion")}</span>
          <span>•</span>
          <span class="kbd-tag">Esc</span> <span>${i18n.t("quitQuiz")}</span>
        </div>

        <div>
          ${isAnswered ? `
            <button class="btn btn-primary ${currentIdx + 1 < totalQ ? 'btn-blue' : 'btn-green'}" id="btn-practice-next">
              ${currentIdx + 1 < totalQ ? i18n.t("nextQuestion") + ' ➔' : i18n.t("finishPractice") + ' ✓'}
            </button>
          ` : ''}
        </div>
      </footer>
    </div>
  `;
}

export function bindPracticeEvents(project, quiz, practiceState, handlers) {
  // Quit button
  const quitBtn = document.getElementById("btn-quit-practice");
  if (quitBtn) quitBtn.onclick = () => handlers.onQuit();

  // Toggle Shuffle
  const shuffleBtn = document.getElementById("btn-practice-shuffle");
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
      practiceState.showNavPane = !practiceState.showNavPane;
      handlers.onUpdateView();
    };
  }

  // Option buttons
  document.querySelectorAll(".option-btn:not(:disabled)").forEach(btn => {
    btn.onclick = () => {
      const optId = btn.dataset.optId;
      const optIdx = parseInt(btn.dataset.optIdx, 10);
      handlers.onSelectOption(optId, optIdx);
    };
  });

  // Next question button
  const nextBtn = document.getElementById("btn-practice-next");
  if (nextBtn) {
    nextBtn.onclick = () => handlers.onNext();
  }

  // Ask Gemini
  const askGeminiBtn = document.getElementById("btn-ask-gemini");
  if (askGeminiBtn) {
    askGeminiBtn.onclick = () => {
      const currentQ = practiceState.activeQuestions[practiceState.currentIndex];
      handlers.onAskGemini(currentQ);
    };
  }

  // Nav item jump
  document.querySelectorAll(".nav-item-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.navIdx, 10);
      handlers.onJumpQuestion(idx);
    };
  });

  // Reading Pane events
  bindReadingPaneEvents(practiceState.readingState, () => {
    handlers.onUpdateView();
  });

  // Setup Keyboard shortcuts
  keyboard.setHandler((e) => {
    if (e.key === "Escape" || e.key === "Delete") {
      handlers.onQuit();
      return;
    }

    const currentQ = practiceState.activeQuestions[practiceState.currentIndex];
    const isAnswered = !!practiceState.userSelectedOptionIds[currentQ.id];

    if (e.key === "Enter" || e.key === " ") {
      if (isAnswered) {
        handlers.onNext();
        e.preventDefault();
        return;
      }
    }

    if (!isAnswered && currentQ && currentQ.options) {
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
