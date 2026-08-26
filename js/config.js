/**
 * QuizMaster Web - Configuration & Constants
 */
export const APP_CONFIG = {
  version: "v2.0.1",
  buildNumber: "1-web",
  author: "@tozn607",
  authorName: "Anh Vinh",
  githubRepo: "https://github.com/tozn607/quizmaster",
  aiStudioUrl: "https://aistudio.google.com/api-keys",
  defaultModel: "gemini-3.5-flash-lite",
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
