/**
 * QuizMaster Web - Client-Side Diagnostic & Error Logger Service
 * Keeps an in-memory buffer of recent logs and provides sanitized system diagnostics.
 */
import { storage } from "./storage.js";
import { APP_CONFIG } from "../config.js";

class LoggerService {
  constructor() {
    this.maxLogs = 80;
    this.logs = [];
    this.isListening = false;
    this.init();
  }

  init() {
    if (this.isListening || typeof window === "undefined") return;
    this.isListening = true;

    // Log startup
    this.log("INFO", "Hệ thống QuizMaster Web khởi động", { version: APP_CONFIG.version });

    // Global uncaught error listener
    window.addEventListener("error", (event) => {
      this.log("ERROR", `Lỗi Uncaught: ${event.message || "Không xác định"}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null
      });
    });

    // Global unhandled promise rejection listener
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      this.log("ERROR", `Lỗi Promise Rejection: ${reason?.message || String(reason)}`, {
        stack: reason?.stack || null
      });
    });
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      details: details ? this._sanitize(details) : null
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  info(message, details = null) {
    this.log("INFO", message, details);
  }

  warn(message, details = null) {
    this.log("WARN", message, details);
  }

  error(message, details = null) {
    this.log("ERROR", message, details);
  }

  action(actionName, details = null) {
    this.log("ACTION", actionName, details);
  }

  _sanitize(obj) {
    if (!obj) return null;
    if (typeof obj === "string") {
      // Redact potential API keys (AIza..., ghp_..., etc.)
      return obj.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
                .replace(/ghp_[0-9A-Za-z]{36}/g, "[REDACTED_GH_TOKEN]");
    }
    if (typeof obj !== "object") return obj;

    try {
      const cloned = JSON.parse(JSON.stringify(obj));
      const redactKeys = ["apiKey", "key", "token", "password", "secret", "authorization"];

      const traverse = (node) => {
        if (!node || typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          if (redactKeys.includes(k.toLowerCase())) {
            node[k] = "[REDACTED]";
          } else if (typeof node[k] === "string") {
            node[k] = this._sanitize(node[k]);
          } else if (typeof node[k] === "object") {
            traverse(node[k]);
          }
        }
      };

      traverse(cloned);
      return cloned;
    } catch {
      return String(obj);
    }
  }

  getSystemInfo() {
    if (typeof window === "undefined") return {};

    let totalProjects = 0;
    let totalQuizzes = 0;
    let totalQuestions = 0;
    try {
      if (storage?.projects) {
        totalProjects = storage.projects.length;
        storage.projects.forEach(p => {
          totalQuizzes += (p.quizzes?.length || 0);
          p.quizzes?.forEach(q => {
            totalQuestions += (q.questions?.length || 0);
          });
        });
      }
    } catch {}

    const hasApiKey = Boolean(storage?.settings?.apiKey && storage.settings.apiKey.trim().length > 0);

    return {
      appVersion: APP_CONFIG.version || "1.0.0",
      userAgent: navigator.userAgent || "Unknown",
      platform: navigator.platform || "Unknown",
      language: navigator.language || "vi",
      screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      theme: storage?.settings?.theme || "system",
      uiScale: storage?.settings?.uiScale || "default",
      hasCustomApiKey: hasApiKey,
      databaseStats: {
        projectsCount: totalProjects,
        quizzesCount: totalQuizzes,
        questionsCount: totalQuestions
      },
      time: new Date().toLocaleString("vi-VN")
    };
  }

  getDiagnosticReport() {
    const sys = this.getSystemInfo();
    const logs = [...this.logs];

    return {
      system: sys,
      recentLogs: logs
    };
  }

  getFormattedDiagnostics() {
    const report = this.getDiagnosticReport();
    const sys = report.system;
    
    let text = `=== THÔNG TIN HỆ THỐNG ===\n`;
    text += `Phiên bản: QuizMaster v${sys.appVersion}\n`;
    text += `Thời gian: ${sys.time}\n`;
    text += `Thiết bị: ${sys.platform} | Màn hình: ${sys.screenResolution} (Viewport: ${sys.viewport})\n`;
    text += `Trình duyệt: ${sys.userAgent}\n`;
    text += `Giao diện: Theme ${sys.theme} | Scale ${sys.uiScale}\n`;
    text += `Cấu hình API Key: ${sys.hasCustomApiKey ? "Đã nhập (Tùy chỉnh)" : "Chưa nhập"}\n`;
    text += `Dữ liệu hiện tại: ${sys.databaseStats?.projectsCount || 0} dự án, ${sys.databaseStats?.quizzesCount || 0} bộ đề, ${sys.databaseStats?.questionsCount || 0} câu hỏi\n\n`;

    text += `=== NHẬT KÝ SỰ KIỆN GẦN ĐÂY (${report.recentLogs.length} BẢN GHI) ===\n`;
    if (report.recentLogs.length === 0) {
      text += `(Không có nhật ký nào được ghi nhận)\n`;
    } else {
      report.recentLogs.forEach((l) => {
        const timeStr = l.timestamp ? l.timestamp.slice(11, 19) : "--:--:--";
        let detailStr = "";
        if (l.details) {
          try {
            detailStr = typeof l.details === "object" ? " " + JSON.stringify(l.details) : " " + l.details;
          } catch {}
        }
        text += `[${timeStr}] [${l.level}] ${l.message}${detailStr}\n`;
      });
    }

    return text;
  }
}

export const logger = new LoggerService();
