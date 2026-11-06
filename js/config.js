/**
 * QuizMaster Web - Configuration & Constants
 */
export const APP_CONFIG = {
  version: "v2.0.2",
  buildNumber: "1-web",
  author: "@tozn607",
  authorName: "Anh Vinh",
  githubRepo: "https://github.com/tozn607/quizmaster",
  aiStudioUrl: "https://aistudio.google.com/api-keys",
  defaultModel: "gemini-3.5-flash-lite",
  availableModels: [
    {
      id: "gemini-3.5-flash-lite",
      name: "Gemini 3.5 Flash Lite",
      badge: "Nhanh & Tiết kiệm",
      description: "Tốc độ xử lý siêu nhanh, tối ưu hóa cho quét đề và tạo câu hỏi trắc nghiệm."
    },
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      badge: "Mới & Thông minh",
      description: "Mô hình thế hệ mới với khả năng tư duy sâu, phân tích cấu trúc phức tạp và bóc tách dữ liệu chính xác cao."
    }
  ],
  geminiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
  telemetryUrl: "https://quizmaster-telemetry.nm5w6rth9d.workers.dev",
  storageKeys: {
    settings: "QuytzAppSettings",
    projects: "QuytzProjects",
    backup: "QuytzProjectsBackup",
    legacySettings: "QuizMasterAppSettings",
    legacyProjects: "QuizMasterProjects",
    legacyBackup: "QuizMasterProjectsBackup"
  }
};
