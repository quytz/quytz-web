/**
 * QuizMaster Web - Data Models & Factories
 */

export const PROJECT_TYPES = {
  GENERAL: { id: "general", label: "Dự án Ôn tập Chung", icon: "folder", badge: "Chung" },
  LANGUAGE_LEARNING: { id: "languageLearning", label: "Dự án Học Ngoại ngữ", icon: "book.closed", badge: "Ngoại ngữ" },
  THPT_QUOC_GIA: { id: "thptQuocGia", label: "Dự án THPT Quốc gia", icon: "graduationcap", badge: "THPT QG" }
};

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multipleChoice",
  TRUE_FALSE_GROUP: "trueFalseGroup",
  SHORT_ANSWER: "shortAnswer"
};

export const QUESTION_PARTS = {
  PART1: { id: "part1", number: 1, title: "Phần I", subtitle: "Trắc nghiệm nhiều lựa chọn (4 phương án)", defaultPoints: 0.25 },
  PART2: { id: "part2", number: 2, title: "Phần II", subtitle: "Trắc nghiệm Đúng / Sai (4 ý a, b, c, d)", maxPoints: 1.0 },
  PART3: { id: "part3", number: 3, title: "Phần III", subtitle: "Trắc nghiệm trả lời ngắn", defaultPoints: 0.25 }
};

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
  reading: { id: "reading", name: "Đọc hiểu (Reading)", icon: "book.closed" },
  listening: { id: "listening", name: "Nghe hiểu (Listening)", icon: "sparkles" },
  lexical: { id: "lexical", name: "Ngữ pháp & Từ vựng (Lexical)", icon: "square.and.pencil" },
  general: { id: "general", name: "Tổng hợp", icon: "doc.text" }
};

export const THPT_SUBJECTS = [
  { id: "toan", name: "Toán", needsDiagrams: true, needsFormulas: true, defaultPart1: 10, defaultPart2: 4, defaultPart3: 4 },
  { id: "ly", name: "Vật lý", needsDiagrams: true, needsFormulas: true, defaultPart1: 10, defaultPart2: 4, defaultPart3: 4 },
  { id: "hoa", name: "Hóa học", needsDiagrams: true, needsFormulas: true, defaultPart1: 10, defaultPart2: 4, defaultPart3: 4 },
  { id: "sinh", name: "Sinh học", needsDiagrams: true, needsFormulas: false, defaultPart1: 10, defaultPart2: 4, defaultPart3: 4 },
  { id: "dia", name: "Địa lý", needsDiagrams: true, needsFormulas: false, defaultPart1: 10, defaultPart2: 4, defaultPart3: 4 },
  { id: "su", name: "Lịch sử", needsDiagrams: true, needsFormulas: false, defaultPart1: 8, defaultPart2: 4, defaultPart3: 4 },
  { id: "gdcd", name: "Giáo dục công dân", needsDiagrams: false, needsFormulas: false, defaultPart1: 8, defaultPart2: 4, defaultPart3: 4 },
  { id: "tin", name: "Tin học", needsDiagrams: false, needsFormulas: false, defaultPart1: 8, defaultPart2: 4, defaultPart3: 4 },
  { id: "congnghe", name: "Công nghệ", needsDiagrams: true, needsFormulas: false, defaultPart1: 8, defaultPart2: 4, defaultPart3: 4 }
];

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

