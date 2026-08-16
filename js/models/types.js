/**
 * QuizMaster Web - Data Models & Factories
 */

export const CEFR_LEVELS = {
  ALL: { id: "ALL", label: "Tất cả trình độ (A1 - C2)", badge: "CEFR All" },
  A1: { id: "A1", label: "A1 - Căn bản (Beginner)", badge: "CEFR A1" },
  A2: { id: "A2", label: "A2 - Sơ cấp (Elementary)", badge: "CEFR A2" },
  B1: { id: "B1", label: "B1 - Trung cấp (Intermediate)", badge: "CEFR B1" },
  B2: { id: "B2", label: "B2 - Trung cấp trên (Upper Intermediate)", badge: "CEFR B2" },
  C1: { id: "C1", label: "C1 - Cao cấp (Advanced)", badge: "CEFR C1" },
  C2: { id: "C2", label: "C2 - Thành thạo (Proficiency)", badge: "CEFR C2" }
};

export const LANGUAGE_SKILLS = {
  reading: { id: "reading", name: "Đọc hiểu (Reading)", icon: "📖" },
  listening: { id: "listening", name: "Nghe hiểu (Listening)", icon: "🎧" },
  lexical: { id: "lexical", name: "Ngữ pháp & Từ vựng (Lexical)", icon: "✏️" },
  general: { id: "general", name: "Tổng hợp", icon: "📝" }
};

export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function createQuestionOption(label = "A", text = "", id = null) {
  return {
    id: id || generateUUID(),
    label,
    text
  };
}

export function createQuestion({
  id = null,
  text = "",
  options = [],
  correctAnswerIndex = 0,
  explanation = "",
  skill = null,
  readingPassage = null,
  subTopic = null,
  sectionIndex = null
} = {}) {
  const finalOptions = (options && options.length > 0)
    ? options.map((opt, i) => ({
        id: opt.id || generateUUID(),
        label: opt.label || ["A", "B", "C", "D", "E", "F"][i] || `${i + 1}`,
        text: opt.text || ""
      }))
    : [
        createQuestionOption("A", ""),
        createQuestionOption("B", ""),
        createQuestionOption("C", ""),
        createQuestionOption("D", "")
      ];

  return {
    id: id || generateUUID(),
    text,
    options: finalOptions,
    correctAnswerIndex: (correctAnswerIndex >= 0 && correctAnswerIndex < finalOptions.length) ? correctAnswerIndex : 0,
    explanation,
    skill,
    readingPassage,
    subTopic,
    sectionIndex
  };
}

export function shuffleQuestionOptions(question) {
  if (!question.options || question.options.length <= 1) return question;
  
  // FIX: In JavaScript, array length is .length (not .count from Swift)
  const correctOpt = (question.correctAnswerIndex >= 0 && question.correctAnswerIndex < question.options.length)
    ? question.options[question.correctAnswerIndex]
    : question.options[0];
  
  const shuffled = [...question.options].sort(() => Math.random() - 0.5);
  const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
  
  const relabeled = shuffled.map((opt, idx) => ({
    id: opt.id,
    label: idx < labels.length ? labels[idx] : `${idx + 1}`,
    text: opt.text
  }));
  
  const newCorrectIndex = relabeled.findIndex(opt => opt.id === correctOpt.id);
  
  return {
    ...question,
    options: relabeled,
    correctAnswerIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0
  };
}

export function createVocabularyCard({
  id = null,
  word = "",
  wordType = "",
  phonetic = "",
  vietnameseMeaning = "",
  exampleSentence = "",
  cefrLevel = "B1"
} = {}) {
  return {
    id: id || generateUUID(),
    word,
    wordType,
    phonetic,
    vietnameseMeaning,
    exampleSentence,
    cefrLevel
  };
}

export function createQuiz({
  id = null,
  title = "Bộ câu hỏi mới",
  description = "",
  questions = [],
  createdAt = new Date().toISOString(),
  isPreMade = false,
  quizType = "general",
  targetCEFR = null,
  vocabularies = [],
  durationMinutes = null
} = {}) {
  return {
    id: id || generateUUID(),
    title,
    description,
    questions,
    createdAt,
    isPreMade,
    quizType,
    targetCEFR,
    vocabularies,
    durationMinutes
  };
}

export function createQuizProgress({
  id = null,
  quizId = "",
  currentIndex = 0,
  userAnswers = {},
  userSelectedOptionIds = {},
  wrongQuestionIds = [],
  flashcardMasteredIds = [],
  isCompleted = false,
  startTime = new Date().toISOString(),
  endTime = null,
  shuffledQuestions = null,
  completedSectionIndices = []
} = {}) {
  return {
    id: id || generateUUID(),
    quizId,
    currentIndex,
    userAnswers,
    userSelectedOptionIds,
    wrongQuestionIds: Array.isArray(wrongQuestionIds) ? wrongQuestionIds : Array.from(wrongQuestionIds || []),
    flashcardMasteredIds: Array.isArray(flashcardMasteredIds) ? flashcardMasteredIds : Array.from(flashcardMasteredIds || []),
    isCompleted,
    startTime,
    endTime,
    shuffledQuestions,
    completedSectionIndices
  };
}

export function createStudyProject({
  id = null,
  name = "Dự án mới",
  description = "",
  projectType = "general",
  quizzes = [],
  progressMap = {},
  createdAt = new Date().toISOString(),
  lastStudiedAt = null
} = {}) {
  return {
    id: id || generateUUID(),
    name,
    description,
    projectType,
    quizzes,
    progressMap,
    createdAt,
    lastStudiedAt
  };
}

export function calculateProjectStats(project) {
  const totalQuestions = project.quizzes.reduce((acc, q) => acc + (q.questions ? q.questions.length : 0), 0);
  if (totalQuestions === 0) return { totalQuestions: 0, masteryPercentage: 0 };

  let totalMastered = 0;
  project.quizzes.forEach(quiz => {
    const prog = project.progressMap[quiz.id];
    if (prog) {
      const correctInQuiz = Object.entries(prog.userAnswers || {}).filter(([qId, ansIdx]) => {
        const q = quiz.questions.find(item => item.id === qId);
        return q && q.correctAnswerIndex === ansIdx;
      }).length;
      totalMastered += Math.max(correctInQuiz, (prog.flashcardMasteredIds || []).length);
    }
  });

  const masteryPercentage = Math.min(100, Math.round((totalMastered / totalQuestions) * 100));
  return { totalQuestions, masteryPercentage };
}
