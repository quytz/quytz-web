/**
 * QuizMaster Web - Local Storage & Persistence Service
 */
import { APP_CONFIG } from "../config.js";
import { createStudyProject, createQuiz, createQuestion, createQuestionOption, createVocabularyCard } from "../models/types.js";

class StorageService {
  constructor() {
    this.settings = this.loadSettings();
    this.projects = this.loadProjects();
    
    if (this.projects.length === 0) {
      this.projects = [this.createDemoGeneralProject(), this.createDemoLanguageProject()];
      this.saveProjects();
    }
  }

  loadSettings() {
    if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
      try {
        const raw = localStorage.getItem(APP_CONFIG.storageKeys.settings);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (e) {
        console.warn("Could not parse settings from localStorage:", e);
      }
    }
    return {
      apiKey: "",
      theme: "system",
      language: "vi",
      isShuffleEnabled: true,
      hasCompletedFirstTimeSetup: false
    };
  }

  saveSettings(newSettings = null) {
    if (newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    }
    if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
      try {
        localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(this.settings));
        this.applyThemeAndScale();
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
    }
  }

  loadProjects() {
    if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
      try {
        const raw = localStorage.getItem(APP_CONFIG.storageKeys.projects);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
        // Check backup
        const backup = localStorage.getItem(APP_CONFIG.storageKeys.backup);
        if (backup) {
          const parsedBackup = JSON.parse(backup);
          if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
            return parsedBackup;
          }
        }
      } catch (e) {
        console.warn("Could not load projects:", e);
      }
    }
    return [];
  }

  saveProjects() {
    if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
      try {
        const serialized = JSON.stringify(this.projects);
        localStorage.setItem(APP_CONFIG.storageKeys.projects, serialized);
        // Rolling backup
        localStorage.setItem(APP_CONFIG.storageKeys.backup, serialized);
      } catch (e) {
        console.error("Failed to save projects to localStorage:", e);
      }
    }
  }

  applyThemeAndScale() {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (this.settings.theme === "system") {
      root.setAttribute("data-theme", "system");
    } else {
      root.setAttribute("data-theme", this.settings.theme);
    }
  }

  // Helper Mutations
  addProject(name, description = "", projectType = "general") {
    const project = createStudyProject({ name, description, projectType });
    this.projects.push(project);
    this.saveProjects();
    return project;
  }

  updateProject(project) {
    const index = this.projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      this.projects[index] = project;
      this.saveProjects();
    }
  }

  deleteProject(id) {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjects();
  }

  addQuiz(projectId, quiz) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.quizzes.push(quiz);
      this.saveProjects();
    }
  }

  updateQuiz(projectId, quiz) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      const qIndex = project.quizzes.findIndex(q => q.id === quiz.id);
      if (qIndex !== -1) {
        project.quizzes[qIndex] = quiz;
        this.saveProjects();
      }
    }
  }

  deleteQuiz(projectId, quizId) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.quizzes = project.quizzes.filter(q => q.id !== quizId);
      if (project.progressMap[quizId]) {
        delete project.progressMap[quizId];
      }
      this.saveProjects();
    }
  }

  deleteQuizzes(projectId, quizIds) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      const set = new Set(quizIds);
      project.quizzes = project.quizzes.filter(q => !set.has(q.id));
      quizIds.forEach(qId => {
        if (project.progressMap[qId]) delete project.progressMap[qId];
      });
      this.saveProjects();
    }
  }

  renameQuiz(projectId, quizId, newTitle) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      const quiz = project.quizzes.find(q => q.id === quizId);
      if (quiz) {
        quiz.title = newTitle;
        this.saveProjects();
      }
    }
  }

  moveQuiz(quizId, fromProjectId, toProjectId) {
    if (fromProjectId === toProjectId) return;
    const fromProj = this.projects.find(p => p.id === fromProjectId);
    const toProj = this.projects.find(p => p.id === toProjectId);
    if (!fromProj || !toProj) return;

    const quizIndex = fromProj.quizzes.findIndex(q => q.id === quizId);
    if (quizIndex === -1) return;

    const [quiz] = fromProj.quizzes.splice(quizIndex, 1);
    const prog = fromProj.progressMap[quizId];
    if (prog) {
      delete fromProj.progressMap[quizId];
      toProj.progressMap[quizId] = prog;
    }
    toProj.quizzes.push(quiz);
    this.saveProjects();
  }

  moveQuizzes(quizIds, fromProjectId, toProjectId) {
    quizIds.forEach(id => this.moveQuiz(id, fromProjectId, toProjectId));
  }

  resetProjectProgress(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.progressMap = {};
      this.saveProjects();
    }
  }

  resetQuizProgress(projectId, quizId) {
    const project = this.projects.find(p => p.id === projectId);
    if (project && project.progressMap[quizId]) {
      delete project.progressMap[quizId];
      this.saveProjects();
    }
  }

  saveProgress(projectId, progress) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.progressMap[progress.quizId] = progress;
      project.lastStudiedAt = new Date().toISOString();
      this.saveProjects();
    }
  }

  updateQuestionExplanation(questionId, explanation) {
    for (const project of this.projects) {
      for (const quiz of project.quizzes) {
        const question = quiz.questions.find(q => q.id === questionId);
        if (question) {
          question.explanation = explanation;
          this.saveProjects();
          return;
        }
      }
    }
  }

  // Export / Import Full Database Backup
  exportDatabaseJSON() {
    return JSON.stringify({
      version: APP_CONFIG.version,
      exportedAt: new Date().toISOString(),
      settings: this.settings,
      projects: this.projects
    }, null, 2);
  }

  importDatabaseJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.projects)) {
        this.projects = data.projects;
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
          this.saveSettings();
        }
        this.saveProjects();
        return true;
      }
    } catch (e) {
      console.error("Failed to import database JSON:", e);
    }
    return false;
  }

  // Demo Project Creators
  createDemoGeneralProject() {
    const demoQuestions = [
      createQuestion({
        text: "Thủ đô của Việt Nam là thành phố nào?",
        options: [
          createQuestionOption("A", "Thành phố Hồ Chí Minh"),
          createQuestionOption("B", "Hà Nội"),
          createQuestionOption("C", "Đà Nẵng"),
          createQuestionOption("D", "Hải Phòng")
        ],
        correctAnswerIndex: 1,
        explanation: "Hà Nội là thủ đô, trung tâm chính trị và văn hóa của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam."
      }),
      createQuestion({
        text: "QuizMaster Web sử dụng công nghệ nào để đảm bảo ứng dụng có thể chạy không tốn chi phí hosting?",
        options: [
          createQuestionOption("A", "Client-Side Processing (Toàn bộ tác vụ OCR, AI và lưu trữ chạy trên trình duyệt người dùng)"),
          createQuestionOption("B", "Cụm máy chủ Kubernetes đắt tiền"),
          createQuestionOption("C", "Cơ sở dữ liệu đám mây trả phí hàng tháng"),
          createQuestionOption("D", "Hệ thống backend trung gian lưu dữ liệu riêng tư")
        ],
        correctAnswerIndex: 0,
        explanation: "QuizMaster Web được thiết kế theo kiến trúc Client-First, mọi dữ liệu lưu offline trong IndexedDB / LocalStorage của người dùng, gọi trực tiếp Gemini API và xuất file hoàn toàn trên client."
      }),
      createQuestion({
        text: "Khi trả lời sai một câu hỏi trong chế độ Luyện tập (Practice), câu hỏi đó sẽ được xử lý như thế nào?",
        options: [
          createQuestionOption("A", "Bị xóa khỏi bài thi"),
          createQuestionOption("B", "Lưu lại để người dùng làm lại hoặc ôn tập ở cuối bài"),
          createQuestionOption("C", "Tính điểm âm ngay lập tức"),
          createQuestionOption("D", "Tự động đổi sang câu hỏi mới")
        ],
        correctAnswerIndex: 1,
        explanation: "Ứng dụng sẽ lưu các câu làm sai để người dùng có thể làm lại riêng các câu sai hoặc xem giải thích chi tiết sau khi hoàn thành toàn bộ bài thi."
      })
    ];

    const demoQuiz = createQuiz({
      title: "Bộ câu hỏi Mẫu - Kiến thức Cơ bản & Hướng dẫn",
      description: "Bộ câu hỏi trắc nghiệm thử nghiệm giao diện và các tính năng của QuizMaster",
      questions: demoQuestions,
      isPreMade: true
    });

    return createStudyProject({
      name: "Dự án Mẫu (Sample Project)",
      description: "Dự án ôn tập có sẵn để trải nghiệm ứng dụng QuizMaster",
      quizzes: [demoQuiz]
    });
  }

  createDemoLanguageProject() {
    const readingPassage = `Urbanization is the process by which large numbers of people permanently concentrate in relatively small areas, forming cities. While urbanization has accelerated economic development and created millions of jobs worldwide, it presents major environmental and infrastructural challenges.

In many developing mega-cities, rapid population growth has outpaced the development of housing, clean water supplies, and public transportation. Consequently, urban sprawl often leads to severe traffic congestion, elevated air pollution, and the expansion of informal settlements. To mitigate these adverse impacts, modern urban planners advocate for smart green cities that prioritize walkable neighborhoods, efficient mass transit networks, and renewable energy grids.`;

    const questions = [
      createQuestion({
        text: "Mark the letter A, B, C, or D to indicate the word whose underlined part differs from the other three in pronunciation:\n\n1. A. **st**op   B. po**st**   C. **st**ar   D. li**st**en",
        options: [
          createQuestionOption("A", "stop"),
          createQuestionOption("B", "post"),
          createQuestionOption("C", "star"),
          createQuestionOption("D", "listen")
        ],
        correctAnswerIndex: 3,
        explanation: "Phần gạch chân của 'listen' là âm câm /t/, các từ còn lại phát âm là /st/.",
        skill: "lexical",
        subTopic: "Phát âm"
      }),
      createQuestion({
        text: "According to paragraph 2, what is one of the primary consequences when population growth outpaces urban infrastructure?",
        options: [
          createQuestionOption("A", "Severe traffic congestion and elevated air pollution"),
          createQuestionOption("B", "Immediate decrease in global economic productivity"),
          createQuestionOption("C", "A complete cessation of all industrial manufacturing"),
          createQuestionOption("D", "The total abandonment of inner-city districts")
        ],
        correctAnswerIndex: 0,
        explanation: "Đoạn 2 nêu rõ: 'Consequently, urban sprawl often leads to severe traffic congestion, elevated air pollution...'",
        skill: "reading",
        subTopic: "Đọc hiểu",
        readingPassage: readingPassage
      }),
      createQuestion({
        text: "The word **mitigate** in paragraph 2 is closest in meaning to:",
        options: [
          createQuestionOption("A", "alleviate / lessen"),
          createQuestionOption("B", "exacerbate / worsen"),
          createQuestionOption("C", "eliminate permanently"),
          createQuestionOption("D", "ignore completely")
        ],
        correctAnswerIndex: 0,
        explanation: "'Mitigate' có nghĩa là giảm nhẹ, làm dịu bớt mức độ nghiêm trọng (đồng nghĩa với 'alleviate' hoặc 'lessen').",
        skill: "reading",
        subTopic: "Từ vựng ngữ cảnh",
        readingPassage: readingPassage
      })
    ];

    const vocabularies = [
      createVocabularyCard({
        word: "urban sprawl",
        wordType: "n",
        phonetic: "/ˌɜː.bən ˈsprɔːl/",
        vietnameseMeaning: "Sự mở rộng đô thị tự phát, không kiểm soát",
        exampleSentence: "Rapid **urban sprawl** has consumed vast areas of agricultural land.",
        cefrLevel: "C1"
      }),
      createVocabularyCard({
        word: "mitigate",
        wordType: "v",
        phonetic: "/ˈmɪt.ɪ.ɡeɪt/",
        vietnameseMeaning: "Giảm nhẹ, làm dịu bớt hậu quả",
        exampleSentence: "Government policies aim to **mitigate** the effects of air pollution.",
        cefrLevel: "B2"
      }),
      createVocabularyCard({
        word: "call off",
        wordType: "phr v",
        phonetic: "/kɔːl ɒf/",
        vietnameseMeaning: "Hủy bỏ (sự kiện, cuộc họp)",
        exampleSentence: "The outdoor festival was **called off** due to heavy rain.",
        cefrLevel: "B1"
      })
    ];

    const demoQuiz = createQuiz({
      title: "Đề thi Tiếng Anh THPT Mẫu - Reading & Lexical",
      description: "Đề thi ngoại ngữ mẫu minh họa chia đoạn đọc hiểu song song & thẻ Flashcard CEFR",
      questions: questions,
      isPreMade: true,
      quizType: "languageLearning",
      targetCEFR: "B2",
      vocabularies: vocabularies,
      durationMinutes: 45
    });

    return createStudyProject({
      name: "Dự án Ngoại ngữ Mẫu (THPT & IELTS)",
      description: "Dự án luyện thi tiếng Anh phân tích kỹ năng đọc hiểu và từ vựng",
      projectType: "languageLearning",
      quizzes: [demoQuiz]
    });
  }
}

export const storage = new StorageService();
