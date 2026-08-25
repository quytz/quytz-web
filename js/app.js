/**
 * QuizMaster Web - Central Application Controller & Router
 * Version: v1.2.0
 */
import { APP_CONFIG } from "./config.js";
import { i18n } from "./localization/i18n.js";
import { storage } from "./services/storage.js";
import { geminiService } from "./services/gemini.js";
import { documentParser } from "./services/document-parser.js";
import { exporter } from "./services/exporter.js";
import { telemetry } from "./services/telemetry.js";
import { logger } from "./services/logger.js";
import { keyboard } from "./components/keyboard.js";
import { createQuizProgress, shuffleQuestionOptions, createQuiz, createQuestion, createQuestionOption, scoreQuestion } from "./models/types.js";
import { renderSF } from "./components/icons.js";

// Views
import { renderSidebar, bindSidebarEvents } from "./views/sidebar.js";
import { renderDashboard, bindDashboardEvents } from "./views/dashboard.js";
import { renderPracticeView, bindPracticeEvents } from "./views/practice.js";
import { renderExamView, bindExamEvents } from "./views/exam.js";
import { renderFlashcardView, bindFlashcardEvents } from "./views/flashcard.js";
import { renderReviewModal, bindReviewEvents } from "./views/review.js";
import { renderQuizEditorModal, bindQuizEditorEvents } from "./views/editor.js";
import { renderImportModal, bindImportModalEvents } from "./views/import-modal.js";
import { renderAskGeminiModal, bindAskGeminiEvents } from "./views/ask-gemini.js";
import { renderSettingsModal, bindSettingsEvents } from "./views/settings.js";
import { renderSetupWizardModal, bindSetupWizardEvents } from "./views/setup-wizard.js";
import { renderEndingModal, bindEndingModalEvents, renderNationalAnthemModal, bindNationalAnthemEvents } from "./views/ending-dialog.js";
import { renderFeedbackModal, bindFeedbackModalEvents } from "./views/feedback-modal.js";

class QuizMasterApp {
  constructor() {
    this.selectedProjectId = storage.projects[0]?.id || null;
    this.currentView = "dashboard"; // "dashboard" | "practice" | "exam" | "flashcard"
    this.activeQuiz = null;
    this.activeProject = null;

    // View States
    this.appState = {
      isMultiSelectMode: false,
      selectedQuizIds: new Set(),
      isMobileSidebarOpen: false
    };

    this.practiceState = null;
    this.examState = null;
    this.flashcardState = null;
    this.examTimerInterval = null;

    // Modals
    this.activeModal = null; // "import" | "settings" | "editor" | "review" | "ending" | "askGemini" | "setupWizard" | "quizActionMenu" | "newProject" | "moveQuiz"
    this.modalState = {};

    this.init();
  }

  init() {
    // Apply Settings
    i18n.setLanguage(storage.settings.language || "vi");
    storage.applyThemeAndScale();

    // Always show splash screen for 2 seconds when website is opened
    setTimeout(() => {
      // Check if First-Time Setup Wizard is needed
      if (!storage.settings.hasCompletedFirstTimeSetup) {
        this.openSetupWizard();
      }

      this.render();
    }, 2000);
  }