export function createSubItem(label = "a", text = "", isCorrect = true, id = null) {
  return {
    id: id || generateUUID(),
    label,
    text,
    isCorrect: !!isCorrect
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
  sectionIndex = null,
  // THPT Quốc gia & Extended Question Types
  questionType = "multipleChoice", // "multipleChoice" | "trueFalseGroup" | "shortAnswer"
  part = "part1", // "part1" | "part2" | "part3"
  subItems = null, // [{ id, label: "a", text: "...", isCorrect: true }] for part2
  shortAnswer = "", // correct text for part3
  acceptedAnswers = [], // alternative accepted strings for part3
  pointValue = null // e.g. 0.25 or 0.5 (defaults based on part)
} = {}) {
  // Infer questionType from part if not specified
  let qType = questionType;
  if (part === "part2" && qType === "multipleChoice") qType = "trueFalseGroup";
  if (part === "part3" && qType === "multipleChoice") qType = "shortAnswer";

  // Build standard options (for Part I Multiple Choice)
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

  // Build subItems (for Part II True/False group)
  let finalSubItems = null;
  if (qType === "trueFalseGroup" || part === "part2") {
    finalSubItems = (subItems && subItems.length > 0)
      ? subItems.map((item, i) => ({
          id: item.id || generateUUID(),
          label: item.label || ["a", "b", "c", "d"][i] || `y_${i + 1}`,
          text: item.text || "",
          isCorrect: item.isCorrect === true || item.isCorrect === "true" || item.isCorrect === 1
        }))
      : [
          createSubItem("a", "", true),
          createSubItem("b", "", false),
          createSubItem("c", "", true),
          createSubItem("d", "", false)
        ];
  }

  // Calculate default points
  let finalPointValue = pointValue;
  if (finalPointValue === null || finalPointValue === undefined) {
    if (part === "part1" || qType === "multipleChoice") finalPointValue = 0.25;
    else if (part === "part2" || qType === "trueFalseGroup") finalPointValue = 1.0;
    else if (part === "part3" || qType === "shortAnswer") finalPointValue = 0.25;
    else finalPointValue = 0.25;
  }

  return {
    id: id || generateUUID(),
    text,
    options: finalOptions,
    correctAnswerIndex: (correctAnswerIndex >= 0 && correctAnswerIndex < finalOptions.length) ? correctAnswerIndex : 0,
    explanation,
    skill,
    readingPassage,
    subTopic,
    sectionIndex,
    questionType: qType,
    part,
    subItems: finalSubItems,
    shortAnswer: (shortAnswer || "").trim(),
    acceptedAnswers: Array.isArray(acceptedAnswers) ? acceptedAnswers : [],
    pointValue: finalPointValue
  };
}

export function shuffleQuestionOptions(question) {
  // Only shuffle multiple choice questions with options
  if (question.questionType !== "multipleChoice" && question.part !== "part1") {
    return question;
  }
  if (!question.options || question.options.length <= 1) return question;
  
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

export function normalizeAnswerText(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/,/g, "."); // Support Vietnamese comma decimal format
}

/**
 * Score a single question based on user response.
 * @returns {object} { earnedPoints, maxPoints, isFullyCorrect, correctSubCount, totalSubCount }
 */
export function scoreQuestion(question, userResponse) {
  const isP2 = question.part === "part2" || question.questionType === "trueFalseGroup";
  const isP3 = question.part === "part3" || question.questionType === "shortAnswer";

  if (isP2) {
    const subItems = question.subItems || [];
    const maxPoints = question.pointValue || 1.0;
    if (subItems.length === 0) return { earnedPoints: 0, maxPoints, isFullyCorrect: false };

    let correctSubCount = 0;
    // userResponse for Part 2 is an object: { [subItemId]: boolean }
    const answers = (typeof userResponse === "object" && userResponse !== null) ? userResponse : {};
    
    subItems.forEach(sub => {
      const userChoice = answers[sub.id];
      if (userChoice !== undefined && userChoice !== null) {
        if (Boolean(userChoice) === Boolean(sub.isCorrect)) {
          correctSubCount++;
        }
      }
    });

    // Official MOET tiered score table for 4 sub-items:
    // 1 correct: 0.1 pt, 2 correct: 0.25 pt, 3 correct: 0.5 pt, 4 correct: 1.0 pt
    const tieredPoints = [0, 0.1, 0.25, 0.5, 1.0];
    let earnedPoints = 0;
    if (correctSubCount >= 0 && correctSubCount < tieredPoints.length) {
      earnedPoints = tieredPoints[correctSubCount];
    } else if (correctSubCount >= 4) {
      earnedPoints = 1.0;
    }

    return {
      earnedPoints,
      maxPoints,
      isFullyCorrect: correctSubCount === subItems.length,
      correctSubCount,
      totalSubCount: subItems.length
    };
  }

  if (isP3) {
    const maxPoints = question.pointValue || 0.25;
    const userText = normalizeAnswerText(userResponse);
    if (!userText) {
      return { earnedPoints: 0, maxPoints, isFullyCorrect: false };
    }

    const accepted = [
      normalizeAnswerText(question.shortAnswer),
      ...(question.acceptedAnswers || []).map(normalizeAnswerText)
    ].filter(Boolean);

    // Also check numeric equivalence if both are valid numbers
    const userNum = parseFloat(userText);
    const isMatched = accepted.some(ans => {
      if (ans === userText) return true;
      const targetNum = parseFloat(ans);
      if (!isNaN(userNum) && !isNaN(targetNum) && Math.abs(userNum - targetNum) < 0.0001) {
        return true;
      }
      return false;
    });

    return {
      earnedPoints: isMatched ? maxPoints : 0,
      maxPoints,
      isFullyCorrect: isMatched
    };
  }

  // Default: Part 1 / Standard Multiple Choice
  const maxPoints = question.pointValue || 0.25;
  const correctOpt = (question.correctAnswerIndex >= 0 && question.correctAnswerIndex < (question.options || []).length)
    ? question.options[question.correctAnswerIndex]
    : question.options[0];
  
  const isCorrect = (userResponse && correctOpt && (userResponse === correctOpt.id || userResponse === question.correctAnswerIndex));
  return {
    earnedPoints: isCorrect ? maxPoints : 0,
    maxPoints,
    isFullyCorrect: isCorrect
  };
}

