/**
 * QuizMaster Web - Settings Modal View Component
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { APP_CONFIG } from "../config.js";

export function renderSettingsModal(settingsState) {
  const isTestingKey = settingsState.isTestingKey;
  const keyValidationResult = settingsState.keyValidationResult;

  return `
    <div class="modal-overlay open" id="settings-modal-overlay">
      <div class="modal-container" style="max-width: min(640px, 94vw); width: 100%; max-height: 90vh; max-height: 90dvh; display: flex; flex-direction: column;">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">⚙</span>
            <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
              ${i18n.t("settingsTitle")}
            </h2>
          </div>

          <button class="btn btn-ghost btn-icon-only" id="btn-close-settings">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1;">
          <!-- API Key Section -->
          <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 4px;">
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">
                ${i18n.t("apiKeyLabel")}
              </label>
              <a href="${APP_CONFIG.aiStudioUrl}" target="_blank" rel="noopener noreferrer" style="font-size: var(--text-xs); font-weight: 700; color: var(--color-ocean-blue); text-decoration: none;">
                ${i18n.t("getApiKeyFromStudio")} ↗
              </a>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <input type="password" class="form-input" id="input-api-key" placeholder="${i18n.t("apiKeyHint")}" value="${escapeHtml(settingsState.apiKey || '')}" style="flex: 1 1 220px; min-width: 0;">
              <button class="btn btn-secondary" id="btn-test-api-key" ${isTestingKey ? 'disabled' : ''} style="flex: 0 1 auto; white-space: nowrap;">
                ${isTestingKey ? i18n.t("testingKey") : i18n.t("testApiKey")}
              </button>
            </div>

            ${keyValidationResult !== null ? `
              <div style="margin-top: 8px; font-size: var(--text-xs); font-weight: 700; color: ${keyValidationResult ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">
                ${keyValidationResult ? i18n.t("apiKeyValid") : i18n.t("apiKeyInvalid")}
              </div>
            ` : ''}
          </div>

          <!-- AI Model Fixed Info (Exclusively Gemini 3.5 Flash Lite) -->
          <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
              <div style="flex: 1 1 200px;">
                <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">${i18n.t("modelLabel")}</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; line-height: 1.4;">
                  Cố định sử dụng Google Gemini 3.5 Flash Lite độc quyền cho toàn bộ tác vụ.
                </div>
              </div>
              <span class="badge badge-blue">gemini-3.5-flash-lite</span>
            </div>
          </div>

          <!-- Display & Theme Section -->
          <div class="glass-card" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="font-size: var(--text-sm); font-weight: 800; color: var(--text-primary);">
              ${i18n.t("displayAndThemeHeader")}
            </div>

            <!-- Theme Picker -->
            <div>
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
                ${i18n.t("themeLabel")}
              </label>
              <div class="segmented-control" style="width: 100%; display: flex; flex-wrap: wrap;">
                <button class="segment-btn ${settingsState.theme === 'system' ? 'active' : ''}" data-setting-theme="system" style="flex: 1 1 auto; min-width: 90px;">
                  ${i18n.t("themeSystem")}
                </button>
                <button class="segment-btn ${settingsState.theme === 'light' ? 'active' : ''}" data-setting-theme="light" style="flex: 1 1 auto; min-width: 90px;">
                  ${i18n.t("themeLight")}
                </button>
                <button class="segment-btn ${settingsState.theme === 'dark' ? 'active' : ''}" data-setting-theme="dark" style="flex: 1 1 auto; min-width: 90px;">
                  ${i18n.t("themeDark")}
                </button>
              </div>
            </div>

            <!-- Language Picker -->
            <div>
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
                ${i18n.t("languageLabel")}
              </label>
              <div class="segmented-control" style="width: 100%; display: flex; flex-wrap: wrap;">
                <button class="segment-btn ${settingsState.language === 'vi' ? 'active' : ''}" data-setting-lang="vi" style="flex: 1 1 auto; min-width: 110px;">
                  Tiếng Việt
                </button>
                <button class="segment-btn ${settingsState.language === 'en' ? 'active' : ''}" data-setting-lang="en" style="flex: 1 1 auto; min-width: 110px;">
                  English
                </button>
              </div>
              <div style="font-size: 11px; color: var(--color-ocean-blue); margin-top: 4px;">
                ${i18n.t("geminiLangNote")}
              </div>
            </div>
          </div>

          <!-- Backup & Restore Database Section -->
          <div class="glass-card">
            <div style="font-size: var(--text-sm); font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
              Sao lưu & Khôi phục Dữ liệu
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-secondary" id="btn-export-database" style="flex: 1 1 200px; min-width: 0;">
                Tải xuống tệp Sao lưu (JSON)
              </button>
              <input type="file" id="file-import-database" accept=".json" style="display: none;">
              <button class="btn btn-secondary" id="btn-import-database" style="flex: 1 1 200px; min-width: 0;">
                Khôi phục từ tệp Sao lưu
              </button>
            </div>
          </div>

          <!-- Author Info Section -->
          <div class="glass-card">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <img src="assets/AppIcon.png" alt="QuizMaster" style="width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0;">
              <div style="flex: 1 1 200px; min-width: 0;">
                <div style="font-size: var(--text-base); font-weight: 800;">
                  QuizMaster Web <span class="badge badge-blue">${APP_CONFIG.version}</span>
                </div>
                <div style="font-size: var(--text-xs); color: var(--color-ocean-blue); font-weight: 600; margin-top: 2px;">
                  ${i18n.t("authorInfo")}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px; line-height: 1.4;">
                  ${i18n.t("appDescInfo")}
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 8px;">
              <button class="btn btn-ghost" id="btn-reopen-wizard" style="font-size: var(--text-xs); color: var(--color-ocean-blue);">
                ${i18n.t("reopenSetupWizard")}
              </button>

              <a href="${APP_CONFIG.githubRepo}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="font-size: var(--text-xs); text-decoration: none;">
                GitHub Repository ↗
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-primary" id="btn-save-settings">
            ${i18n.t("saveSettings")}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindSettingsEvents(settingsState, handlers) {
  const closeBtn = document.getElementById("btn-close-settings");
  if (closeBtn) closeBtn.onclick = () => handlers.onClose();

  const saveBtn = document.getElementById("btn-save-settings");
  if (saveBtn) saveBtn.onclick = () => handlers.onSave();

  // API Key input & test
  const keyInput = document.getElementById("input-api-key");
  if (keyInput) {
    keyInput.oninput = (e) => { settingsState.apiKey = e.target.value; };
  }

  const testBtn = document.getElementById("btn-test-api-key");
  if (testBtn) testBtn.onclick = () => handlers.onTestKey();

  // Theme chips
  document.querySelectorAll("[data-setting-theme]").forEach(btn => {
    btn.onclick = () => {
      settingsState.theme = btn.dataset.settingTheme;
      handlers.onUpdateView();
    };
  });

  // Language chips
  document.querySelectorAll("[data-setting-lang]").forEach(btn => {
    btn.onclick = () => {
      settingsState.language = btn.dataset.settingLang;
      handlers.onUpdateView();
    };
  });

  // Export / Import Backup
  const exportDbBtn = document.getElementById("btn-export-database");
  if (exportDbBtn) exportDbBtn.onclick = () => handlers.onExportDatabase();

  const importDbBtn = document.getElementById("btn-import-database");
  const fileImportDb = document.getElementById("file-import-database");
  if (importDbBtn && fileImportDb) {
    importDbBtn.onclick = () => fileImportDb.click();
    fileImportDb.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlers.onImportDatabase(file);
    };
  }

  // Re-open wizard
  const wizardBtn = document.getElementById("btn-reopen-wizard");
  if (wizardBtn) wizardBtn.onclick = () => handlers.onReopenWizard();
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