  // Toast System
  showToast(type, message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✓" : (type === "error" ? "✕" : "ℹ");
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(16px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Navigation & View Switching
  navigateToDashboard() {
    if (this.examTimerInterval) {
      clearInterval(this.examTimerInterval);
      this.examTimerInterval = null;
    }
    keyboard.clearHandler();
    this.currentView = "dashboard";
    this.activeQuiz = null;
    this.practiceState = null;
    this.examState = null;
    this.flashcardState = null;
    this.activeModal = null;
    this.render();
  }

  getSelectedProject() {
    return storage.projects.find(p => p.id === this.selectedProjectId) || storage.projects[0] || null;
  }

  // --- PRACTICE MODE ---
  startPractice(quizId, options = {}) {
    const project = this.getSelectedProject();
    if (!project) return;

    let quiz = project.quizzes.find(q => q.id === quizId);
    if (!quiz && !this.activeQuiz) return;
    if (!quiz) quiz = this.activeQuiz;

    telemetry.trackExamMode("practice");
    logger.action("Bắt đầu luyện tập", { quizId, title: quiz.title });

    this.activeProject = project;
    this.activeQuiz = quiz;

    const isRedo = !!options.isRedo;
    const questionsToUse = options.questionsOverride || quiz.questions;

    let activeQuestions = [...questionsToUse];
    if (storage.settings.isShuffleEnabled) {
      activeQuestions = activeQuestions.map(q => shuffleQuestionOptions(q));
      activeQuestions.sort(() => Math.random() - 0.5);
    }

    if (isRedo) {
      this.practiceState = {
        isRedo: true,
        activeQuestions,
        currentIndex: 0,
        userAnswers: {},
        userSelectedOptionIds: {},
        wrongQuestionIds: new Set(),
        showNavPane: false,
        readingState: {
          fontSizeDelta: 0,
          lineSpacing: 1.6,
          fontFamily: "serif",
          theme: "standard",
          isBold: false,
          showDrawer: false
        }
      };
    } else {
      // Load or initialize progress
      let prog = project.progressMap[quizId];
      if (!prog) {
        prog = createQuizProgress({ quizId: quiz.id });
        storage.saveProgress(project.id, prog);
      }

      this.practiceState = {
        isRedo: false,
        activeQuestions,
        currentIndex: Math.min(prog.currentIndex || 0, Math.max(0, activeQuestions.length - 1)),
        userAnswers: { ...(prog.userAnswers || {}) },
        userSelectedOptionIds: { ...(prog.userSelectedOptionIds || {}) },
        wrongQuestionIds: new Set(prog.wrongQuestionIds || []),
        showNavPane: false,
        readingState: {
          fontSizeDelta: 0,
          lineSpacing: 1.6,
          fontFamily: "serif",
          theme: "standard",
          isBold: false,
          showDrawer: false
        }
      };
    }

    this.currentView = "practice";
    this.render();
  }

  selectPracticeOption(optId, optIdx) {
    const q = this.practiceState.activeQuestions[this.practiceState.currentIndex];
    if (!q) return;

    this.practiceState.userSelectedOptionIds[q.id] = optId;
    this.practiceState.userAnswers[q.id] = optIdx;

    const correctOpt = q.options[q.correctAnswerIndex] || q.options[0];
    const isCorrect = (optId === correctOpt.id);

    if (isCorrect) {
      this.practiceState.wrongQuestionIds.delete(q.id);
    } else {
      this.practiceState.wrongQuestionIds.add(q.id);
    }

    // If in redo mode, update the main project quiz progress so the newly corrected answers reflect in review & stats
    if (this.practiceState.isRedo && this.activeProject && this.activeQuiz) {
      let mainProg = this.activeProject.progressMap[this.activeQuiz.id];
      if (mainProg) {
        if (!mainProg.userSelectedOptionIds) mainProg.userSelectedOptionIds = {};
        if (!mainProg.userAnswers) mainProg.userAnswers = {};
        mainProg.userSelectedOptionIds[q.id] = optId;
        mainProg.userAnswers[q.id] = optIdx;

        let wrongIds = new Set(mainProg.wrongQuestionIds || []);
        if (isCorrect) {
          wrongIds.delete(q.id);
        } else {
          wrongIds.add(q.id);
        }
        mainProg.wrongQuestionIds = Array.from(wrongIds);
        storage.saveProgress(this.activeProject.id, mainProg);
      }
    }

    // Save Progress Checkpoint
    this.saveCurrentPracticeProgress();
    this.render();
  }

  selectPracticePart2Answers(questionId, subAnswers) {
    const q = this.practiceState.activeQuestions[this.practiceState.currentIndex];
    if (!q) return;

    this.practiceState.userSelectedOptionIds[q.id] = subAnswers;
    this.practiceState.userAnswers[q.id] = subAnswers;

    const scoreRes = scoreQuestion(q, subAnswers);
    if (scoreRes.isFullyCorrect) {
      this.practiceState.wrongQuestionIds.delete(q.id);
    } else {
      this.practiceState.wrongQuestionIds.add(q.id);
    }

    if (this.practiceState.isRedo && this.activeProject && this.activeQuiz) {
      let mainProg = this.activeProject.progressMap[this.activeQuiz.id];
      if (mainProg) {
        if (!mainProg.userSelectedOptionIds) mainProg.userSelectedOptionIds = {};
        if (!mainProg.userAnswers) mainProg.userAnswers = {};
        mainProg.userSelectedOptionIds[q.id] = subAnswers;
        mainProg.userAnswers[q.id] = subAnswers;

        let wrongIds = new Set(mainProg.wrongQuestionIds || []);
        if (scoreRes.isFullyCorrect) wrongIds.delete(q.id);
        else wrongIds.add(q.id);
        mainProg.wrongQuestionIds = Array.from(wrongIds);
        storage.saveProgress(this.activeProject.id, mainProg);
      }
    }

    this.saveCurrentPracticeProgress();
    this.render();
  }

  selectPracticePart3Answer(questionId, shortAnswer) {
    const q = this.practiceState.activeQuestions[this.practiceState.currentIndex];
    if (!q) return;

    this.practiceState.userSelectedOptionIds[q.id] = shortAnswer;
    this.practiceState.userAnswers[q.id] = shortAnswer;

    const scoreRes = scoreQuestion(q, shortAnswer);
    if (scoreRes.isFullyCorrect) {
      this.practiceState.wrongQuestionIds.delete(q.id);
    } else {
      this.practiceState.wrongQuestionIds.add(q.id);
    }

    if (this.practiceState.isRedo && this.activeProject && this.activeQuiz) {
      let mainProg = this.activeProject.progressMap[this.activeQuiz.id];
      if (mainProg) {
        if (!mainProg.userSelectedOptionIds) mainProg.userSelectedOptionIds = {};
        if (!mainProg.userAnswers) mainProg.userAnswers = {};
        mainProg.userSelectedOptionIds[q.id] = shortAnswer;
        mainProg.userAnswers[q.id] = shortAnswer;

        let wrongIds = new Set(mainProg.wrongQuestionIds || []);
        if (scoreRes.isFullyCorrect) wrongIds.delete(q.id);
        else wrongIds.add(q.id);
        mainProg.wrongQuestionIds = Array.from(wrongIds);
        storage.saveProgress(this.activeProject.id, mainProg);
      }
    }

    this.saveCurrentPracticeProgress();
    this.render();
  }

  resetQuizProgress(quizId) {
    const project = this.getSelectedProject();
    if (!project) return;
    storage.resetQuizProgress(project.id, quizId);
    this.showToast("success", "Đã đặt lại tiến độ bộ đề thi thành công!");
    this.render();
  }

  nextPracticeQuestion() {
    if (this.practiceState.currentIndex + 1 < this.practiceState.activeQuestions.length) {
      this.practiceState.currentIndex++;
      this.saveCurrentPracticeProgress();
      this.render();
    } else {
      // Completed!
      this.saveCurrentPracticeProgress(true);
      if (this.practiceState.isRedo) {
        const redoProgress = {
          currentIndex: this.practiceState.currentIndex,
          userAnswers: this.practiceState.userAnswers,
          userSelectedOptionIds: this.practiceState.userSelectedOptionIds,
          wrongQuestionIds: Array.from(this.practiceState.wrongQuestionIds),
          isCompleted: true
        };
        const redoQuizObj = {
          ...this.activeQuiz,
          title: `${this.activeQuiz.title} (Làm lại câu sai)`,
          questions: this.practiceState.activeQuestions
        };
        this.openEndingModal(redoProgress, redoQuizObj);
      } else {
        this.openEndingModal();
      }
    }
  }

  saveCurrentPracticeProgress(isCompleted = false) {
    if (!this.activeProject || !this.activeQuiz || !this.practiceState) return;
    if (this.practiceState.isRedo) return;

    const prog = createQuizProgress({
      quizId: this.activeQuiz.id,
      currentIndex: this.practiceState.currentIndex,
      userAnswers: this.practiceState.userAnswers,
      userSelectedOptionIds: this.practiceState.userSelectedOptionIds,
      wrongQuestionIds: Array.from(this.practiceState.wrongQuestionIds),
      isCompleted
    });

    storage.saveProgress(this.activeProject.id, prog);
  }

  // --- EXAM MODE ---
  openExamTimerModal(quizId) {
    const project = this.getSelectedProject();
    if (!project) return;
    const quiz = project.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    this.activeModal = "examTimer";
    this.modalState = {
      quizId: quizId,
      selectedDuration: 45,
      customMinutes: 45,
      isUnlimited: false
    };
    this.render();
  }

  startExam(quizId, durationMinutes = 45) {
    const project = this.getSelectedProject();
    if (!project) return;

    let quiz = project.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    telemetry.trackExamMode("exam");
    logger.action("Bắt đầu thi thử", { quizId, durationMinutes, title: quiz.title });

    this.activeProject = project;
    this.activeQuiz = quiz;

    let activeQuestions = [...quiz.questions];
    if (storage.settings.isShuffleEnabled) {
      activeQuestions = activeQuestions.map(q => shuffleQuestionOptions(q));
      activeQuestions.sort(() => Math.random() - 0.5);
    }

    const isUnlimited = durationMinutes === null || durationMinutes <= 0;
    const totalSeconds = isUnlimited ? null : durationMinutes * 60;

    this.examState = {
      activeQuestions,
      currentIndex: 0,
      userSelectedOptionIds: {},
      userAnswers: {},
      timeRemainingSeconds: totalSeconds,
      showNavPane: false,
      readingState: {
        fontSizeDelta: 0,
        lineSpacing: 1.6,
        fontFamily: "serif",
        theme: "standard",
        isBold: false,
        showDrawer: false
      }
    };

    if (this.examTimerInterval) clearInterval(this.examTimerInterval);
    if (!isUnlimited) {
      this.examTimerInterval = setInterval(() => {
        if (this.examState && this.currentView === "exam") {
          if (this.examState.timeRemainingSeconds > 0) {
            this.examState.timeRemainingSeconds--;
            const timerBox = document.getElementById("timer-display-box");
            if (timerBox) {
              const m = Math.floor(this.examState.timeRemainingSeconds / 60);
              const s = this.examState.timeRemainingSeconds % 60;
              timerBox.innerHTML = `<span>${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</span>`;
              if (this.examState.timeRemainingSeconds <= 300) {
                timerBox.classList.add("warning");
              }
            }
          } else {
            // Time expired! Auto submit
            clearInterval(this.examTimerInterval);
            this.showToast("error", "Hết giờ làm bài! Bài thi đã được tự động nộp.");
            this.submitExam();
          }
        }
      }, 1000);
    }

    this.currentView = "exam";
    this.render();
  }

  selectExamOption(optId, optIdx) {
    const q = this.examState.activeQuestions[this.examState.currentIndex];
    if (!q) return;

    this.examState.userSelectedOptionIds[q.id] = optId;
    this.examState.userAnswers[q.id] = optIdx;
    this.render();
  }

  selectExamPart2Answers(questionId, subAnswers) {
    this.examState.userSelectedOptionIds[questionId] = subAnswers;
    this.examState.userAnswers[questionId] = subAnswers;
    this.render();
  }

  selectExamPart3Answer(questionId, shortAnswer) {
    this.examState.userSelectedOptionIds[questionId] = shortAnswer;
    this.examState.userAnswers[questionId] = shortAnswer;
  }

  submitExam() {
    if (this.examTimerInterval) {
      clearInterval(this.examTimerInterval);
      this.examTimerInterval = null;
    }

    const wrongIds = [];
    this.examState.activeQuestions.forEach(q => {
      const chosen = this.examState.userSelectedOptionIds[q.id];
      const scoreRes = scoreQuestion(q, chosen);
      if (!scoreRes.isFullyCorrect) {
        wrongIds.push(q.id);
      }
    });

    const prog = createQuizProgress({
      quizId: this.activeQuiz.id,
      currentIndex: 0,
      userAnswers: this.examState.userAnswers,
      userSelectedOptionIds: this.examState.userSelectedOptionIds,
      wrongQuestionIds: wrongIds,
      isCompleted: true
    });

    storage.saveProgress(this.activeProject.id, prog);
    this.openEndingModal(prog);
  }

  // --- 3D FLASHCARD MODE ---
  startFlashcard(quizId) {
    const project = this.getSelectedProject();
    if (!project) return;

    const quiz = project.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    telemetry.trackExamMode("flashcard");
    logger.action("Bắt đầu học thẻ ghi nhớ 3D", { quizId, title: quiz.title });

    this.activeProject = project;
    this.activeQuiz = quiz;

    const isLL = (quiz.quizType === "languageLearning" || project.projectType === "languageLearning") && quiz.vocabularies && quiz.vocabularies.length > 0;

    let prog = project.progressMap[quizId];
    if (!prog) {
      prog = createQuizProgress({ quizId: quiz.id });
      storage.saveProgress(project.id, prog);
    }

    const masteredSet = new Set(prog.flashcardMasteredIds || []);

    if (isLL) {
      const vocabs = [...quiz.vocabularies];
      this.flashcardState = {
        allVocabs: vocabs,
        vocabQueue: [...vocabs],
        currentVocab: vocabs[0] || null,
        vocabHistory: [],
        masteredIds: masteredSet,
        needReviewIds: new Set(),
        isFlipped: false,
        studyRound: 1,
        isCompleted: false,
        showNavPane: false,
        cefrFilter: "ALL"
      };
      if (vocabs.length > 0) {
        this.flashcardState.vocabQueue.shift();
      }
    } else {
      let questions = [...quiz.questions];
      if (storage.settings.isShuffleEnabled) {
        questions.sort(() => Math.random() - 0.5);
      }

      this.flashcardState = {
        allQuestions: questions,
        cardQueue: [...questions],
        currentCard: questions[0] || null,
        historyStack: [],
        masteredIds: masteredSet,
        needReviewIds: new Set(),
        isFlipped: false,
        studyRound: 1,
        isCompleted: false,
        showNavPane: false
      };
      if (questions.length > 0) {
        this.flashcardState.cardQueue.shift();
      }
    }

    this.currentView = "flashcard";
    this.render();
  }

  markFlashcard(isMastered) {
    const isLL = this.flashcardState.allVocabs !== undefined;
    const currentItem = isLL ? this.flashcardState.currentVocab : this.flashcardState.currentCard;
    if (!currentItem) return;

    if (isMastered) {
      this.flashcardState.masteredIds.add(currentItem.id);
      this.flashcardState.needReviewIds.delete(currentItem.id);
    } else {
      this.flashcardState.needReviewIds.add(currentItem.id);
    }

    // Save mastered to storage
    const prog = this.activeProject.progressMap[this.activeQuiz.id] || createQuizProgress({ quizId: this.activeQuiz.id });
    prog.flashcardMasteredIds = Array.from(this.flashcardState.masteredIds);
    storage.saveProgress(this.activeProject.id, prog);

    if (isLL) {
      this.flashcardState.vocabHistory.push(currentItem);
      if (this.flashcardState.vocabQueue.length > 0) {
        this.flashcardState.currentVocab = this.flashcardState.vocabQueue.shift();
        this.flashcardState.isFlipped = false;
      } else {
        this.flashcardState.isCompleted = true;
      }
    } else {
      this.flashcardState.historyStack.push(currentItem);
      if (this.flashcardState.cardQueue.length > 0) {
        this.flashcardState.currentCard = this.flashcardState.cardQueue.shift();
        this.flashcardState.isFlipped = false;
      } else {
        this.flashcardState.isCompleted = true;
      }
    }

    this.render();
  }

  prevFlashcard() {
    const isLL = this.flashcardState.allVocabs !== undefined;
    if (isLL) {
      if (this.flashcardState.vocabHistory.length > 0) {
        const prev = this.flashcardState.vocabHistory.pop();
        if (this.flashcardState.currentVocab) {
          this.flashcardState.vocabQueue.unshift(this.flashcardState.currentVocab);
        }
        this.flashcardState.currentVocab = prev;
        this.flashcardState.isFlipped = false;
        this.render();
      }
    } else {
      if (this.flashcardState.historyStack.length > 0) {
        const prev = this.flashcardState.historyStack.pop();
        if (this.flashcardState.currentCard) {
          this.flashcardState.cardQueue.unshift(this.flashcardState.currentCard);
        }
        this.flashcardState.currentCard = prev;
        this.flashcardState.isFlipped = false;
        this.render();
      }
    }
  }

  // --- MULTI-QUIZ ACTIONS ---
  startMultiStudy(mode) {
    const project = this.getSelectedProject();
    if (!project || !this.appState.selectedQuizIds || this.appState.selectedQuizIds.size === 0) return;

    const selectedQuizzes = project.quizzes.filter(q => this.appState.selectedQuizIds.has(q.id));
    const combinedQuestions = [];
    const combinedVocabs = [];

    selectedQuizzes.forEach(q => {
      combinedQuestions.push(...q.questions);
      if (q.vocabularies) combinedVocabs.push(...q.vocabularies);
    });

    const comboQuiz = createQuiz({
      id: "multi-combo-session",
      title: `Tổng hợp (${selectedQuizzes.length} bộ đề thi)`,
      questions: combinedQuestions,
      vocabularies: combinedVocabs,
      quizType: project.projectType
    });

    project.quizzes.push(comboQuiz);
    this.appState.isMultiSelectMode = false;
    this.appState.selectedQuizIds.clear();

    if (mode === "practice") {
      this.startPractice(comboQuiz.id);
    } else if (mode === "exam") {
      this.openExamTimerModal(comboQuiz.id);
    } else if (mode === "flashcard") {
      this.startFlashcard(comboQuiz.id);
    }
  }

  // --- MODALS ---
  openImportModal() {
    const proj = this.getSelectedProject();
    const isLL = proj?.projectType === "languageLearning";
    const isTHPT = proj?.projectType === "thptQuocGia";

    this.activeModal = "import";
    this.modalState = {
      activeTab: isTHPT ? "thpt" : (isLL ? "lang" : "gemini"),
      selectedFileName: "",
      selectedFileContent: "",
      quizTitle: "",
      isCreateMultipleChoice: false, // UNTICKED BY DEFAULT
      aiLanguage: storage.settings.language || "vi",
      depthMode: "normal",
      targetCEFR: "ALL",
      isScanning: false
    };
    this.render();
  }

  openSettingsModal() {
    this.activeModal = "settings";
    this.modalState = {
      apiKey: storage.settings.apiKey,
      theme: storage.settings.theme,
      fontSize: storage.settings.fontSize,
      uiScale: storage.settings.uiScale,
      language: storage.settings.language,
      isTestingKey: false,
      keyValidationResult: null
    };
    this.render();
  }

  openSetupWizard() {
    this.activeModal = "setupWizard";
    this.modalState = {
      step: 1,
      apiKey: storage.settings.apiKey,
      theme: storage.settings.theme,
      language: storage.settings.language,
      isTestingKey: false,
      keyValidationResult: null
    };
    this.render();
  }

  openEditorModal(quizId) {
    const project = this.getSelectedProject();
    if (!project) return;
    const quiz = project.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    this.activeModal = "editor";
    this.activeQuiz = quiz;
    this.modalState = {
      draftQuestions: JSON.parse(JSON.stringify(quiz.questions)),
      selectedQuestionIndex: 0
    };
    this.render();
  }

  openReviewModal(filter = "all", customProgress = null, customQuiz = null) {
    this.activeModal = "review";
    const targetQuiz = customQuiz || this.activeQuiz;
    const targetProg = customProgress || (this.activeProject?.progressMap && targetQuiz ? this.activeProject.progressMap[targetQuiz.id] : null) || {};
    this.modalState = {
      filterMode: filter,
      quiz: targetQuiz,
      progress: targetProg
    };
    this.render();
  }

  openEndingModal(customProgress = null, customQuiz = null) {
    this.activeModal = "ending";
    this.modalState = {
      progress: customProgress || this.activeProject?.progressMap[this.activeQuiz?.id] || {},
      quiz: customQuiz || this.activeQuiz
    };
    this.render();
  }

  openNationalAnthemModal() {
    this.activeModal = "nationalAnthem";
    this.modalState = {};
    this.render();
  }

  openAuthorEasterEggModal() {
    this.activeModal = "authorEasterEgg";
    this.modalState = {};
    this.render();
  }

  openFeedbackModal(initialSection = "bug", contextData = {}) {
    logger.action("Mở cửa sổ phản hồi & báo lỗi", { initialSection });
    this.activeModal = "feedback";
    this.modalState = {
      selectedSectionId: initialSection,
      subCategory: contextData.subCategory || null,
      title: contextData.title || "",
      message: contextData.message || "",
      contact: contextData.contact || "",
      includeLogs: initialSection === "bug",
      isSending: false
    };
    this.render();
  }

  async submitFeedback(payload) {
    this.modalState.isSending = true;
    this.render();

    let logs = null;
    let systemInfo = null;

    if (payload.includeLogs) {
      logs = logger.getFormattedDiagnostics();
      systemInfo = logger.getSystemInfo();
    }

    const endpoint = APP_CONFIG.telemetryUrl || "/api/telemetry";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "feedback",
          feedback: {
            sectionId: payload.sectionId,
            subCategory: payload.subCategory,
            title: payload.title,
            message: payload.message,
            contact: payload.contact,
            logs,
            systemInfo
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        logger.info("Gửi phản hồi thành công", { sectionId: payload.sectionId, title: payload.title });
        this.showToast("success", "Cảm ơn bạn! Phản hồi đã được gửi thành công.");
        this.closeModal();
      } else {
        logger.warn("Gửi phản hồi máy chủ từ chối", data);
        this.modalState.isSending = false;
        this.showToast("error", data.error || data.warning || "Không thể gửi phản hồi lúc này.");
        this.render();
      }
    } catch (err) {
      logger.error("Lỗi khi gửi phản hồi", { error: err.message });
      this.modalState.isSending = false;
      this.showToast("error", "Lỗi kết nối mạng khi gửi phản hồi.");
      this.render();
    }
  }

  openAskGemini(question) {
    this.activeModal = "askGemini";
    this.modalState = {
      question,
      userQuery: "",
      isQuerying: false,
      errorMessage: null,
      aiResponseText: question.explanation || null
    };
    this.render();
  }

  openQuizActionSheet(quizId) {
    const project = this.getSelectedProject();
    if (!project) return;
    const quiz = project.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    this.activeModal = "quizActionMenu";
    this.modalState = {
      quiz
    };
    this.render();
  }

  openProjectActionSheet(projectId) {
    const project = storage.projects.find(p => p.id === projectId);
    if (!project) return;

    this.activeModal = "projectActionMenu";
    this.modalState = {
      project
    };
    this.render();
  }

  openExamTimerModal(quizId) {
    const project = this.getSelectedProject();
    if (!project) return;
    const quiz = project.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    this.activeModal = "examTimer";
    this.modalState = {
      quiz,
      timerDurationMinutes: 15,
      isUnlimited: false
    };
    this.render();
  }

  openNewProjectModal() {
    this.activeModal = "newProject";
    this.modalState = {
      name: "",
      description: "",
      projectType: "general"
    };
    this.render();
  }

  closeModal() {
    this.activeModal = null;
    this.modalState = {};
    this.render();
  }

  // --- SCAN ACTIONS ---
  async handleGeminiScan() {
    const project = this.getSelectedProject();
    if (project.projectType === "languageLearning") {
      this.showToast("error", i18n.t("onlyInGeneralProjectNotice"));
      return;
    }

    if (!this.modalState.selectedFileContent) {
      this.showToast("error", "Vui lòng chọn tệp tài liệu trước khi quét.");
      return;
    }

    if (!storage.settings.apiKey) {
      this.showToast("error", "Vui lòng cấu hình Google AI Studio API Key trong Cài đặt.");
      this.openSettingsModal();
      return;
    }

    logger.action("Bắt đầu quét tài liệu bằng Gemini AI", {
      fileName: this.modalState.selectedFileName,
      isAutoGenerate: this.modalState.isCreateMultipleChoice,
      depthMode: this.modalState.depthMode
    });

    this.modalState.isScanning = true;
    this.modalState.scanProgress = 10;
    this.modalState.scanStatusText = "Đang chuẩn bị quét tài liệu...";
    this.render();

    try {
      const selectedAiLang = this.modalState.aiLanguage || storage.settings.language || "vi";
      const questions = await geminiService.generateQuiz({
        documentText: this.modalState.selectedFileContent,
        isCreateMultipleChoice: this.modalState.isCreateMultipleChoice,
        apiKey: storage.settings.apiKey,
        language: selectedAiLang,
        depthMode: this.modalState.depthMode,
        onProgress: (pct, msg) => this.updateScanProgress(pct, msg)
      });

      storage.settings.language = selectedAiLang;
      storage.saveSettings();

      if (!questions || questions.length === 0) {
        throw new Error("Không tìm thấy hoặc không tạo được câu hỏi nào từ tài liệu.");
      }

      const newQuiz = createQuiz({
        title: this.modalState.quizTitle || this.modalState.selectedFileName.replace(/\.[^/.]+$/, "") || "Bộ đề thi Gemini AI",
        questions,
        isPreMade: !this.modalState.isCreateMultipleChoice
      });

      storage.addQuiz(project.id, newQuiz);
      telemetry.trackAiFeature("questions_generated", questions.length);
      logger.info("Quét tài liệu thành công", { questionsCount: questions.length });
      this.showToast("success", `Đã xử lý thành công ${questions.length} câu hỏi trắc nghiệm!`);
      this.closeModal();
    } catch (e) {
      logger.error("Lỗi khi quét tài liệu Gemini AI", { error: e.message });
      this.modalState.isScanning = false;
      this.showToast("error", `Lỗi quét AI: ${e.message}`);
      this.render();
    }
  }

  async handleLanguageScan() {
    const project = this.getSelectedProject();
    if (project.projectType !== "languageLearning") {
      this.showToast("error", i18n.t("onlyInLLProjectNotice"));
      return;
    }

    if (!this.modalState.selectedFileContent) {
      this.showToast("error", "Vui lòng chọn tệp đề thi ngoại ngữ.");
      return;
    }

    if (!storage.settings.apiKey) {
      this.showToast("error", "Vui lòng cấu hình Google AI Studio API Key trong Cài đặt.");
      this.openSettingsModal();
      return;
    }

    logger.action("Bắt đầu quét đề thi ngoại ngữ", {
      fileName: this.modalState.selectedFileName,
      targetCEFR: this.modalState.targetCEFR
    });

    this.modalState.isScanning = true;
    this.modalState.scanProgress = 10;
    this.modalState.scanStatusText = "Đang chuẩn bị quét đề thi ngoại ngữ...";
    this.render();

    try {
      const result = await geminiService.generateLanguageExam({
        documentText: this.modalState.selectedFileContent,
        targetCEFR: this.modalState.targetCEFR,
        apiKey: storage.settings.apiKey,
        onProgress: (pct, msg) => this.updateScanProgress(pct, msg)
      });

      if (!result.questions || result.questions.length === 0) {
        throw new Error("Không tìm thấy câu hỏi nào trong đề thi.");
      }

      const newQuiz = createQuiz({
        title: this.modalState.quizTitle || this.modalState.selectedFileName.replace(/\.[^/.]+$/, "") || "Đề thi Ngoại ngữ",
        questions: result.questions,
        vocabularies: result.vocabularies,
        quizType: "languageLearning",
        targetCEFR: this.modalState.targetCEFR,
        durationMinutes: result.detectedDurationMinutes,
        isPreMade: true
      });

      storage.addQuiz(project.id, newQuiz);
      telemetry.trackAiFeature("questions_generated", result.questions.length);
      logger.info("Quét đề ngoại ngữ thành công", { questionsCount: result.questions.length, vocabsCount: result.vocabularies?.length || 0 });
      this.showToast("success", `Đã quét thành công ${result.questions.length} câu hỏi & ${result.vocabularies.length} thẻ từ vựng CEFR!`);
      this.closeModal();
    } catch (e) {
      logger.error("Lỗi khi quét đề thi ngoại ngữ", { error: e.message });
      this.modalState.isScanning = false;
      this.showToast("error", `Lỗi quét đề ngoại ngữ: ${e.message}`);
      this.render();
    }
  }

  async handleTHPTScan() {
    const project = this.getSelectedProject();
    if (!project) return;

    if (!this.modalState.selectedFileContent || !this.modalState.selectedFileContent.trim()) {
      this.showToast("error", "Vui lòng chọn một tệp đề thi THPT hợp lệ.");
      return;
    }

    if (!storage.settings.apiKey) {
      this.showToast("error", "Vui lòng cấu hình Google AI Studio API Key trong Cài đặt.");
      this.openSettingsModal();
      return;
    }

    logger.action("Bắt đầu quét đề thi THPT Quốc Gia", {
      fileName: this.modalState.selectedFileName
    });

    this.modalState.isScanning = true;
    this.modalState.scanProgress = 10;
    this.modalState.scanStatusText = "Đang chuẩn bị quét đề thi THPT Quốc gia...";
    this.render();

    try {
      let questions = [];
      const fileName = (this.modalState.selectedFile?.name || "").toLowerCase();
      
      if (fileName.endsWith(".pdf") && this.modalState.selectedFile) {
        if (this.updateScanProgress) this.updateScanProgress(15, "Đang trích xuất ảnh độ phân giải cao từ PDF...");
        const images = await documentParser.extractPdfAsImages(this.modalState.selectedFile, 2.0);
        
        if (this.updateScanProgress) this.updateScanProgress(40, "Đang phân tích PDF bằng Google Gemini Vision (có thể mất tới 1 phút)...");
        questions = await geminiService.generateTHPTQuiz({
          documentText: this.modalState.selectedFileContent,
          apiKey: storage.settings.apiKey,
          images: images,
          onProgress: (pct, msg) => this.updateScanProgress(pct, msg)
        });
      } else {
        questions = await geminiService.generateTHPTQuiz({
          documentText: this.modalState.selectedFileContent,
          apiKey: storage.settings.apiKey,
          onProgress: (pct, msg) => this.updateScanProgress(pct, msg)
        });
      }

      if (!questions || questions.length === 0) {
        throw new Error("Không tìm thấy câu hỏi nào trong đề thi.");
      }

      const newQuiz = createQuiz({
        title: this.modalState.quizTitle || this.modalState.selectedFileName.replace(/\.[^/.]+$/, "") || "Đề thi THPT Quốc gia",
        questions: questions,
        quizType: "thptQuocGia",
        isPreMade: true
      });

      storage.addQuiz(project.id, newQuiz);
      telemetry.trackAiFeature("questions_generated", questions.length);
      logger.info("Quét đề THPT thành công", { questionsCount: questions.length });
      this.showToast("success", `Đã quét thành công ${questions.length} câu hỏi theo cấu trúc THPT Quốc gia (3 Phần)!`);
      this.closeModal();
    } catch (e) {
      logger.error("Lỗi khi quét đề thi THPT", { error: e.message });
      this.modalState.isScanning = false;
      this.showToast("error", `Lỗi quét đề THPT: ${e.message}`);
      this.render();
    }
  }

  updateScanProgress(percent, message) {
    if (this.modalState) {
      this.modalState.scanProgress = percent;
      this.modalState.scanStatusText = message;
    }
    const bar = document.getElementById("scan-progress-bar");
    const status = document.getElementById("scan-progress-status");
    const pct = document.getElementById("scan-progress-percent");
    if (bar) bar.style.width = `${percent}%`;
    if (status) status.textContent = message;
    if (pct) pct.textContent = `${percent}%`;
  }

  async handlePremadeImport(file) {
    try {
      const quiz = await documentParser.extractQuizFromFile(file);
      const ext = file.name.split(".").pop();
      telemetry.trackDocumentImport(ext);
      const project = this.getSelectedProject();
      storage.addQuiz(project.id, quiz);
      this.showToast("success", `Đã nhập thành công bộ đề: ${quiz.title}`);
      this.closeModal();
    } catch (e) {
      this.showToast("error", `Lỗi nhập bộ đề: ${e.message}`);
    }
  }

  async handleAskGeminiQuery() {
    this.modalState.isQuerying = true;
    this.modalState.errorMessage = null;
    this.render();

    try {
      const answer = await geminiService.askQuestionDetail({
        question: this.modalState.question,
        userQuery: this.modalState.userQuery,
        apiKey: storage.settings.apiKey,
        language: storage.settings.language
      });

      telemetry.trackAiFeature("explanations_asked", 1);
      this.modalState.aiResponseText = answer;
      this.modalState.isQuerying = false;

      // Update question explanation
      storage.updateQuestionExplanation(this.modalState.question.id, answer);
      this.render();
    } catch (e) {
      this.modalState.isQuerying = false;
      this.modalState.errorMessage = e.message;
      this.render();
    }
  }

  // --- RENDER MAIN UI ---
  render() {
    const root = document.getElementById("app-root");
    if (!root) return;

    const project = this.getSelectedProject();

    // 1. Fullscreen Study Modes
    if (this.currentView === "practice" && this.practiceState && this.activeQuiz) {
      root.innerHTML = renderPracticeView(this.activeProject, this.activeQuiz, this.practiceState);
      bindPracticeEvents(this.activeProject, this.activeQuiz, this.practiceState, {
        onQuit: () => this.navigateToDashboard(),
        onSelectOption: (optId, optIdx) => this.selectPracticeOption(optId, optIdx),
        onSelectPart2Answers: (qId, subAnswers) => this.selectPracticePart2Answers(qId, subAnswers),
        onSelectPart3Answer: (qId, shortAns) => this.selectPracticePart3Answer(qId, shortAns),
        onNext: () => this.nextPracticeQuestion(),
        onJumpQuestion: (idx) => {
          this.practiceState.currentIndex = idx;
          this.render();
        },
        onAskGemini: (q) => this.openAskGemini(q),
        onToggleShuffle: () => {
          this.startPractice(this.activeQuiz.id);
        },
        onUpdateView: () => this.render()
      });
      this.renderActiveModal(root);
      return;
    }

    if (this.currentView === "exam" && this.examState && this.activeQuiz) {
      root.innerHTML = renderExamView(this.activeProject, this.activeQuiz, this.examState);
      bindExamEvents(this.activeProject, this.activeQuiz, this.examState, {
        onQuit: () => this.navigateToDashboard(),
        onSelectOption: (optId, optIdx) => this.selectExamOption(optId, optIdx),
        onSelectPart2Answers: (qId, subAnswers) => this.selectExamPart2Answers(qId, subAnswers),
        onSelectPart3Answer: (qId, shortAns) => this.selectExamPart3Answer(qId, shortAns),
        onPrev: () => {
          if (this.examState.currentIndex > 0) {
            this.examState.currentIndex--;
            this.render();
          }
        },
        onNext: () => {
          if (this.examState.currentIndex + 1 < this.examState.activeQuestions.length) {
            this.examState.currentIndex++;
            this.render();
          }
        },
        onJumpQuestion: (idx) => {
          this.examState.currentIndex = idx;
          this.render();
        },
        onSubmit: () => this.submitExam(),
        onToggleShuffle: () => this.startExam(this.activeQuiz.id),
        onUpdateView: () => this.render()
      });
      this.renderActiveModal(root);
      return;
    }

    if (this.currentView === "flashcard" && this.flashcardState && this.activeQuiz) {
      root.innerHTML = renderFlashcardView(this.activeProject, this.activeQuiz, this.flashcardState);
      bindFlashcardEvents(this.activeProject, this.activeQuiz, this.flashcardState, {
        onQuit: () => this.navigateToDashboard(),
        onFlip: (isFlipped) => {
          this.flashcardState.isFlipped = isFlipped;
        },
        onMark: (mastered) => this.markFlashcard(mastered),
        onPrev: () => this.prevFlashcard(),
        onChangeCEFR: (lvl) => {
          this.flashcardState.cefrFilter = lvl;
          const filtered = lvl === "ALL"
            ? this.activeQuiz.vocabularies
            : this.activeQuiz.vocabularies.filter(v => v.cefrLevel === lvl);
          this.flashcardState.allVocabs = filtered;
          this.flashcardState.vocabQueue = [...filtered];
          this.flashcardState.currentVocab = filtered[0] || null;
          if (filtered.length > 0) this.flashcardState.vocabQueue.shift();
          this.render();
        },
        onJump: (idx) => {
          const isLL = this.flashcardState.allVocabs !== undefined;
          if (isLL) {
            this.flashcardState.currentVocab = this.flashcardState.allVocabs[idx];
          } else {
            this.flashcardState.currentCard = this.flashcardState.allQuestions[idx];
          }
          this.flashcardState.isFlipped = false;
          this.render();
        },
        onContinueNextRound: () => {
          const isLL = this.flashcardState.allVocabs !== undefined;
          this.flashcardState.studyRound++;
          this.flashcardState.isCompleted = false;
          if (isLL) {
            const needReview = this.flashcardState.allVocabs.filter(v => this.flashcardState.needReviewIds.has(v.id));
            this.flashcardState.vocabQueue = [...needReview];
            this.flashcardState.currentVocab = needReview[0] || null;
            if (needReview.length > 0) this.flashcardState.vocabQueue.shift();
            this.flashcardState.vocabHistory = [];
          } else {
            const needReview = this.flashcardState.allQuestions.filter(q => this.flashcardState.needReviewIds.has(q.id));
            this.flashcardState.cardQueue = [...needReview];
            this.flashcardState.currentCard = needReview[0] || null;
            if (needReview.length > 0) this.flashcardState.cardQueue.shift();
            this.flashcardState.historyStack = [];
          }
          this.render();
        },
        onStudyAgain: () => {
          this.startFlashcard(this.activeQuiz.id);
        },
        onUpdateView: () => this.render()
      });
      this.renderActiveModal(root);
      return;
    }

    // 2. Default Dashboard View (Sidebar + Main)
    root.innerHTML = `
      <div class="sidebar-backdrop ${this.appState.isMobileSidebarOpen ? 'show' : ''}" id="sidebar-backdrop"></div>
      ${renderSidebar(this.selectedProjectId, this.appState)}
      ${renderDashboard(project, this.appState)}
    `;

    // Bind Sidebar Events
    bindSidebarEvents(this.appState,
      (pid) => {
        this.selectedProjectId = pid;
        this.appState.isMobileSidebarOpen = false;
        this.render();
      },
      () => this.openNewProjectModal(),
      () => this.openSettingsModal(),
      () => {
        this.appState.isMobileSidebarOpen = false;
        this.render();
      },
      () => this.openNationalAnthemModal(),
      (pid) => this.openProjectActionSheet(pid),
      () => this.openFeedbackModal("bug")
    );

    // Bind Dashboard Events
    if (project) {
      bindDashboardEvents(project, this.appState, {
        onToggleMobileSidebar: () => {
          this.appState.isMobileSidebarOpen = !this.appState.isMobileSidebarOpen;
          this.render();
        },
        onOpenSettings: () => this.openSettingsModal(),
        onToggleShuffle: () => {
          storage.settings.isShuffleEnabled = !storage.settings.isShuffleEnabled;
          storage.saveSettings();
          this.render();
        },
        onToggleMultiSelect: () => {
          this.appState.isMultiSelectMode = !this.appState.isMultiSelectMode;
          if (!this.appState.isMultiSelectMode) {
            this.appState.selectedQuizIds.clear();
          }
          this.render();
        },
        onSelectQuiz: (qid, checked) => {
          if (checked) this.appState.selectedQuizIds.add(qid);
          else this.appState.selectedQuizIds.delete(qid);
          this.render();
        },
        onMultiStudy: (mode) => this.startMultiStudy(mode),
        onMultiMove: () => this.openMultiMoveDialog(),
        onMultiDelete: () => {
          if (confirm(`Bạn có chắc chắn muốn xóa ${this.appState.selectedQuizIds.size} bộ đề đã chọn?`)) {
            storage.deleteQuizzes(project.id, Array.from(this.appState.selectedQuizIds));
            this.appState.selectedQuizIds.clear();
            this.showToast("success", "Đã xóa các bộ đề được chọn.");
            this.render();
          }
        },
        onOpenImport: () => this.openImportModal(),
        onStartPractice: (qid) => this.startPractice(qid),
        onStartExam: (qid) => this.openExamTimerModal(qid),
        onStartFlashcard: (qid) => this.startFlashcard(qid),
        onEditQuiz: (qid) => this.openEditorModal(qid),
        onOpenQuizMenu: (qid) => this.openQuizActionSheet(qid),
        onResetQuizProgress: (qid) => this.resetQuizProgress(qid)
      });
    }

    const backdrop = document.getElementById("sidebar-backdrop");
    if (backdrop) {
      backdrop.onclick = () => {
        this.appState.isMobileSidebarOpen = false;
        this.render();
      };
    }

    this.renderActiveModal(root);
  }

  renderActiveModal(root) {
    if (!this.activeModal) return;

    const modalHost = document.createElement("div");
    modalHost.id = "modal-host";

    if (this.activeModal === "feedback") {
      modalHost.innerHTML = renderFeedbackModal(this.modalState);
      root.appendChild(modalHost);
      bindFeedbackModalEvents(this.modalState, {
        onClose: () => this.closeModal(),
        onUpdateView: () => this.render(),
        onSubmit: (payload) => this.submitFeedback(payload)
      });
    } else if (this.activeModal === "import") {
      modalHost.innerHTML = renderImportModal(this.getSelectedProject(), this.modalState);
      root.appendChild(modalHost);
      bindImportModalEvents(this.modalState, {
        onClose: () => this.closeModal(),
        onSwitchTab: (tab) => {
          this.modalState.activeTab = tab;
          this.render();
        },
        onFileSelected: async (file) => {
          this.modalState.selectedFile = file;
          this.modalState.selectedFileName = file.name;
          const ext = file.name.split(".").pop();
          telemetry.trackDocumentImport(ext);
          this.modalState.selectedFileContent = await documentParser.extractTextFromFile(file);
          this.render();
        },
        onPremadeFileSelected: (file) => this.handlePremadeImport(file),
        onStartTHPTScan: () => this.handleTHPTScan(),
        onStartGeminiScan: () => this.handleGeminiScan(),
        onStartLanguageScan: () => this.handleLanguageScan(),
        onUpdateView: () => this.render()
      });
    } else if (this.activeModal === "settings") {
      modalHost.innerHTML = renderSettingsModal(this.modalState);
      root.appendChild(modalHost);
      bindSettingsEvents(this.modalState, {
        onClose: () => this.closeModal(),
        onSave: () => {
          storage.saveSettings({
            apiKey: this.modalState.apiKey,
            theme: this.modalState.theme,
            fontSize: this.modalState.fontSize,
            uiScale: this.modalState.uiScale,
            language: this.modalState.language
          });
          i18n.setLanguage(this.modalState.language);
          this.showToast("success", i18n.t("saveSettings"));
          this.closeModal();
        },
        onTestKey: async () => {
          this.modalState.isTestingKey = true;
          this.modalState.keyValidationResult = null;
          this.render();
          const valid = await geminiService.validateAPIKey(this.modalState.apiKey);
          this.modalState.isTestingKey = false;
          this.modalState.keyValidationResult = valid;
          this.render();
        },
        onExportDatabase: () => {
          const jsonStr = storage.exportDatabaseJSON();
          const blob = new Blob([jsonStr], { type: "application/json" });
          exporter.downloadBlob(blob, `QuizMaster_Database_Backup_${new Date().toISOString().slice(0,10)}.json`);
          this.showToast("success", "Đã xuất tệp sao lưu dữ liệu.");
        },
        onImportDatabase: async (file) => {
          const text = await file.text();
          const ok = storage.importDatabaseJSON(text);
          if (ok) {
            this.showToast("success", "Khôi phục dữ liệu thành công!");
            this.closeModal();
          } else {
            this.showToast("error", "Tệp sao lưu không đúng định dạng.");
          }
        },
        onReopenWizard: () => {
          this.openSetupWizard();
        },
        onOpenAuthorEasterEgg: () => {
          this.openAuthorEasterEggModal();
        },
        onOpenFeedback: () => {
          this.openFeedbackModal("general");
        },
        onUpdateView: () => this.render()
      });
    } else if (this.activeModal === "setupWizard") {
      modalHost.innerHTML = renderSetupWizardModal(this.modalState);
      root.appendChild(modalHost);
      bindSetupWizardEvents(this.modalState, {
        onNextStep: () => {
          this.modalState.step = Math.min(4, this.modalState.step + 1);
          this.render();
        },
        onPrevStep: () => {
          this.modalState.step = Math.max(1, this.modalState.step - 1);
          this.render();
        },
        onTestKey: async () => {
          this.modalState.isTestingKey = true;
          this.modalState.keyValidationResult = null;
          this.render();
          const valid = await geminiService.validateAPIKey(this.modalState.apiKey);
          this.modalState.isTestingKey = false;
          this.modalState.keyValidationResult = valid;
          this.render();
        },
        onFinish: () => {
          storage.saveSettings({
            apiKey: this.modalState.apiKey,
            theme: this.modalState.theme,
            language: this.modalState.language,
            hasCompletedFirstTimeSetup: true
          });
          i18n.setLanguage(this.modalState.language);
          this.showToast("success", "Cấu hình thành công!");
          this.closeModal();
        },
        onUpdateView: () => this.render()
      });
    } else if (this.activeModal === "editor") {
      modalHost.innerHTML = renderQuizEditorModal(this.activeQuiz, this.modalState);
      root.appendChild(modalHost);
      bindQuizEditorEvents(this.modalState, {
        onClose: () => this.closeModal(),
        onSave: () => {
          this.activeQuiz.questions = this.modalState.draftQuestions;
          storage.updateQuiz(this.getSelectedProject().id, this.activeQuiz);
          this.showToast("success", "Đã lưu thay đổi bộ câu hỏi!");
          this.closeModal();
        },
        onAddQuestion: () => {
          const newQ = createQuestion({ text: "Nội dung câu hỏi mới..." });
          this.modalState.draftQuestions.push(newQ);
          this.modalState.selectedQuestionIndex = this.modalState.draftQuestions.length - 1;
          this.render();
        },
        onDeleteQuestion: () => {
          if (this.modalState.draftQuestions.length <= 1) {
            this.showToast("error", "Bộ đề phải có ít nhất 1 câu hỏi.");
            return;
          }
          this.modalState.draftQuestions.splice(this.modalState.selectedQuestionIndex, 1);
          this.modalState.selectedQuestionIndex = Math.max(0, this.modalState.selectedQuestionIndex - 1);
          this.render();
        },
        onSelectQuestion: (idx) => {
          this.modalState.selectedQuestionIndex = idx;
          this.render();
        },
        onUpdateQuestionText: (txt) => {
          const q = this.modalState.draftQuestions[this.modalState.selectedQuestionIndex];
          if (q) q.text = txt;
        },
        onUpdateExplanation: (exp) => {
          const q = this.modalState.draftQuestions[this.modalState.selectedQuestionIndex];
          if (q) q.explanation = exp;
        },
        onUpdateOptionText: (optIdx, txt) => {
          const q = this.modalState.draftQuestions[this.modalState.selectedQuestionIndex];
          if (q && q.options[optIdx]) q.options[optIdx].text = txt;
        },
        onSetCorrectOption: (optIdx) => {
          const q = this.modalState.draftQuestions[this.modalState.selectedQuestionIndex];
          if (q) {
            q.correctAnswerIndex = optIdx;
            this.render();
          }
        }
      });
    } else if (this.activeModal === "review") {
      const targetQuiz = this.modalState.quiz || this.activeQuiz;
      const targetProg = this.modalState.progress || (this.activeProject?.progressMap && targetQuiz ? this.activeProject.progressMap[targetQuiz.id] : {}) || {};
      modalHost.innerHTML = renderReviewModal(targetQuiz, targetProg, this.modalState.filterMode);
      root.appendChild(modalHost);
      bindReviewEvents(
        (filter) => {
          this.modalState.filterMode = filter;
          this.render();
        },
        () => this.closeModal()
      );
    } else if (this.activeModal === "ending") {
      const targetQuiz = this.modalState.quiz || this.activeQuiz;
      const targetProgress = this.modalState.progress || {};
      const onRedoAction = () => {
        const wrongIds = new Set(targetProgress.wrongQuestionIds || []);
        const wrongQuestions = targetQuiz.questions.filter(q => wrongIds.has(q.id));
        if (wrongQuestions.length > 0) {
          this.closeModal();
          this.startPractice(targetQuiz.id, { questionsOverride: wrongQuestions, isRedo: true });
        } else {
          this.showToast("info", "Không có câu hỏi sai nào!");
        }
      };

      modalHost.innerHTML = renderEndingModal(
        targetQuiz,
        targetProgress,
        onRedoAction,
        () => {
          this.openReviewModal("all", this.activeProject?.progressMap[this.activeQuiz?.id] || targetProgress, this.activeQuiz);
        },
        () => {
          this.navigateToDashboard();
        }
      );
      root.appendChild(modalHost);
      bindEndingModalEvents(
        onRedoAction,
        () => this.openReviewModal("all", this.activeProject?.progressMap[this.activeQuiz?.id] || targetProgress, this.activeQuiz),
        () => this.navigateToDashboard()
      );
    } else if (this.activeModal === "nationalAnthem") {
      modalHost.innerHTML = renderNationalAnthemModal();
      root.appendChild(modalHost);
      bindNationalAnthemEvents(() => this.closeModal());
    } else if (this.activeModal === "authorEasterEgg") {
      modalHost.innerHTML = `
        <div class="modal-overlay open" id="author-easter-egg-overlay">
          <div class="modal-container" style="max-width: 480px; width: 100%;">
            <div class="modal-header">
              <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary);">
                Thông điệp từ tác giả
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-author-modal">✕</button>
            </div>
            <div class="modal-body" style="line-height: 1.6; font-size: var(--text-sm); color: var(--text-primary);">
              <p style="margin-bottom: 12px;"><em>"Chào bạn! Cảm ơn bạn đã sử dụng QuizMaster Web để phục vụ hành trình học tập và chinh phục tri thức."</em></p>
              <p style="color: var(--text-secondary); background: var(--bg-secondary); padding: 12px 16px; border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle);">
                [PLACEHOLDER: Lời nhắn đặc biệt từ tác giả sẽ được cập nhật tại đây]
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" id="btn-close-author-modal-confirm" style="width: 100%;">Đóng</button>
            </div>
          </div>
        </div>
      `;
      root.appendChild(modalHost);

      const closeAuthorModal = () => this.closeModal();
      document.getElementById("btn-close-author-modal").onclick = closeAuthorModal;
      document.getElementById("btn-close-author-modal-confirm").onclick = closeAuthorModal;
    } else if (this.activeModal === "askGemini") {
      modalHost.innerHTML = renderAskGeminiModal(this.modalState.question, this.modalState);
      root.appendChild(modalHost);
      bindAskGeminiEvents(this.modalState, {
        onClose: () => this.closeModal(),
        onSendQuery: () => this.handleAskGeminiQuery()
      });
    } else if (this.activeModal === "quizActionMenu") {
      const quiz = this.modalState.quiz;
      const project = this.getSelectedProject();
      modalHost.innerHTML = `
        <div class="modal-overlay open" id="action-sheet-overlay">
          <div class="modal-container" style="max-width: 480px; width: 100%;">
            <div class="modal-header">
              <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary);">
                Tùy chọn: ${escapeHtml(quiz.title)}
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-action-sheet">✕</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-secondary" id="btn-act-export-zip" style="justify-content: flex-start;">
                Xuất gói Zip Bundle (.zip) - Hỗ trợ nhập lại
              </button>
              <button class="btn btn-secondary" id="btn-act-export-docx" style="justify-content: flex-start;">
                Xuất tệp Word (.docx)
              </button>
              <button class="btn btn-secondary" id="btn-act-export-json" style="justify-content: flex-start;">
                Xuất tệp JSON (.json)
              </button>
              <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: 4px 0;">
              <button class="btn btn-secondary" id="btn-act-rename" style="justify-content: flex-start;">
                Đổi tên bộ đề thi
              </button>
              <button class="btn btn-secondary" id="btn-act-reset" style="justify-content: flex-start;">
                Đặt lại tiến độ học
              </button>
              <button class="btn btn-secondary" id="btn-act-delete" style="justify-content: flex-start; color: var(--color-coral-red);">
                Xóa bộ đề thi
              </button>
            </div>
          </div>
        </div>
      `;
      root.appendChild(modalHost);

      const closeSheet = () => this.closeModal();
      document.getElementById("btn-close-action-sheet").onclick = closeSheet;

      document.getElementById("btn-act-export-zip").onclick = () => {
        closeSheet();
        telemetry.trackExport("zip");
        exporter.exportQuizToZipBundle(quiz).then(file => {
          this.showToast("success", `Đã xuất gói Zip: ${file}`);
        });
      };

      document.getElementById("btn-act-export-docx").onclick = () => {
        closeSheet();
        telemetry.trackExport("docx");
        exporter.exportQuizToWordDocxZip(quiz).then(file => {
          this.showToast("success", `Đã xuất gói Word Docx: ${file}`);
        });
      };

      document.getElementById("btn-act-export-json").onclick = () => {
        closeSheet();
        telemetry.trackExport("json");
        const file = exporter.exportQuizJSON(quiz);
        this.showToast("success", `Đã xuất tệp JSON: ${file}`);
      };

      document.getElementById("btn-act-rename").onclick = () => {
        closeSheet();
        const newTitle = prompt("Nhập tên mới cho bộ đề thi:", quiz.title);
        if (newTitle && newTitle.trim()) {
          storage.renameQuiz(project.id, quiz.id, newTitle.trim());
          this.showToast("success", "Đã đổi tên bộ đề!");
          this.render();
        }
      };

      document.getElementById("btn-act-reset").onclick = () => {
        closeSheet();
        if (confirm(`Bạn có chắc chắn muốn đặt lại tiến độ học cho "${quiz.title}"?`)) {
          storage.resetQuizProgress(project.id, quiz.id);
          this.showToast("success", "Đã đặt lại tiến độ học!");
          this.render();
        }
      };

      document.getElementById("btn-act-delete").onclick = () => {
        closeSheet();
        if (confirm(`Bạn có chắc chắn muốn xóa bộ đề "${quiz.title}"?`)) {
          storage.deleteQuiz(project.id, quiz.id);
          this.showToast("success", "Đã xóa bộ đề thi!");
          this.render();
        }
      };
    } else if (this.activeModal === "projectActionMenu") {
      const project = this.modalState.project;
      modalHost.innerHTML = `
        <div class="modal-overlay open" id="action-sheet-overlay">
          <div class="modal-container" style="max-width: 480px; width: 100%;">
            <div class="modal-header">
              <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary);">
                Tùy chọn: ${escapeHtml(project.name)}
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-action-sheet">
                ${renderSF("xmark", { size: "14px" })}
              </button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-secondary" id="btn-proj-rename" style="justify-content: flex-start;">
                ${renderSF("square.and.pencil", { size: "14px" })} Đổi tên dự án
              </button>
              <button class="btn btn-secondary" id="btn-proj-reset" style="justify-content: flex-start;">
                ${renderSF("arrow.counterclockwise", { size: "14px" })} Đặt lại tiến độ học của dự án
              </button>
              <button class="btn btn-secondary" id="btn-proj-delete" style="justify-content: flex-start; color: var(--color-coral-red);">
                ${renderSF("trash", { size: "14px" })} Xóa dự án
              </button>
            </div>
          </div>
        </div>
      `;
      root.appendChild(modalHost);

      const closeSheet = () => this.closeModal();
      document.getElementById("btn-close-action-sheet").onclick = closeSheet;

      document.getElementById("btn-proj-rename").onclick = () => {
        closeSheet();
        const newName = prompt("Nhập tên mới cho dự án:", project.name);
        if (newName && newName.trim()) {
          project.name = newName.trim();
          storage.updateProject(project);
          this.showToast("success", "Đã đổi tên dự án!");
          this.render();
        }
      };

      document.getElementById("btn-proj-reset").onclick = () => {
        closeSheet();
        if (confirm(`Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ học của dự án "${project.name}"?`)) {
          project.progressMap = {};
          storage.updateProject(project);
          this.showToast("success", "Đã đặt lại tiến độ học của dự án!");
          this.render();
        }
      };

      document.getElementById("btn-proj-delete").onclick = () => {
        closeSheet();
        if (confirm(`Bạn có chắc chắn muốn xóa dự án "${project.name}"? Toàn bộ ${project.quizzes.length} bộ đề trong dự án sẽ bị xóa.`)) {
          storage.deleteProject(project.id);
          if (this.selectedProjectId === project.id) {
            this.selectedProjectId = storage.projects[0]?.id || null;
          }
          this.showToast("success", "Đã xóa dự án!");
          this.render();
        }
      };
    } else if (this.activeModal === "newProject") {
      modalHost.innerHTML = `
        <div class="modal-overlay open" id="new-project-overlay">
          <div class="modal-container" style="max-width: 520px; width: 100%;">
            <div class="modal-header">
              <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary);">
                ${i18n.t("newProjectTitle")}
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-new-project">
                ${renderSF("xmark", { size: "14px" })}
              </button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                  Tên dự án mới:
                </label>
                <input type="text" class="form-input" id="input-new-project-name" placeholder="${i18n.t("projectNamePlaceholder")}">
              </div>

              <div>
                <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">
                  Loại dự án:
                </label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <label class="glass-card" style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px;">
                    <input type="radio" name="project-type" value="general" checked style="width: 18px; height: 18px; accent-color: var(--color-ocean-blue);">
                    <div>
                      <div style="font-size: var(--text-sm); font-weight: 700; display: flex; align-items: center; gap: 6px;">
                        ${renderSF("folder", { size: "15px" })} <span>Dự án Ôn tập Chung</span>
                      </div>
                      <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px;">
                        Quét tài liệu bài giảng, giáo trình PDF/Word thành câu hỏi trắc nghiệm
                      </div>
                    </div>
                  </label>
                  <label class="glass-card" style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px;">
                    <input type="radio" name="project-type" value="languageLearning" style="width: 18px; height: 18px; accent-color: var(--color-deep-purple);">
                    <div>
                      <div style="font-size: var(--text-sm); font-weight: 700; display: flex; align-items: center; gap: 6px;">
                        ${renderSF("book.closed", { size: "15px" })} <span>Dự án Học Ngoại ngữ</span> <span class="badge badge-orange" style="font-size: 9px; padding: 1px 5px;">WIP</span>
                      </div>
                      <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px;">
                        Đọc hiểu song song, câu hỏi ngữ âm/từ vựng và thẻ từ vựng CEFR
                      </div>
                    </div>
                  </label>
                  <label class="glass-card" style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px;">
                    <input type="radio" name="project-type" value="thptQuocGia" style="width: 18px; height: 18px; accent-color: var(--color-deep-purple);">
                    <div>
                      <div style="font-size: var(--text-sm); font-weight: 700; display: flex; align-items: center; gap: 6px;">
                        ${renderSF("graduationcap", { size: "15px" })} <span>Dự án THPT Quốc gia (3 Phần)</span> <span class="badge badge-orange" style="font-size: 9px; padding: 1px 5px;">WIP</span>
                      </div>
                      <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px;">
                        Cấu trúc 3 Phần chuẩn Bộ GD&ĐT: Phần I (4 Lựa chọn), Phần II (Đúng/Sai 4 ý), Phần III (Trả lời ngắn)
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancel-new-project">${i18n.t("cancel")}</button>
              <button class="btn btn-primary" id="btn-confirm-new-project">${i18n.t("createProject")}</button>
            </div>
          </div>
        </div>
      `;
      root.appendChild(modalHost);

      document.getElementById("btn-close-new-project").onclick = () => this.closeModal();
      document.getElementById("btn-cancel-new-project").onclick = () => this.closeModal();
      document.getElementById("btn-confirm-new-project").onclick = () => {
        const nameInput = document.getElementById("input-new-project-name");
        const typeRadios = document.getElementsByName("project-type");
        let selectedType = "general";
        for (const r of typeRadios) {
          if (r.checked) selectedType = r.value;
        }

        if (nameInput && nameInput.value.trim()) {
          const newProj = storage.addProject(nameInput.value.trim(), "", selectedType);
          this.selectedProjectId = newProj.id;
          this.showToast("success", "Đã tạo dự án mới!");
          this.closeModal();
        } else {
          this.showToast("error", "Vui lòng nhập tên dự án.");
        }
      };
    } else if (this.activeModal === "examTimer") {
      const isUnlimited = !!this.modalState.isUnlimited;
      const curDuration = this.modalState.selectedDuration;
      const customMins = this.modalState.customMinutes || 45;

      modalHost.innerHTML = `
        <div class="modal-overlay open" id="exam-timer-overlay">
          <div class="modal-container" style="max-width: min(540px, 94vw); width: 100%; max-height: 90vh; max-height: 90dvh; display: flex; flex-direction: column;">
            <div class="modal-header">
              <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary);">
                ${i18n.t("customTimerTitle")}
              </div>
              <button class="btn btn-ghost btn-icon-only" id="btn-close-exam-timer">✕</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1;">
              <div style="font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.5;">
                ${i18n.t("mandatoryTimerSubtitle")}
              </div>

              <!-- Presets Grid -->
              <div class="glass-card" style="display: flex; flex-direction: column; gap: 10px;">
                <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">
                  CÁC TÙY CHỌN THỜI GIAN:
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                  <button class="btn ${!isUnlimited && curDuration === 15 ? 'btn-primary btn-orange' : 'btn-secondary'}" data-timer-val="15">
                    15 Phút
                  </button>
                  <button class="btn ${!isUnlimited && curDuration === 25 ? 'btn-primary btn-orange' : 'btn-secondary'}" data-timer-val="25">
                    Pomodoro (25p)
                  </button>
                  <button class="btn ${!isUnlimited && curDuration === 45 ? 'btn-primary btn-orange' : 'btn-secondary'}" data-timer-val="45">
                    45 Phút (Chuẩn)
                  </button>
                  <button class="btn ${!isUnlimited && curDuration === 60 ? 'btn-primary btn-orange' : 'btn-secondary'}" data-timer-val="60">
                    60 Phút
                  </button>
                  <button class="btn ${!isUnlimited && curDuration === 90 ? 'btn-primary btn-orange' : 'btn-secondary'}" data-timer-val="90">
                    90 Phút
                  </button>
                  <button class="btn ${isUnlimited ? 'btn-primary btn-purple' : 'btn-secondary'}" data-timer-val="unlimited">
                    Không giới hạn
                  </button>
                </div>
              </div>

              <!-- Custom Minutes Box -->
              ${!isUnlimited ? `
                <div class="glass-card" style="display: flex; flex-direction: column; gap: 8px;">
                  <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">
                    ${i18n.t("customTimerSubtitle")}
                  </label>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <input type="number" min="1" max="300" class="form-input" id="input-custom-timer-mins" value="${customMins}" style="flex: 1 1 120px; max-width: 160px; font-weight: 700;">
                    <span style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">phút</span>
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="modal-footer" style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <button class="btn btn-secondary" id="btn-cancel-exam-timer">${i18n.t("cancel")}</button>
              <button class="btn btn-primary btn-orange" id="btn-start-exam-now">
                ${i18n.t("examMode")} (${isUnlimited ? 'Không giới hạn' : `${this.modalState.selectedDuration} phút`})
              </button>
            </div>
          </div>
        </div>
      `;
      root.appendChild(modalHost);

      document.getElementById("btn-close-exam-timer").onclick = () => this.closeModal();
      document.getElementById("btn-cancel-exam-timer").onclick = () => this.closeModal();

      document.querySelectorAll("[data-timer-val]").forEach(btn => {
        btn.onclick = () => {
          const val = btn.dataset.timerVal;
          if (val === "unlimited") {
            this.modalState.isUnlimited = true;
            this.modalState.selectedDuration = null;
          } else {
            const mins = parseInt(val, 10);
            this.modalState.isUnlimited = false;
            this.modalState.selectedDuration = mins;
            this.modalState.customMinutes = mins;
          }
          this.render();
        };
      });

      const customInput = document.getElementById("input-custom-timer-mins");
      if (customInput) {
        customInput.oninput = (e) => {
          const val = parseInt(e.target.value, 10);
          if (val > 0) {
            this.modalState.customMinutes = val;
            this.modalState.selectedDuration = val;
            this.modalState.isUnlimited = false;
            const startBtn = document.getElementById("btn-start-exam-now");
            if (startBtn) {
              startBtn.innerText = `${i18n.t("examMode")} (${val} phút)`;
            }
          }
        };
      }

      document.getElementById("btn-start-exam-now").onclick = () => {
        const qid = this.modalState.quizId;
        const dur = this.modalState.isUnlimited ? null : this.modalState.selectedDuration;
        this.closeModal();
        this.startExam(qid, dur);
      };
    }
  }

  openMultiMoveDialog() {
    const project = this.getSelectedProject();
    if (!project) return;

    const otherProjects = storage.projects.filter(p => p.id !== project.id);
    if (otherProjects.length === 0) {
      alert("Chưa có dự án nào khác để chuyển. Hãy tạo dự án mới ở thanh bên trước.");
      return;
    }

    const eligibleProjects = otherProjects.filter(p => p.projectType === project.projectType);
    if (eligibleProjects.length === 0) {
      alert(i18n.t("cannotMoveAcrossTypes"));
      return;
    }

    const optionsText = eligibleProjects.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const choice = prompt(`Chọn dự án muốn chuyển ${this.appState.selectedQuizIds.size} bộ đề tới:\n\n${optionsText}\n\nNhập số thứ tự:`);
    const idx = parseInt(choice, 10) - 1;
    if (idx >= 0 && idx < eligibleProjects.length) {
      const targetProj = eligibleProjects[idx];
      storage.moveQuizzes(Array.from(this.appState.selectedQuizIds), project.id, targetProj.id);
      this.appState.selectedQuizIds.clear();
      this.appState.isMultiSelectMode = false;
      this.showToast("success", `Đã chuyển các bộ đề sang dự án "${targetProj.name}"!`);
      this.render();
    }
  }
}

// Bootstrap Application
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    window.quizMasterApp = new QuizMasterApp();
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
