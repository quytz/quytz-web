/**
 * QuizMaster Web - First-Time Setup Wizard View Component
 */
import { i18n } from "../localization/i18n.js";
import { APP_CONFIG } from "../config.js";

export function renderSetupWizardModal(wizardState) {
  const currentStep = wizardState.step || 1;

  return `
    <div class="modal-overlay open" id="setup-wizard-overlay">
      <div class="modal-container" style="max-width: 680px; width: 100%; min-height: 520px; display: flex; flex-direction: column;">
        <!-- Wizard Step Header Indicator -->
        <div style="padding: 16px 24px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card);">
          <div style="display: flex; gap: 8px; width: 100%;">
            <div class="progress-bar-container" style="flex: 1; height: 6px;">
              <div class="progress-bar-fill" style="width: ${currentStep >= 1 ? '100%' : '0%'}; --progress-color: var(--color-ocean-blue);"></div>
            </div>
            <div class="progress-bar-container" style="flex: 1; height: 6px;">
              <div class="progress-bar-fill" style="width: ${currentStep >= 2 ? '100%' : '0%'}; --progress-color: var(--color-ocean-blue);"></div>
            </div>
            <div class="progress-bar-container" style="flex: 1; height: 6px;">
              <div class="progress-bar-fill" style="width: ${currentStep >= 3 ? '100%' : '0%'}; --progress-color: var(--color-ocean-blue);"></div>
            </div>
            <div class="progress-bar-container" style="flex: 1; height: 6px;">
              <div class="progress-bar-fill" style="width: ${currentStep >= 4 ? '100%' : '0%'}; --progress-color: var(--color-emerald-mint);"></div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="modal-body" style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 32px;">
          ${currentStep === 1 ? renderStep1() : ''}
          ${currentStep === 2 ? renderStep2(wizardState) : ''}
          ${currentStep === 3 ? renderStep3(wizardState) : ''}
          ${currentStep === 4 ? renderStep4() : ''}
        </div>

        <!-- Footer Navigation -->
        <div class="modal-footer" style="justify-content: space-between;">
          ${currentStep > 1 && currentStep < 4 ? `
            <button class="btn btn-secondary" id="btn-wizard-prev">
              ← ${i18n.t("btnBack")}
            </button>
          ` : `<div></div>`}

          ${currentStep < 4 ? `
            <button class="btn btn-primary" id="btn-wizard-next">
              ${currentStep === 1 ? i18n.t("startSetupBtn") : i18n.t("btnContinue")}
            </button>
          ` : `
            <button class="btn btn-primary btn-green" id="btn-wizard-finish" style="width: 100%;">
              ${i18n.t("enterAppBtn")}
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderStep1() {
  return `
    <div style="text-align: center;">
      <img src="assets/AppIcon.png" alt="QuizMaster" style="width: 72px; height: 72px; border-radius: 16px; margin-bottom: 16px; box-shadow: var(--shadow-md);">
      <h2 style="font-size: var(--text-2xl); font-weight: 800; color: var(--text-primary);">
        ${i18n.t("welcomeTitle")}
      </h2>
      <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 6px; margin-bottom: 24px;">
        ${i18n.t("welcomeSubtitle")}
      </p>

      <div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
        <div class="glass-card" style="padding: 12px 16px; display: flex; gap: 12px; align-items: center;">
          <div style="font-size: 24px;">🤖</div>
          <div>
            <div style="font-size: var(--text-sm); font-weight: 700;">${i18n.t("feature1Title")}</div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">${i18n.t("feature1Desc")}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 12px 16px; display: flex; gap: 12px; align-items: center;">
          <div style="font-size: 24px;">🎯</div>
          <div>
            <div style="font-size: var(--text-sm); font-weight: 700;">${i18n.t("feature2Title")}</div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">${i18n.t("feature2Desc")}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 12px 16px; display: flex; gap: 12px; align-items: center;">
          <div style="font-size: 24px;">🔒</div>
          <div>
            <div style="font-size: var(--text-sm); font-weight: 700;">${i18n.t("feature3Title")}</div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">${i18n.t("feature3Desc")}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStep2(wizardState) {
  return `
    <div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 24px;">🔑</span>
        <h2 style="font-size: var(--text-xl); font-weight: 800; color: var(--text-primary);">
          ${i18n.t("setupApiKeyPrompt")}
        </h2>
      </div>
      <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
        ${i18n.t("setupApiKeyNotice")}
      </p>

      <div class="glass-card" style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">
            GOOGLE AI STUDIO API KEY:
          </label>
          <a href="${APP_CONFIG.aiStudioUrl}" target="_blank" rel="noopener noreferrer" style="font-size: var(--text-xs); font-weight: 700; color: var(--color-ocean-blue); text-decoration: none;">
            🔑 ${i18n.t("getApiKeyFromStudio")}
          </a>
        </div>

        <div style="display: flex; gap: 8px;">
          <input type="password" class="form-input" id="wizard-api-key-input" placeholder="${i18n.t("apiKeyHint")}" value="${escapeHtml(wizardState.apiKey || '')}">
          <button class="btn btn-secondary" id="btn-wizard-test-key" ${wizardState.isTestingKey ? 'disabled' : ''}>
            ${wizardState.isTestingKey ? i18n.t("testingKey") : i18n.t("testApiKey")}
          </button>
        </div>

        ${wizardState.keyValidationResult !== null ? `
          <div style="font-size: var(--text-xs); font-weight: 700; color: ${wizardState.keyValidationResult ? 'var(--color-emerald-mint)' : 'var(--color-coral-red)'};">
            ${wizardState.keyValidationResult ? i18n.t("apiKeyValid") : i18n.t("apiKeyInvalid")}
          </div>
        ` : ''}
      </div>

      <div style="margin-top: 12px; font-size: 11px; color: var(--text-muted); text-align: center;">
        💡 Bạn có thể bỏ qua bước này và cài đặt API Key sau trong mục Cài đặt (Settings).
      </div>
    </div>
  `;
}

function renderStep3(wizardState) {
  return `
    <div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 24px;">🎨</span>
        <h2 style="font-size: var(--text-xl); font-weight: 800; color: var(--text-primary);">
          ${i18n.t("setupAppearanceTitle")}
        </h2>
      </div>

      <div class="glass-card" style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px;">
        <!-- Theme Picker -->
        <div>
          <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            ${i18n.t("themeLabel")}
          </label>
          <div class="segmented-control" style="width: 100%;">
            <button class="segment-btn ${wizardState.theme === 'system' ? 'active' : ''}" data-wizard-theme="system" style="flex: 1;">
              🌗 ${i18n.t("themeSystem")}
            </button>
            <button class="segment-btn ${wizardState.theme === 'light' ? 'active' : ''}" data-wizard-theme="light" style="flex: 1;">
              ☀️ ${i18n.t("themeLight")}
            </button>
            <button class="segment-btn ${wizardState.theme === 'dark' ? 'active' : ''}" data-wizard-theme="dark" style="flex: 1;">
              🌙 ${i18n.t("themeDark")}
            </button>
          </div>
        </div>

        <!-- Language Picker -->
        <div>
          <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            ${i18n.t("languageLabel")}
          </label>
          <div class="segmented-control" style="width: 100%;">
            <button class="segment-btn ${wizardState.language === 'vi' ? 'active' : ''}" data-wizard-lang="vi" style="flex: 1;">
              🇻🇳 Tiếng Việt
            </button>
            <button class="segment-btn ${wizardState.language === 'en' ? 'active' : ''}" data-wizard-lang="en" style="flex: 1;">
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Shortcuts Guide -->
      <div class="glass-card" style="padding: 12px 16px;">
        <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">
          ${i18n.t("setupGuideTitle")}
        </div>
        <div style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6;">
          <div>${i18n.t("guideBullet1")}</div>
          <div>${i18n.t("guideBullet2")}</div>
          <div>${i18n.t("guideBullet3")}</div>
        </div>
      </div>
    </div>
  `;
}

function renderStep4() {
  return `
    <div style="text-align: center;">
      <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
      <h2 style="font-size: var(--text-2xl); font-weight: 800; color: var(--text-primary);">
        ${i18n.t("setupFinishTitle")}
      </h2>
      <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 6px;">
        ${i18n.t("setupFinishSubtitle")}
      </p>
    </div>
  `;
}

export function bindSetupWizardEvents(wizardState, handlers) {
  const nextBtn = document.getElementById("btn-wizard-next");
  if (nextBtn) nextBtn.onclick = () => handlers.onNextStep();

  const prevBtn = document.getElementById("btn-wizard-prev");
  if (prevBtn) prevBtn.onclick = () => handlers.onPrevStep();

  const finishBtn = document.getElementById("btn-wizard-finish");
  if (finishBtn) finishBtn.onclick = () => handlers.onFinish();

  // Step 2 Key input & test
  const keyInput = document.getElementById("wizard-api-key-input");
  if (keyInput) {
    keyInput.oninput = (e) => { wizardState.apiKey = e.target.value; };
  }

  const testBtn = document.getElementById("btn-wizard-test-key");
  if (testBtn) testBtn.onclick = () => handlers.onTestKey();

  // Step 3 Themes & Langs
  document.querySelectorAll("[data-wizard-theme]").forEach(btn => {
    btn.onclick = () => {
      wizardState.theme = btn.dataset.wizardTheme;
      handlers.onUpdateView();
    };
  });

  document.querySelectorAll("[data-wizard-lang]").forEach(btn => {
    btn.onclick = () => {
      wizardState.language = btn.dataset.wizardLang;
      handlers.onUpdateView();
    };
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
