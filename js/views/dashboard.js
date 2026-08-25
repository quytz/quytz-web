/**
 * QuizMaster Web - Dashboard View Component (Multi-Platform Responsive)
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { calculateProjectStats, calculateQuizScore } from "../models/types.js";
import { renderSF } from "../components/icons.js";

export function renderDashboard(project, appState) {
  if (!project) {
    return `
      <main class="app-main">
        <div style="margin: auto; text-align: center; color: var(--text-secondary); padding: 40px 20px;">
          <div style="margin-bottom: 12px; color: var(--color-ocean-blue);">${renderSF("folder", { size: "54px" })}</div>
          <div style="font-size: var(--text-lg); font-weight: 700;">${i18n.t("noProjectsYet")}</div>
          <p style="margin-top: 6px;">${i18n.t("createFirstProjectPrompt")}</p>
        </div>
      </main>
    `;
  }

  const stats = calculateProjectStats(project);
  const isMulti = appState.isMultiSelectMode;
  const selectedCount = appState.selectedQuizIds ? appState.selectedQuizIds.size : 0;
  const isShuffle = storage.settings.isShuffleEnabled;

  return `
    <main class="app-main">
      <!-- Top Dashboard Bar - 2-Row Layout -->
      <header class="top-header-bar">
        <div class="top-header-primary">
          <button class="btn btn-secondary btn-icon-only mobile-menu-btn" id="btn-toggle-mobile-sidebar" title="Mở danh sách dự án">
            ${renderSF("line.3.horizontal", { size: "1.2rem" })}
          </button>
          <div class="top-header-title">
            <h1>${escapeHtml(project.name)}</h1>
            <p>${project.quizzes.length} ${i18n.t("quizzesCount")} • ${stats.totalQuestions} ${i18n.t("questionsCount")}</p>
          </div>
        </div>

        <div class="top-header-toolbar">
          <!-- Shuffle Button -->
          <button class="btn btn-pill ${isShuffle ? 'active' : 'btn-secondary'}" id="btn-toggle-shuffle" title="Bật/tắt xáo trộn câu hỏi và phương án A/B/C/D">
            ${renderSF("arrow.triangle.2.circlepath", { size: "14px" })}
            <span class="btn-text-hide-mobile">${i18n.t("toggleShuffle")}</span>
          </button>

          <!-- Multi-select Mode Button -->
          <button class="btn btn-pill ${isMulti ? 'btn-primary btn-purple' : 'btn-secondary'}" id="btn-toggle-multi-select" title="Chọn nhiều bộ đề">
            ${renderSF("square.stack", { size: "14px" })}
            <span class="btn-text-hide-mobile">${isMulti ? i18n.t("exitMultiSelect") : i18n.t("multiSelectQuizzes")}</span>
          </button>

          <!-- Import Document Button -->
          <button class="btn btn-primary btn-rainbow" id="btn-open-import">
            ${renderSF("plus", { size: "16px" })} <span>${i18n.t("importDoc")}</span>
          </button>
        </div>
      </header>

      <!-- Multi-select Toolbar -->
      ${isMulti && selectedCount > 0 ? `
        <div class="multi-select-bar">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--color-ocean-blue); font-size: var(--text-sm);">
            ${renderSF("checkmark", { size: "14px" })}
            <span>Đã chọn ${selectedCount} bộ đề</span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <div class="segmented-control">
              <button class="segment-btn active" id="btn-multi-practice">Luyện tập (${selectedCount})</button>
              <button class="segment-btn" id="btn-multi-exam">Thi thử</button>
              <button class="segment-btn" id="btn-multi-flashcard">Thẻ ghi nhớ</button>
            </div>

            <button class="btn btn-secondary" id="btn-multi-move">
              Chuyển...
            </button>
            <button class="btn btn-secondary" id="btn-multi-delete" style="color: var(--color-coral-red);">
              ${renderSF("trash", { size: "13px" })} Xóa (${selectedCount})
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Dashboard Content & Quiz Grid -->
      <div class="dashboard-content">
        ${project.quizzes.length === 0 ? `
          <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary); max-width: 500px; margin: 0 auto;">
            <div style="margin-bottom: 12px; color: var(--color-ocean-blue);">${renderSF("doc.text", { size: "48px" })}</div>
            <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary);">${i18n.t("noQuizzesInProject")}</div>
            <p style="margin: 8px 0 16px; font-size: var(--text-sm);">Tải lên tài liệu PDF, Word .docx hoặc bài giảng để Gemini AI tự động tạo đề thi.</p>
            <button class="btn btn-primary btn-rainbow" id="btn-empty-import">
              ${renderSF("plus", { size: "16px" })} ${i18n.t("importDoc")}
            </button>
          </div>
        ` : `
          <div class="quiz-grid">
            ${project.quizzes.map(quiz => renderQuizCard(quiz, project, appState)).join('')}
          </div>
        `}
      </div>
    </main>
  `;
}

function renderQuizCard(quiz, project, appState) {
  const prog = project.progressMap[quiz.id];
  const isFullyCompleted = prog && (prog.isCompleted || (Object.keys(prog.userAnswers || {}).length >= quiz.questions.length && quiz.questions.length > 0));
  const isLL = quiz.quizType === "languageLearning" || project.projectType === "languageLearning";
  const isTHPT = quiz.quizType === "thptQuocGia" || project.projectType === "thptQuocGia";
  const isSelectedInMulti = appState.selectedQuizIds && appState.selectedQuizIds.has(quiz.id);

  let progressPercent = 0;
  let practicedCount = 0;
  if (prog && prog.userAnswers) {
    practicedCount = Object.keys(prog.userAnswers).length;
    progressPercent = quiz.questions.length > 0 ? Math.round((practicedCount / quiz.questions.length) * 100) : 0;
  }

  // Calculate score if practiced
  let scoreBadgeHtml = "";
  if (isFullyCompleted) {
    if (isTHPT) {
      const scoreRes = calculateQuizScore(quiz, prog);
      scoreBadgeHtml = `<span class="badge badge-green">${renderSF("checkmark", { size: "11px" })} Đạt ${scoreRes.scoreOutOf10}/10đ (${scoreRes.percentage}%)</span>`;
    } else {
      scoreBadgeHtml = `<span class="badge badge-green">${renderSF("checkmark", { size: "11px" })} Đã ôn xong</span>`;
    }
  } else if (practicedCount > 0) {
    scoreBadgeHtml = `<span class="badge badge-orange">Đang học ${progressPercent}%</span>`;
  }

  return `
    <div class="glass-card quiz-card ${isFullyCompleted ? 'card-completed-rainbow' : ''}" data-quiz-id="${quiz.id}">
      <div class="quiz-card-header">
        ${appState.isMultiSelectMode ? `
          <input type="checkbox" class="quiz-select-checkbox custom-checkbox" data-quiz-id="${quiz.id}" ${isSelectedInMulti ? 'checked' : ''}>
        ` : ''}
        <div class="quiz-card-title">${escapeHtml(quiz.title)}</div>
        <div class="quiz-card-actions">
          ${(isFullyCompleted || practicedCount > 0) ? `
            <button class="btn btn-ghost btn-icon-only btn-card-reset" data-quiz-id="${quiz.id}" title="${i18n.t("resetProgress")}">
              ${renderSF("arrow.counterclockwise", { size: "15px" })}
            </button>
          ` : ''}
          <button class="btn btn-ghost btn-icon-only btn-card-edit" data-quiz-id="${quiz.id}" title="Chỉnh sửa câu hỏi">
            ${renderSF("square.and.pencil", { size: "15px" })}
          </button>
          <button class="btn btn-ghost btn-icon-only btn-card-menu" data-quiz-id="${quiz.id}" title="Tùy chọn">
            ${renderSF("ellipsis", { size: "14px" })}
          </button>
        </div>
      </div>

      <div class="quiz-card-meta">
        <span class="badge ${isTHPT ? 'badge-orange' : (isLL ? 'badge-purple' : 'badge-blue')}">
          ${quiz.questions.length} ${i18n.t("questionsCount")}
        </span>
        ${isTHPT ? `<span class="badge badge-red">THPT QG (3 Phần)</span>` : ''}
        ${isLL && quiz.vocabularies ? `<span class="badge badge-teal">${quiz.vocabularies.length} từ vựng</span>` : ''}
        ${scoreBadgeHtml}
      </div>

      <div class="study-modes-row">
        <button class="btn btn-secondary btn-study-practice" data-quiz-id="${quiz.id}">
          ${i18n.t("practiceMode")}
        </button>
        <button class="btn btn-secondary btn-study-exam" data-quiz-id="${quiz.id}">
          ${i18n.t("examMode")}
        </button>
        <button class="btn btn-secondary btn-study-flashcard" data-quiz-id="${quiz.id}">
          ${i18n.t("flashcardMode")}
        </button>
      </div>
    </div>
  `;
}

export function bindDashboardEvents(project, appState, handlers) {
  // Mobile sidebar toggle
  const mobileBtn = document.getElementById("btn-toggle-mobile-sidebar");
  if (mobileBtn) mobileBtn.onclick = () => handlers.onToggleMobileSidebar();

  // Shuffle toggle
  const shuffleBtn = document.getElementById("btn-toggle-shuffle");
  if (shuffleBtn) shuffleBtn.onclick = () => handlers.onToggleShuffle();

  // Multi-select toggle
  const multiBtn = document.getElementById("btn-toggle-multi-select");
  if (multiBtn) multiBtn.onclick = () => handlers.onToggleMultiSelect();

  // Import button
  const importBtn = document.getElementById("btn-open-import");
  if (importBtn) importBtn.onclick = () => handlers.onOpenImport();

  const emptyImportBtn = document.getElementById("btn-empty-import");
  if (emptyImportBtn) emptyImportBtn.onclick = () => handlers.onOpenImport();

  // Multi checkboxes
  document.querySelectorAll(".quiz-select-checkbox").forEach(chk => {
    chk.onchange = (e) => {
      handlers.onSelectQuiz(chk.dataset.quizId, e.target.checked);
    };
  });

  // Multi actions
  const multiPractice = document.getElementById("btn-multi-practice");
  if (multiPractice) multiPractice.onclick = () => handlers.onMultiStudy("practice");

  const multiExam = document.getElementById("btn-multi-exam");
  if (multiExam) multiExam.onclick = () => handlers.onMultiStudy("exam");

  const multiFlashcard = document.getElementById("btn-multi-flashcard");
  if (multiFlashcard) multiFlashcard.onclick = () => handlers.onMultiStudy("flashcard");

  const multiMove = document.getElementById("btn-multi-move");
  if (multiMove) multiMove.onclick = () => handlers.onMultiMove();

  const multiDelete = document.getElementById("btn-multi-delete");
  if (multiDelete) multiDelete.onclick = () => handlers.onMultiDelete();

  // Study mode clicks
  document.querySelectorAll(".btn-study-practice").forEach(btn => {
    btn.onclick = () => handlers.onStartPractice(btn.dataset.quizId);
  });

  document.querySelectorAll(".btn-study-exam").forEach(btn => {
    btn.onclick = () => handlers.onStartExam(btn.dataset.quizId);
  });

  document.querySelectorAll(".btn-study-flashcard").forEach(btn => {
    btn.onclick = () => handlers.onStartFlashcard(btn.dataset.quizId);
  });

  document.querySelectorAll(".btn-card-reset").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      handlers.onResetQuizProgress(btn.dataset.quizId);
    };
  });

  document.querySelectorAll(".btn-card-edit").forEach(btn => {
    btn.onclick = () => handlers.onEditQuiz(btn.dataset.quizId);
  });

  document.querySelectorAll(".btn-card-menu").forEach(btn => {
    btn.onclick = (e) => handlers.onOpenQuizMenu(btn.dataset.quizId, e);
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

