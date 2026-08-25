/**
 * QuizMaster Web - Exam Mode View Component
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { keyboard } from "../components/keyboard.js";
import { renderReadingPassagePane, bindReadingPaneEvents, formatMarkdownHTML } from "../components/reading-pane.js";
import { renderSF } from "../components/icons.js";

export function renderExamView(project, quiz, examState) {
  const qList = examState.activeQuestions || [];
  const currentIdx = examState.currentIndex || 0;
  const currentQ = qList[currentIdx];
  const totalQ = qList.length;

  if (!currentQ) {
    return `<div class="study-view-shell"><div style="margin: auto; font-size: 24px;">Đang tải đề thi...</div></div>`;
  }

  const isPart2 = currentQ.part === "part2" || currentQ.questionType === "trueFalseGroup";
  const isPart3 = currentQ.part === "part3" || currentQ.questionType === "shortAnswer";
  const isPart1 = !isPart2 && !isPart3;

  const userAns = examState.userSelectedOptionIds[currentQ.id];
  const answeredCount = Object.keys(examState.userSelectedOptionIds).filter(qId => {
    const a = examState.userSelectedOptionIds[qId];
    if (a === null || a === undefined) return false;
    if (typeof a === "object") return Object.keys(a).length > 0;
    if (typeof a === "string") return a.trim().length > 0;
    return true;
  }).length;

  const progressRatio = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;
  const hasReading = !!(currentQ.readingPassage && currentQ.readingPassage.trim());

  const remainingSeconds = examState.timeRemainingSeconds;
  const isUnlimited = remainingSeconds === null || remainingSeconds === undefined;
  const minutes = isUnlimited ? 0 : Math.floor(remainingSeconds / 60);
  const seconds = isUnlimited ? 0 : remainingSeconds % 60;
  const isTimeWarning = !isUnlimited && remainingSeconds <= 300;

  // Part Title Header
  let partBadgeText = "Trắc nghiệm";
  let partBadgeColor = "badge-blue";
  if (isPart2) {
    partBadgeText = "PHẦN II • Đúng / Sai (4 ý)";
    partBadgeColor = "badge-purple";
  } else if (isPart3) {
    partBadgeText = "PHẦN III • Trả lời ngắn";
    partBadgeColor = "badge-orange";
  } else if (currentQ.part === "part1" || quiz.quizType === "thptQuocGia") {
    partBadgeText = "PHẦN I • Nhiều lựa chọn (1 trong 4)";
    partBadgeColor = "badge-blue";
  }

  return `
    <div class="study-view-shell" id="exam-view-shell">
      <!-- Top Header -->
      <div class="study-header">
        <button class="btn btn-ghost" id="btn-quit-exam" title="${i18n.t("quitQuiz")}">
          ${renderSF("arrow.left", { size: "16px" })} <span class="btn-text-hide-mobile">${i18n.t("quitQuiz")}</span>
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
            ${renderSF("clock", { size: "14px" })}
            <span>${isUnlimited ? 'Không giới hạn' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}</span>
          </div>

          <button class="btn btn-pill ${storage.settings.isShuffleEnabled ? 'active' : 'btn-secondary'}" id="btn-exam-shuffle" title="${i18n.t("toggleShuffle")}">
            ${renderSF("arrow.triangle.2.circlepath", { size: "14px" })}
            <span class="btn-text-hide-mobile">${i18n.t("toggleShuffle")}</span>
          </button>
          <button class="btn btn-pill ${examState.showNavPane ? 'active' : 'btn-secondary'}" id="btn-toggle-exam-nav" title="${i18n.t("questionNavPane")}">
            ${renderSF("list.bullet", { size: "14px" })}
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
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge ${partBadgeColor}">${partBadgeText}</span>
                <span class="badge badge-gray">Câu ${currentIdx + 1} / ${totalQ}</span>
              </div>
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

          <!-- QUESTION TYPE 1: MULTIPLE CHOICE (PHẦN I) -->
          ${isPart1 ? `
            <div class="options-grid">
              ${currentQ.options.map((opt, optIdx) => {
                const isSelected = userAns === opt.id || userAns === optIdx;
                return `
                  <button class="option-btn ${isSelected ? 'exam-selected' : ''}" data-opt-id="${opt.id}" data-opt-idx="${optIdx}">
                    <div class="option-label-circle">${opt.label}</div>
                    <div class="option-btn-text">${formatMarkdownHTML(opt.text)}</div>
                    ${isSelected ? `<span style="font-size: 16px; color: var(--color-sunset-orange);">${renderSF("checkmark.circle", { size: "18px" })}</span>` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}

          <!-- QUESTION TYPE 2: TRUE / FALSE GROUP (PHẦN II) -->
          ${isPart2 ? `
            <div class="thpt-subitems-container">
              <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); margin-bottom: 2px;">
                ${i18n.t("thptSubItemPrompt")}
              </div>
              ${(currentQ.subItems || []).map((sub, sIdx) => {
                const subChoices = (typeof userAns === "object" && userAns !== null) ? userAns : {};
                const choice = subChoices[sub.id];

                return `
                  <div class="thpt-subitem-row">
                    <div class="thpt-subitem-text">
                      <strong>${sub.label || String.fromCharCode(97 + sIdx)})</strong> ${formatMarkdownHTML(sub.text)}
                    </div>
                    <div class="thpt-tf-toggle-group">
                      <button class="thpt-tf-btn ${choice === true ? 'is-selected' : ''}" data-sub-id="${sub.id}" data-tf-val="true">
                        ${i18n.t("thptTrue")}
                      </button>
                      <button class="thpt-tf-btn ${choice === false ? 'is-selected' : ''}" data-sub-id="${sub.id}" data-tf-val="false">
                        ${i18n.t("thptFalse")}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <!-- QUESTION TYPE 3: SHORT ANSWER (PHẦN III) -->
          ${isPart3 ? `
            <div class="thpt-short-answer-box">
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">
                ${i18n.t("thptShortAnswerPrompt")}
              </label>
              <div class="thpt-input-row">
                <input type="text" class="thpt-short-input" id="exam-short-input" placeholder="${i18n.t("thptShortAnswerPlaceholder")}" value="${escapeHtml(typeof userAns === 'string' ? userAns : '')}">
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Question Navigator Sidebar (Right on desktop / Bottom Sheet on mobile) -->
        ${examState.showNavPane ? `
          <aside class="question-nav-pane">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); letter-spacing: 0.05em;">
                ${i18n.t("questionNavPane")}
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-exam-nav" style="width: 24px; height: 24px;">
                ${renderSF("xmark", { size: "12px" })}
              </button>
            </div>
            ${renderExamNavSections(project, qList, currentIdx, examState)}
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
            ${renderSF("arrow.left", { size: "14px" })} <span class="btn-text-hide-mobile">${i18n.t("prevQuestion")}</span>
          </button>
          <button class="btn btn-secondary" id="btn-exam-next" ${currentIdx + 1 >= totalQ ? 'disabled' : ''}>
            <span class="btn-text-hide-mobile">${i18n.t("nextQuestion")}</span> ${renderSF("arrow.right", { size: "14px" })}
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

  // Multiple Choice Options (Part I)
  document.querySelectorAll(".option-btn").forEach(btn => {
    btn.onclick = () => {
      const optId = btn.dataset.optId;
      const optIdx = parseInt(btn.dataset.optIdx, 10);
      handlers.onSelectOption(optId, optIdx);
    };
  });

  // True / False Toggle buttons (Part II)
  document.querySelectorAll(".thpt-tf-btn").forEach(btn => {
    btn.onclick = () => {
      const currentQ = examState.activeQuestions[examState.currentIndex];
      const subId = btn.dataset.subId;
      const val = btn.dataset.tfVal === "true";

      const currentAnswers = (typeof examState.userSelectedOptionIds[currentQ.id] === "object" && examState.userSelectedOptionIds[currentQ.id] !== null)
        ? { ...examState.userSelectedOptionIds[currentQ.id] }
        : {};

      currentAnswers[subId] = val;
      handlers.onSelectPart2Answers(currentQ.id, currentAnswers);
    };
  });

  // Short Answer Input (Part III)
  const shortInput = document.getElementById("exam-short-input");
  if (shortInput) {
    shortInput.oninput = (e) => {
      const currentQ = examState.activeQuestions[examState.currentIndex];
      handlers.onSelectPart3Answer(currentQ.id, e.target.value);
    };
    shortInput.onchange = (e) => {
      const currentQ = examState.activeQuestions[examState.currentIndex];
      handlers.onSelectPart3Answer(currentQ.id, e.target.value.trim());
    };
  }

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
      const answeredCount = Object.keys(examState.userSelectedOptionIds).filter(qId => {
        const a = examState.userSelectedOptionIds[qId];
        if (a === null || a === undefined) return false;
        if (typeof a === "object") return Object.keys(a).length > 0;
        if (typeof a === "string") return a.trim().length > 0;
        return true;
      }).length;

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

  // Nav item jump - DO NOT auto-minimize nav pane
  document.querySelectorAll(".nav-item-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.navIdx, 10);
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

    if (document.activeElement && document.activeElement.tagName === "INPUT") return;

    if (e.key === "ArrowLeft") {
      handlers.onPrev();
      return;
    }

    if (e.key === "ArrowRight") {
      handlers.onNext();
      return;
    }

    const currentQ = examState.activeQuestions[examState.currentIndex];
    if (currentQ && (currentQ.part === "part1" || currentQ.questionType === "multipleChoice") && currentQ.options) {
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

function renderExamNavSections(project, qList, currentIdx, examState) {
  const isTHPT = project?.projectType === "thptQuocGia";
  const isLL = project?.projectType === "languageLearning";

  const renderButton = (q, idx) => {
    const isCur = idx === currentIdx;
    const chosen = examState.userSelectedOptionIds[q.id];
    let hasAns = false;
    if (chosen !== null && chosen !== undefined) {
      if (typeof chosen === "object") hasAns = Object.keys(chosen).length > 0;
      else if (typeof chosen === "string") hasAns = chosen.trim().length > 0;
      else hasAns = true;
    }

    let navClass = "";
    if (isCur) navClass = "current";
    else if (hasAns) navClass = "answered-exam";

    return `
      <button class="nav-item-btn ${navClass}" data-nav-idx="${idx}">
        ${idx + 1}
      </button>
    `;
  };

  if (isTHPT) {
    const p1 = [];
    const p2 = [];
    const p3 = [];

    qList.forEach((q, idx) => {
      const part = q.part || (q.questionType === "trueFalseGroup" ? "part2" : (q.questionType === "shortAnswer" ? "part3" : "part1"));
      if (part === "part2") p2.push({ q, idx });
      else if (part === "part3") p3.push({ q, idx });
      else p1.push({ q, idx });
    });

    let html = "";
    if (p1.length > 0) {
      html += `
        <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 8px 0 6px 0;">
          Phần I: Trắc nghiệm (${p1.length} câu)
        </div>
        <div class="nav-grid">${p1.map(item => renderButton(item.q, item.idx)).join('')}</div>
      `;
    }
    if (p2.length > 0) {
      html += `
        <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 12px 0 6px 0;">
          Phần II: Đúng / Sai (${p2.length} câu)
        </div>
        <div class="nav-grid">${p2.map(item => renderButton(item.q, item.idx)).join('')}</div>
      `;
    }
    if (p3.length > 0) {
      html += `
        <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 12px 0 6px 0;">
          Phần III: Trả lời ngắn (${p3.length} câu)
        </div>
        <div class="nav-grid">${p3.map(item => renderButton(item.q, item.idx)).join('')}</div>
      `;
    }
    return html;
  }

  if (isLL) {
    const groups = {};
    qList.forEach((q, idx) => {
      const gName = q.skill || (q.readingPassage ? "Đọc hiểu (Reading)" : "Trắc nghiệm từ vựng & ngữ pháp");
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push({ q, idx });
    });

    const gKeys = Object.keys(groups);
    if (gKeys.length > 1) {
      return gKeys.map(k => `
        <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 10px 0 6px 0;">
          ${escapeHtml(k)} (${groups[k].length} câu)
        </div>
        <div class="nav-grid">${groups[k].map(item => renderButton(item.q, item.idx)).join('')}</div>
      `).join('');
    }
  }

  return `<div class="nav-grid">${qList.map((q, idx) => renderButton(q, idx)).join('')}</div>`;
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

