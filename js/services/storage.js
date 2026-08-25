/**
 * QuizMaster Web - Local Storage & Persistence Service
 */
import { APP_CONFIG } from "../config.js";
import { createStudyProject, createQuiz, createQuestion, createQuestionOption, createSubItem, createVocabularyCard } from "../models/types.js";

class StorageService {
  constructor() {
    this.settings = this.loadSettings();
    this.projects = this.loadProjects();
    
    if (this.projects.length === 0) {
      this.projects = [this.createDemoGeneralProject(), this.createDemoLanguageProject(), this.createDemoTHPTProject()];
      this.saveProjects();
    } else {
      const hasTHPT = this.projects.some(p => p.projectType === "thptQuocGia");
      if (!hasTHPT) {
        this.projects.push(this.createDemoTHPTProject());
        this.saveProjects();
      }
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

  createDemoTHPTProject() {
    const questions = [
      // PHẦN I: Trắc nghiệm 4 lựa chọn (0.25đ / câu)
      createQuestion({
        part: "part1",
        questionType: "multipleChoice",
        pointValue: 0.25,
        text: "**Câu 1.** Cho hàm số $y = f(x)$ có bảng xét dấu đạo hàm như sau:\n\n| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $f'(x)$ | | $+$ | $0$ | $-$ | $0$ | $+$ | |\n\nHàm số đã cho đồng biến trên khoảng nào dưới đây?",
        options: [
          createQuestionOption("A", "(-1; 2)"),
          createQuestionOption("B", "$(2; +\\infty)$"),
          createQuestionOption("C", "$(-\\infty; 2)$"),
          createQuestionOption("D", "$(-1; +\\infty)$")
        ],
        correctAnswerIndex: 1,
        explanation: "Dựa vào bảng xét dấu đạo hàm, ta thấy $f'(x) > 0$ trên các khoảng $(-\\infty; -1)$ và $(2; +\\infty)$. Do đó hàm số đồng biến trên $(2; +\\infty)$."
      }),
      createQuestion({
        part: "part1",
        questionType: "multipleChoice",
        pointValue: 0.25,
        text: "**Câu 2.** Trong không gian $Oxyz$, cho mặt cầu $(S): (x-1)^2 + (y+2)^2 + (z-3)^2 = 16$. Tọa độ tâm $I$ và bán kính $R$ của mặt cầu $(S)$ là:",
        options: [
          createQuestionOption("A", "I(1; -2; 3), R = 4"),
          createQuestionOption("B", "I(-1; 2; -3), R = 4"),
          createQuestionOption("C", "I(1; -2; 3), R = 16"),
          createQuestionOption("D", "I(-1; 2; -3), R = 16")
        ],
        correctAnswerIndex: 0,
        explanation: "Phương trình mặt cầu dạng $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$ có tâm $I(a; b; c) = (1; -2; 3)$ và bán kính $R = \\sqrt{16} = 4$."
      }),
      createQuestion({
        part: "part1",
        questionType: "multipleChoice",
        pointValue: 0.25,
        text: "**Câu 3.** Tập nghiệm của bất phương trình $\\log_2(x - 1) < 3$ là:",
        options: [
          createQuestionOption("A", "(1; 9)"),
          createQuestionOption("B", "(-∞; 9)"),
          createQuestionOption("C", "(1; 7)"),
          createQuestionOption("D", "(1; +∞)")
        ],
        correctAnswerIndex: 0,
        explanation: "Điều kiện xác định: $x - 1 > 0 \\Leftrightarrow x > 1$.\nBPT $\\Leftrightarrow x - 1 < 2^3 = 8 \\Leftrightarrow x < 9$.\nKết hợp điều kiện ta được tập nghiệm $S = (1; 9)$."
      }),
      createQuestion({
        part: "part1",
        questionType: "multipleChoice",
        pointValue: 0.25,
        text: "**Câu 4.** Cho khối chóp có diện tích đáy $B = 6a^2$ và chiều cao $h = 2a$. Thể tích của khối chóp đã cho bằng:",
        options: [
          createQuestionOption("A", "4a³"),
          createQuestionOption("B", "12a³"),
          createQuestionOption("C", "2a³"),
          createQuestionOption("D", "6a³")
        ],
        correctAnswerIndex: 0,
        explanation: "Công thức thể tích khối chóp là $V = \\frac{1}{3}Bh = \\frac{1}{3} \\cdot 6a^2 \\cdot 2a = 4a^3$."
      }),

      // PHẦN II: Trắc nghiệm Đúng / Sai (4 ý a, b, c, d - Tối đa 1.0đ)
      createQuestion({
        part: "part2",
        questionType: "trueFalseGroup",
        pointValue: 1.0,
        text: "**Câu 1.** Cho hàm số bậc ba $f(x) = x^3 - 3x^2 + 2$. Xét tính đúng/sai của các mệnh đề sau:",
        subItems: [
          createSubItem("a", "Đạo hàm của hàm số là f'(x) = 3x² - 6x.", true),
          createSubItem("b", "Hàm số đạt cực đại tại điểm x = 2.", false),
          createSubItem("c", "Giá trị cực tiểu của hàm số bằng -2.", true),
          createSubItem("d", "Đồ thị hàm số đi qua điểm M(1; 0).", true)
        ],
        explanation: "• a) Đúng vì $f'(x) = 3x^2 - 6x$.\n• b) Sai vì $f'(x) = 0 \\Leftrightarrow x = 0$ (cực đại) hoặc $x = 2$ (cực tiểu).\n• c) Đúng vì $y_{CT} = f(2) = 2^3 - 3(2^2) + 2 = -2$.\n• d) Đúng vì $f(1) = 1 - 3 + 2 = 0$ nên $M(1; 0)$ thuộc đồ thị."
      }),
      createQuestion({
        part: "part2",
        questionType: "trueFalseGroup",
        pointValue: 1.0,
        text: "**Câu 2.** Trong không gian $Oxyz$, cho hai điểm $A(1; 2; 3)$, $B(3; 0; 1)$ và mặt phẳng $(P): x + 2y - 2z + 1 = 0$. Xét tính đúng/sai của các mệnh đề sau:",
        subItems: [
          createSubItem("a", "Tọa độ vectơ $\\vec{AB} = (2; -2; -2)$.", true),
          createSubItem("b", "Trung điểm M của đoạn thẳng AB có tọa độ M(2; 1; 2).", true),
          createSubItem("c", "Khoảng cách từ điểm A đến mặt phẳng (P) bằng 2.", false),
          createSubItem("d", "Điểm A thuộc mặt phẳng (P).", true)
        ],
        explanation: "• a) Đúng: $\\vec{AB} = (3-1; 0-2; 1-3) = (2; -2; -2)$.\n• b) Đúng: $M = \\left(\\frac{1+3}{2}; \\frac{2+0}{2}; \\frac{3+1}{2}\\right) = (2; 1; 2)$.\n• c) Sai: Thay tọa độ $A(1;2;3)$ vào vế trái $(P)$ ta được $1 + 2(2) - 2(3) + 1 = 0$, do đó $d(A, P) = 0$.\n• d) Đúng: Vì $d(A, P) = 0$ nên điểm $A$ nằm trên mặt phẳng $(P)$."
      }),

      // PHẦN III: Trắc nghiệm trả lời ngắn (0.25đ / 0.5đ / câu)
      createQuestion({
        part: "part3",
        questionType: "shortAnswer",
        pointValue: 0.5,
        text: "**Câu 1.** Một người gửi 100 triệu đồng vào ngân hàng với lãi suất 6%/năm theo hình thức lãi kép hàng năm. Sau đúng 2 năm, số tiền lãi người đó nhận được là bao nhiêu triệu đồng? *(Nhập kết quả làm tròn 2 chữ số thập phân)*",
        shortAnswer: "12.36",
        acceptedAnswers: ["12.36", "12,36", "12.36 triệu", "12,36 triệu"],
        explanation: "Tổng số tiền cả gốc lẫn lãi sau 2 năm: $S = 100 \\times (1 + 0.06)^2 = 112.36$ triệu đồng.\nSố tiền lãi nhận được là $112.36 - 100 = 12.36$ triệu đồng."
      }),
      createQuestion({
        part: "part3",
        questionType: "shortAnswer",
        pointValue: 0.5,
        text: "**Câu 2.** Cho hình hộp chữ nhật $ABCD.A'B'C'D'$ có đáy $ABCD$ là hình vuông cạnh $a = 1$, cạnh bên $AA' = 2$. Tính thể tích khối chóp $A'.ABCD$. *(Nhập kết quả dưới dạng số thập phân làm tròn 2 chữ số hoặc phân số tối giản a/b)*",
        shortAnswer: "0.67",
        acceptedAnswers: ["0.67", "0,67", "2/3", "0.667"],
        explanation: "Diện tích đáy $S_{ABCD} = 1^2 = 1$. Chiều cao $h = AA' = 2$.\nThể tích khối chóp $V = \\frac{1}{3} \\cdot S \\cdot h = \\frac{1}{3} \\cdot 1 \\cdot 2 = \\frac{2}{3} \\approx 0.67$."
      })
    ];

    const demoQuiz = createQuiz({
      title: "Đề thi Minh họa THPT Quốc gia 2026 - Môn Toán",
      description: "Đề thi chuẩn cấu trúc 3 phần mới của Bộ Giáo dục & Đào tạo (Phần I: 4 Lựa chọn, Phần II: Đúng/Sai 4 ý, Phần III: Trả lời ngắn)",
      questions: questions,
      isPreMade: true,
      quizType: "thptQuocGia",
      durationMinutes: 90
    });

    return createStudyProject({
      name: "Dự án Luyện thi THPT Quốc gia (3 Phần Chuẩn)",
      description: "Luyện đề theo cấu trúc phân tầng mới của Bộ GD&ĐT với thang điểm 10.0",
      projectType: "thptQuocGia",
      quizzes: [demoQuiz]
    });
  }
}

export const storage = new StorageService();

