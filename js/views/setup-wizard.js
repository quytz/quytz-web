/**
 * QuizMaster Web - First-Time Setup Wizard View Component
 */
import { i18n } from "../localization/i18n.js";
import { APP_CONFIG } from "../config.js";

export function renderSetupWizardModal(wizardState) {
  const currentStep = wizardState.step || 1;

  return `
    <div class="modal-overlay open" id="setup-wizard-overlay">
      <div class="modal-container" style="max-width: 680px; width: 100%; min-height: auto; max-height: 90vh; max-height: 90dvh; display: flex; flex-direction: column;">
        <!-- Wizard Step Header Indicator -->
        <div style="padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); flex-shrink: 0;">
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
        <div class="modal-body" style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 24px; overflow-y: auto;">
          ${currentStep === 1 ? renderStep1() : ''}
          ${currentStep === 2 ? renderStep2(wizardState) : ''}
          ${currentStep === 3 ? renderStep3(wizardState) : ''}
          ${currentStep === 4 ? renderStep4() : ''}
        </div>

        <!-- Footer Navigation -->
        <div class="modal-footer" style="justify-content: space-between; align-items: center; gap: 8px;">
          ${currentStep > 1 && currentStep < 4 ? `
            <button class="btn btn-secondary" id="btn-wizard-prev">
              ${i18n.t("btnBack")}
            </button>
          ` : `<div></div>`}

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
            ${currentStep === 2 ? `
              <button class="btn btn-ghost" id="btn-wizard-why-key" style="font-size: var(--text-xs); color: var(--color-ocean-blue); padding: 0.4rem 0.6rem; text-decoration: underline;">
                ${i18n.t("whyApiKeyBtn")}
              </button>
            ` : ''}

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
    </div>

    <!-- Why API Key Popup Dialog -->
    ${wizardState.showWhyKeyPopup ? `
      <div class="modal-overlay open" id="why-key-popup-overlay" style="z-index: 1100;">
        <div class="modal-container" style="max-width: min(600px, 94vw); width: 100%; max-height: 90vh; max-height: 90dvh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🔑</span>
              <div style="font-size: var(--text-md); font-weight: 800; color: var(--text-primary);">
                ${i18n.t("whyApiKeyPopupTitle")}
              </div>
            </div>
            <button class="btn btn-ghost btn-icon-only" id="btn-close-why-key-popup">✕</button>
          </div>
          <div class="modal-body" style="padding: 1.25rem; font-size: var(--text-sm); line-height: 1.65; color: var(--text-primary); display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
            <!-- Section 1: API Key là gì? -->
            <div class="glass-card" style="padding: 1rem;">
              <div style="font-size: var(--text-sm); font-weight: 800; color: var(--color-ocean-blue); margin-bottom: 6px;">
                ${i18n.t("whatIsApiKeyTitle")}
              </div>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6; margin: 0;">
                ${i18n.t("whatIsApiKeyAnswer")}
              </p>
            </div>

            <!-- Section 2: Tại sao lại yêu cầu API Key? -->
            <div class="glass-card" style="padding: 1rem;">
              <div style="font-size: var(--text-sm); font-weight: 800; color: var(--color-deep-purple); margin-bottom: 6px;">
                ${i18n.t("whyApiKeyTitle")}
              </div>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6; margin: 0;">
                ${i18n.t("whyApiKeyAnswer")}
              </p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="btn-done-why-key-popup">${i18n.t("close")}</button>
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

function renderStep1() {
  return `
    <div style="text-align: center;">
      <img src="assets/AppIcon.png" alt="QuizMaster" style="width: 68px; height: 68px; border-radius: 16px; margin-bottom: 14px; box-shadow: var(--shadow-md);">
      <h2 style="font-size: var(--text-2xl); font-weight: 800; color: var(--text-primary);">
        ${i18n.t("welcomeTitle")}
      </h2>
      <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 6px; margin-bottom: 20px;">
        ${i18n.t("welcomeSubtitle")}
      </p>

      <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
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
        <span style="font-size: 22px;">🔑</span>
        <h2 style="font-size: var(--text-xl); font-weight: 800; color: var(--text-primary);">
          ${i18n.t("setupApiKeyPrompt")}
        </h2>
      </div>
      <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
        ${i18n.t("setupApiKeyNotice")}
      </p>

      <div class="glass-card" style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
          <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary);">
            GOOGLE AI STUDIO API KEY:
          </label>
          <a href="${APP_CONFIG.aiStudioUrl}" target="_blank" rel="noopener noreferrer" style="font-size: var(--text-xs); font-weight: 700; color: var(--color-ocean-blue); text-decoration: none;">
            ${i18n.t("getApiKeyFromStudio")} ↗
          </a>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <input type="password" class="form-input" id="wizard-api-key-input" placeholder="${i18n.t("apiKeyHint")}" value="${escapeHtml(wizardState.apiKey || '')}" style="flex: 1; min-width: 180px;">
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
        Bạn có thể bỏ qua bước này và cài đặt API Key sau trong mục Cài đặt (Settings).
      </div>
    </div>
  `;
}

function renderStep3(wizardState) {
  return `
    <div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 22px;">🎨</span>
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
              ${i18n.t("themeSystem")}
            </button>
            <button class="segment-btn ${wizardState.theme === 'light' ? 'active' : ''}" data-wizard-theme="light" style="flex: 1;">
              ${i18n.t("themeLight")}
            </button>
            <button class="segment-btn ${wizardState.theme === 'dark' ? 'active' : ''}" data-wizard-theme="dark" style="flex: 1;">
              ${i18n.t("themeDark")}
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
      <div style="font-size: 54px; margin-bottom: 14px;">🎉</div>
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

  // Why API key button & modal
  const whyKeyBtn = document.getElementById("btn-wizard-why-key");
  if (whyKeyBtn) {
    whyKeyBtn.onclick = () => {
      wizardState.showWhyKeyPopup = true;
      handlers.onUpdateView();
    };
  }

  const closeWhyKeyBtn = document.getElementById("btn-close-why-key-popup");
  if (closeWhyKeyBtn) {
    closeWhyKeyBtn.onclick = () => {
      wizardState.showWhyKeyPopup = false;
      handlers.onUpdateView();
    };
  }

  const doneWhyKeyBtn = document.getElementById("btn-done-why-key-popup");
  if (doneWhyKeyBtn) {
    doneWhyKeyBtn.onclick = () => {
      wizardState.showWhyKeyPopup = false;
      handlers.onUpdateView();
    };
  }

  const whyKeyOverlay = document.getElementById("why-key-popup-overlay");
  if (whyKeyOverlay) {
    whyKeyOverlay.onclick = (e) => {
      if (e.target === whyKeyOverlay) {
        wizardState.showWhyKeyPopup = false;
        handlers.onUpdateView();
      }
    };
  }

  // Step 2 Key input & test
  const keyInput = document.getElementById("wizard-api-key-input");
  if (keyInput) {
    keyInput.oninput = (e) => { wizardState.apiKey = e.target.value; };
  }

  const testBtn = document.getElementById("btn-wizard-test-key");
  if (testBtn) testBtn.onclick = () => handlers.onTestKey();

  // Step 3 Theme chips
  document.querySelectorAll("[data-wizard-theme]").forEach(btn => {
    btn.onclick = () => {
      wizardState.theme = btn.dataset.wizardTheme;
      handlers.onUpdateView();
    };
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
