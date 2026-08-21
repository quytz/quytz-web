/**
 * QuizMaster Web - Optimized Telemetry Service (Cloudflare KV Edge)
 * Batches session interactions and sends a single payload to minimize server requests.
 */

import { APP_CONFIG } from "../config.js";

class TelemetryService {
  constructor() {
    this.endpoint = APP_CONFIG.telemetryUrl || "/api/telemetry";
    this.idleDelay = 3500; // 3.5s delay after activity before sending
    this.timer = null;
    this.isInitialized = false;
    this.pendingData = this._getFreshBuffer();

    this.init();
  }

  _getFreshBuffer() {
    return {
      visitors: 0,
      locations: {},
      imported_documents: {
        total: 0,
        pdf: 0,
        docx: 0,
        txt: 0,
        json: 0
      },
      exam_modes: {
        practice: 0,
        exam: 0,
        flashcard: 0
      },
      ai_features: {
        total_queries: 0,
        questions_generated: 0,
        explanations_asked: 0
      },
      exports: {
        total: 0,
        json: 0,
        gift: 0,
        anki: 0,
        pdf: 0
      }
    };
  }

  init() {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    // Track unique visitor once per calendar day per browser
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastVisitKey = "qm_telemetry_last_visit";
      const lastVisit = localStorage.getItem(lastVisitKey);
      if (lastVisit !== today) {
        localStorage.setItem(lastVisitKey, today);
        this.trackVisit();
      }
    } catch {
      this.trackVisit();
    }

    // Flush batch when user navigates away or switches tab
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.flush(true);
        }
      });
      window.addEventListener("beforeunload", () => {
        this.flush(true);
      });
    }
  }

  _scheduleFlush() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.flush(false);
    }, this.idleDelay);
  }

  _hasPendingChanges() {
    const p = this.pendingData;
    if (p.visitors > 0) return true;
    if (Object.keys(p.locations).length > 0) return true;
    if (p.imported_documents.total > 0) return true;
    if (p.exam_modes.practice > 0 || p.exam_modes.exam > 0 || p.exam_modes.flashcard > 0) return true;
    if (p.ai_features.total_queries > 0 || p.ai_features.questions_generated > 0 || p.ai_features.explanations_asked > 0) return true;
    if (p.exports.total > 0) return true;
    return false;
  }

  _detectClientLocation() {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
      const language = (navigator.language || navigator.userLanguage || "").toUpperCase();
      let countryGuess = "Unknown";
      if (language.includes("-")) {
        countryGuess = language.split("-")[1];
      }
      return { timeZone, country: countryGuess };
    } catch {
      return { timeZone: "Unknown", country: "Unknown" };
    }
  }

  trackVisit() {
    this.pendingData.visitors += 1;
    const loc = this._detectClientLocation();
    const locKey = loc.country !== "Unknown" ? loc.country : loc.timeZone;
    if (locKey) {
      this.pendingData.locations[locKey] = (this.pendingData.locations[locKey] || 0) + 1;
    }
    this._scheduleFlush();
  }

  trackDocumentImport(fileType) {
    const ext = (fileType || "unknown").toLowerCase().replace(".", "");
    this.pendingData.imported_documents.total += 1;
    if (this.pendingData.imported_documents[ext] !== undefined) {
      this.pendingData.imported_documents[ext] += 1;
    }
    this._scheduleFlush();
  }

  trackExamMode(mode) {
    const m = (mode || "").toLowerCase();
    if (this.pendingData.exam_modes[m] !== undefined) {
      this.pendingData.exam_modes[m] += 1;
    } else {
      this.pendingData.exam_modes.practice += 1;
    }
    this._scheduleFlush();
  }

  trackAiFeature(action, count = 1) {
    this.pendingData.ai_features.total_queries += count;
    if (action === "questions_generated") {
      this.pendingData.ai_features.questions_generated += count;
    } else if (action === "explanations_asked") {
      this.pendingData.ai_features.explanations_asked += count;
    }
    this._scheduleFlush();
  }

  trackExport(format) {
    const f = (format || "").toLowerCase();
    this.pendingData.exports.total += 1;
    if (this.pendingData.exports[f] !== undefined) {
      this.pendingData.exports[f] += 1;
    }
    this._scheduleFlush();
  }

  flush(useBeacon = false) {
    if (!this._hasPendingChanges()) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const payload = JSON.stringify(this.pendingData);
    this.pendingData = this._getFreshBuffer();

    try {
      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(this.endpoint, blob);
        return;
      }

      fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true
      }).catch(() => {
        // Silently swallow errors to keep client performance pristine
      });
    } catch {
      // Silently swallow
    }
  }
}

export const telemetry = new TelemetryService();
