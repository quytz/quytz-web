/**
 * QuizMaster Web - Global Keyboard Shortcuts Handler
 */

class KeyboardManager {
  constructor() {
    this.activeHandler = null;
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  init() {
    window.addEventListener("keydown", (e) => {
      // Don't intercept if user is typing in an input or textarea
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) {
        if (e.key === "Escape") {
          e.target.blur();
        }
        return;
      }

      if (this.activeHandler) {
        this.activeHandler(e);
      }
    });
  }

  setHandler(handler) {
    this.activeHandler = handler;
  }

  clearHandler() {
    this.activeHandler = null;
  }
}

export const keyboard = new KeyboardManager();