/**
 * Calculate total quiz score & stats across all parts.
 */
export function calculateQuizScore(quiz, progress) {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return {
      totalEarned: 0,
      totalMax: 0,
      scoreOutOf10: 0,
      percentage: 0,
      correctCount: 0,
      wrongCount: 0,
      isTHPT: false,
      parts: {
        part1: { earned: 0, max: 0, count: 0, correctCount: 0 },
        part2: { earned: 0, max: 0, count: 0, correctCount: 0 },
        part3: { earned: 0, max: 0, count: 0, correctCount: 0 }
      }
    };
  }

  const isTHPT = quiz.quizType === "thptQuocGia" || quiz.questions.some(q => q.part === "part2" || q.part === "part3");
  let totalEarned = 0;
  let totalMax = 0;
  let correctCount = 0;
  let wrongCount = 0;

  const parts = {
    part1: { earned: 0, max: 0, count: 0, correctCount: 0 },
    part2: { earned: 0, max: 0, count: 0, correctCount: 0 },
    part3: { earned: 0, max: 0, count: 0, correctCount: 0 }
  };

  quiz.questions.forEach(q => {
    const userAns = progress ? (progress.userSelectedOptionIds?.[q.id] ?? progress.userAnswers?.[q.id]) : null;
    const scoreResult = scoreQuestion(q, userAns);

    totalEarned += scoreResult.earnedPoints;
    totalMax += scoreResult.maxPoints;

    if (scoreResult.isFullyCorrect) {
      correctCount++;
    } else if (userAns !== null && userAns !== undefined) {
      wrongCount++;
    }

    const partKey = q.part || (q.questionType === "trueFalseGroup" ? "part2" : (q.questionType === "shortAnswer" ? "part3" : "part1"));
    if (parts[partKey]) {
      parts[partKey].earned += scoreResult.earnedPoints;
      parts[partKey].max += scoreResult.maxPoints;
      parts[partKey].count += 1;
      if (scoreResult.isFullyCorrect) parts[partKey].correctCount += 1;
    }
  });

  const rawPercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
  // If exam has standard 10 pts max, use totalEarned directly, otherwise scale to 10
  const scoreOutOf10 = totalMax > 0 ? Number(((totalEarned / totalMax) * 10).toFixed(2)) : 0;

  return {
    totalEarned: Number(totalEarned.toFixed(2)),
    totalMax: Number(totalMax.toFixed(2)),
    scoreOutOf10,
    percentage: Math.min(100, Math.round(rawPercentage)),
    correctCount,
    wrongCount,
    isTHPT,
    parts
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
  quizType = "general", // "general" | "languageLearning" | "thptQuocGia"
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
  projectType = "general", // "general" | "languageLearning" | "thptQuocGia"
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
      const scoreRes = calculateQuizScore(quiz, prog);
      totalMastered += Math.max(scoreRes.correctCount, (prog.flashcardMasteredIds || []).length);
    }
  });

  const masteryPercentage = Math.min(100, Math.round((totalMastered / totalQuestions) * 100));
  return { totalQuestions, masteryPercentage };
}

