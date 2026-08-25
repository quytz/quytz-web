/**
 * QuizMaster Web - Practice Mode View
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { keyboard } from "../components/keyboard.js";
import { renderReadingPassagePane, bindReadingPaneEvents, formatMarkdownHTML } from "../components/reading-pane.js";
import { scoreQuestion, QUESTION_PARTS } from "../models/types.js";
import { renderSF } from "../components/icons.js";

export function renderPracticeView(project, quiz, practiceState) {
  const qList = practiceState.activeQuestions || [];
  const currentIdx = practiceState.currentIndex || 0;
  const currentQ = qList[currentIdx];
  const totalQ = qList.length;

  if (!currentQ) {
    return `<div class="study-view-shell"><div style="margin: auto; font-size: 24px;">Đang tải bài thi...</div></div>`;
  }

  const isPart2 = currentQ.part === "part2" || currentQ.questionType === "trueFalseGroup";
  const isPart3 = currentQ.part === "part3" || currentQ.questionType === "shortAnswer";
  const isPart1 = !isPart2 && !isPart3;

  const userAns = practiceState.userSelectedOptionIds[currentQ.id] ?? practiceState.userAnswers[currentQ.id];
  const isAnswered = userAns !== undefined && userAns !== null;
  const scoreResult = isAnswered ? scoreQuestion(currentQ, userAns) : { earnedPoints: 0, maxPoints: currentQ.pointValue || 0.25, isFullyCorrect: false };

  const progressRatio = totalQ > 0 ? (Object.keys(practiceState.userAnswers).length / totalQ) * 100 : 0;
  const hasReading = !!(currentQ.readingPassage && currentQ.readingPassage.trim());

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
    <div class="study-view-shell" id="practice-view-shell">
      <!-- Top Header -->
      <div class="study-header">
        <button class="btn btn-ghost" id="btn-quit-practice" title="${i18n.t("quitQuiz")}">
          ${renderSF("arrow.left", { size: "16px" })} <span class="btn-text-hide-mobile">${i18n.t("quitQuiz")}</span>
        </button>

        <div class="study-header-center">
          <div class="study-header-title">
            ${escapeHtml(quiz.title)}
          </div>
          <div class="study-header-counter">
            ${i18n.t("progressFormat", currentIdx + 1, totalQ)}
          </div>
        </div>

        <div class="study-header-actions">
          <button class="btn btn-pill ${storage.settings.isShuffleEnabled ? 'active' : 'btn-secondary'}" id="btn-practice-shuffle" title="${i18n.t("toggleShuffle")}">
            ${renderSF("arrow.triangle.2.circlepath", { size: "14px" })}
            <span class="btn-text-hide-mobile">${i18n.t("toggleShuffle")}</span>
          </button>
          <button class="btn btn-pill ${practiceState.showNavPane ? 'active' : 'btn-secondary'}" id="btn-toggle-nav-pane" title="${i18n.t("questionNavPane")}">
            ${renderSF("list.bullet", { size: "14px" })}
            <span class="btn-text-hide-mobile">${i18n.t("questionNavPane")}</span>
          </button>
        </div>
      </div>

      <!-- Linear Progress Bar -->
      <div class="progress-bar-container" style="border-radius: 0; height: 3px;">
        <div class="progress-bar-fill" style="width: ${progressRatio}%; --progress-color: var(--color-ocean-blue);"></div>
      </div>

      <!-- Main Body Split -->
      <div class="study-body-split">
        <!-- Reading Passage Pane (Left) -->
        ${hasReading ? renderReadingPassagePane(currentQ.readingPassage, practiceState.readingState, () => {}) : ''}

        <!-- Main Question & Options Area (Center) -->
        <div class="study-main-area">
          <div class="question-box">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge ${partBadgeColor}">${partBadgeText}</span>
                <span class="badge badge-gray">Câu ${currentIdx + 1} / ${totalQ}</span>
              </div>

              <button class="btn btn-pill btn-secondary" id="btn-ask-gemini" style="color: var(--color-deep-purple); border-color: rgba(122, 92, 204, 0.3); font-size: var(--text-xs); padding: 0.25rem 0.6rem;">
                ${renderSF("sparkles", { size: "13px" })} Hỏi AI
              </button>
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
                const correctOpt = currentQ.options[currentQ.correctAnswerIndex] || currentQ.options[0];
                const isCorrectOpt = opt.id === correctOpt.id || optIdx === currentQ.correctAnswerIndex;
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
                    ${isAnswered && isCorrectOpt ? `<span style="font-size: 16px; color: var(--color-emerald-mint);">${renderSF("checkmark", { size: "16px" })}</span>` : ''}
                    ${isAnswered && isSelected && !isCorrectOpt ? `<span style="font-size: 16px; color: var(--color-coral-red);">${renderSF("xmark", { size: "16px" })}</span>` : ''}
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
                const subUserChoices = (typeof userAns === "object" && userAns !== null) ? userAns : (practiceState.draftSubAnswers?.[currentQ.id] || {});
                const choice = subUserChoices[sub.id];
                const hasChoice = choice !== undefined && choice !== null;
                const isSubCorrect = hasChoice && Boolean(choice) === Boolean(sub.isCorrect);

                let rowClass = "";
                let trueBtnClass = "";
                let falseBtnClass = "";

                if (isAnswered) {
                  rowClass = isSubCorrect ? "is-correct" : "is-wrong";
                  if (choice === true) {
                    trueBtnClass = sub.isCorrect ? "ans-correct" : "ans-wrong";
                  }
                  if (choice === false) {
                    falseBtnClass = !sub.isCorrect ? "ans-correct" : "ans-wrong";
                  }
                  if (sub.isCorrect && choice !== true) {
                    trueBtnClass += " is-key-correct";
                  }
                  if (!sub.isCorrect && choice !== false) {
                    falseBtnClass += " is-key-correct";
                  }
                } else {
                  if (choice === true) trueBtnClass = "is-selected";
                  if (choice === false) falseBtnClass = "is-selected";
                }

                return `
                  <div class="thpt-subitem-row ${rowClass}">
                    <div class="thpt-subitem-text">
                      <strong>${sub.label || String.fromCharCode(97 + sIdx)})</strong> ${formatMarkdownHTML(sub.text)}
                    </div>
                    <div class="thpt-tf-toggle-group">
                      <button class="thpt-tf-btn ${trueBtnClass}" data-sub-id="${sub.id}" data-tf-val="true" ${isAnswered ? 'disabled' : ''}>
                        ${i18n.t("thptTrue")} ${isAnswered && sub.isCorrect ? '✓' : ''}
                      </button>
                      <button class="thpt-tf-btn ${falseBtnClass}" data-sub-id="${sub.id}" data-tf-val="false" ${isAnswered ? 'disabled' : ''}>
                        ${i18n.t("thptFalse")} ${isAnswered && !sub.isCorrect ? '✓' : ''}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}

              ${!isAnswered ? `
                <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                  <button class="btn btn-primary" id="btn-submit-tf-practice">
                    ${i18n.t("thptCheckAnswer")}
                  </button>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- QUESTION TYPE 3: SHORT ANSWER (PHẦN III) -->
          ${isPart3 ? `
            <div class="thpt-short-answer-box">
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">
                ${i18n.t("thptShortAnswerPrompt")}
              </label>
              <div class="thpt-input-row">
                <input type="text" class="thpt-short-input" id="input-short-answer" placeholder="${i18n.t("thptShortAnswerPlaceholder")}" value="${escapeHtml(typeof userAns === 'string' ? userAns : (practiceState.draftShortAnswers?.[currentQ.id] || ''))}" ${isAnswered ? 'disabled' : ''}>
                ${!isAnswered ? `
                  <button class="btn btn-primary" id="btn-submit-short-practice">
                    ${i18n.t("thptCheckAnswer")}
                  </button>
                ` : ''}
              </div>

              ${isAnswered ? `
                <div style="margin-top: 6px; font-size: var(--text-sm); font-weight: 600;">
                  <span style="color: var(--text-secondary);">${i18n.t("correctChoice")}</span>
                  <strong style="color: var(--color-emerald-mint); margin-left: 6px;">${formatMarkdownHTML(currentQ.shortAnswer || (currentQ.acceptedAnswers || []).join(" / "))}</strong>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Immediate Feedback / Explanation -->
          ${isAnswered ? `
            <div class="explanation-card ${scoreResult.isFullyCorrect ? 'correct' : (scoreResult.earnedPoints > 0 ? 'partial' : 'wrong')}" style="margin-top: 16px;">
              <div class="explanation-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>
                  ${scoreResult.isFullyCorrect ? renderSF("checkmark.circle", { size: "16px" }) + ' ' + i18n.t("correctAnswer") : (scoreResult.earnedPoints > 0 ? renderSF("checkmark", { size: "16px" }) + ' Đúng một phần' : renderSF("xmark.circle", { size: "16px" }) + ' ' + i18n.t("wrongAnswer"))}
                </span>
                <span class="badge ${scoreResult.isFullyCorrect ? 'badge-green' : (scoreResult.earnedPoints > 0 ? 'badge-orange' : 'badge-red')}">
                  +${scoreResult.earnedPoints} / ${scoreResult.maxPoints} đ
                </span>
              </div>
              ${currentQ.explanation ? `
                <div class="explanation-content" style="margin-top: 10px;">
                  <strong style="color: var(--color-ocean-blue);">${renderSF("lightbulb", { size: "14px" })} Giải thích chi tiết:</strong><br>
                  ${formatMarkdownHTML(currentQ.explanation)}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Question Navigator Sidebar (Right on desktop / Bottom Sheet on mobile) -->
        ${practiceState.showNavPane ? `
          <aside class="question-nav-pane">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); letter-spacing: 0.05em;">
                ${i18n.t("questionNavPane")}
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-nav-pane" style="width: 24px; height: 24px;">
                ${renderSF("xmark", { size: "12px" })}
              </button>
            </div>
            ${renderPracticeNavSections(project, qList, currentIdx, practiceState)}
          </aside>
        ` : ''}
      </div>

      <!-- Footer Bar -->
      <footer class="study-footer">
        <div class="shortcuts-hint">
          <span>Phím:</span>
          <span class="kbd-tag">A</span> <span class="kbd-tag">B</span> <span class="kbd-tag">C</span> <span class="kbd-tag">D</span>
          <span>•</span>
          <span class="kbd-tag">Enter</span> <span>${i18n.t("nextQuestion")}</span>
        </div>

        <div style="flex: 1; display: flex; justify-content: flex-end;">
          ${isAnswered ? `
            <button class="btn btn-primary ${currentIdx + 1 < totalQ ? 'btn-blue' : 'btn-green'}" id="btn-practice-next">
              ${currentIdx + 1 < totalQ ? i18n.t("nextQuestion") + ' →' : i18n.t("finishPractice")}
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

  const closeNavBtn = document.getElementById("btn-close-nav-pane");
  if (closeNavBtn) {
    closeNavBtn.onclick = () => {
      practiceState.showNavPane = false;
      handlers.onUpdateView();
    };
  }

  // Multiple Choice Option buttons (Part I)
  document.querySelectorAll(".option-btn:not(:disabled)").forEach(btn => {
    btn.onclick = () => {
      const optId = btn.dataset.optId;
      const optIdx = parseInt(btn.dataset.optIdx, 10);
      handlers.onSelectOption(optId, optIdx);
    };
  });

  // True / False toggle buttons (Part II)
  document.querySelectorAll(".thpt-tf-btn:not(:disabled)").forEach(btn => {
    btn.onclick = () => {
      const currentQ = practiceState.activeQuestions[practiceState.currentIndex];
      const subId = btn.dataset.subId;
      const val = btn.dataset.tfVal === "true";

      if (!practiceState.draftSubAnswers) practiceState.draftSubAnswers = {};
      if (!practiceState.draftSubAnswers[currentQ.id]) practiceState.draftSubAnswers[currentQ.id] = {};
      practiceState.draftSubAnswers[currentQ.id][subId] = val;
      handlers.onUpdateView();
    };
  });

  // Submit True / False (Part II)
  const submitTfBtn = document.getElementById("btn-submit-tf-practice");
  if (submitTfBtn) {
    submitTfBtn.onclick = () => {
      const currentQ = practiceState.activeQuestions[practiceState.currentIndex];
      const subAnswers = practiceState.draftSubAnswers?.[currentQ.id] || {};
      handlers.onSelectPart2Answers(currentQ.id, subAnswers);
    };
  }

  // Short Answer Input & Submit (Part III)
  const shortInput = document.getElementById("input-short-answer");
  if (shortInput && !shortInput.disabled) {
    shortInput.oninput = (e) => {
      const currentQ = practiceState.activeQuestions[practiceState.currentIndex];
      if (!practiceState.draftShortAnswers) practiceState.draftShortAnswers = {};
      practiceState.draftShortAnswers[currentQ.id] = e.target.value;
    };
    shortInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        const currentQ = practiceState.activeQuestions[practiceState.currentIndex];
        const val = shortInput.value.trim();
        if (val) handlers.onSelectPart3Answer(currentQ.id, val);
      }
    };
  }

  const submitShortBtn = document.getElementById("btn-submit-short-practice");
  if (submitShortBtn) {
    submitShortBtn.onclick = () => {
      const currentQ = practiceState.activeQuestions[practiceState.currentIndex];
      const inputEl = document.getElementById("input-short-answer");
      const val = (inputEl ? inputEl.value : "").trim();
      handlers.onSelectPart3Answer(currentQ.id, val);
    };
  }

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

  // Nav item jump - DO NOT auto-minimize nav pane
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
    const isAns = (practiceState.userSelectedOptionIds[currentQ.id] !== undefined && practiceState.userSelectedOptionIds[currentQ.id] !== null) ||
                  (practiceState.userAnswers[currentQ.id] !== undefined && practiceState.userAnswers[currentQ.id] !== null);

    if (e.key === "Enter" || e.key === " ") {
      // Don't intercept Enter when typing in input
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;
      if (isAns) {
        handlers.onNext();
        e.preventDefault();
        return;
      }
    }

    if (!isAns && currentQ && (currentQ.part === "part1" || currentQ.questionType === "multipleChoice") && currentQ.options) {
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

function renderPracticeNavSections(project, qList, currentIdx, practiceState) {
  const isTHPT = project?.projectType === "thptQuocGia";
  const isLL = project?.projectType === "languageLearning";

  const renderButton = (q, idx) => {
    const isCur = idx === currentIdx;
    const qAns = practiceState.userSelectedOptionIds[q.id] ?? practiceState.userAnswers[q.id];
    const hasAns = qAns !== undefined && qAns !== null;
    const score = hasAns ? scoreQuestion(q, qAns) : null;

    let navClass = "";
    if (isCur) navClass = "current";
    else if (hasAns) navClass = score.isFullyCorrect ? "answered-correct" : (score.earnedPoints > 0 ? "answered-partial" : "answered-wrong");

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

