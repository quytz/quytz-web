/**
 * QuizMaster Web - Document Import & Gemini Scanner Modal Component
 */
import { i18n } from "../localization/i18n.js";
import { CEFR_LEVELS } from "../models/types.js";
import { renderSF } from "../components/icons.js";

export function renderImportModal(project, modalState) {
  const isLLProject = project.projectType === "languageLearning";
  const isTHPT = project.projectType === "thptQuocGia";

  let defaultTab = "gemini";
  if (isLLProject) defaultTab = "lang";
  if (isTHPT) defaultTab = "thpt";

  const activeTab = modalState.activeTab || defaultTab;
  const isScanning = modalState.isScanning;

  let projectBadgeText = "📁 Dự án Ôn tập Chung";
  if (isLLProject) projectBadgeText = "📖 Dự án Học Ngoại ngữ";
  if (isTHPT) projectBadgeText = "🎓 Dự án THPT Quốc gia";

  return `
    <div class="modal-overlay open" id="import-modal-overlay">
      <div class="modal-container" style="max-width: 780px; width: 100%; max-height: 88vh;">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${renderSF("sparkles", { size: "22px" })}
            <div>
              <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
                ${i18n.t("importDoc")}
              </h2>
              <div style="font-size: var(--text-xs); color: var(--text-secondary);">
                Dự án hiện tại: <strong>${escapeHtml(project.name)}</strong> (${projectBadgeText})
              </div>
            </div>
          </div>

          <button class="btn btn-ghost btn-icon-only" id="btn-close-import">
            ${renderSF("xmark", { size: "14px" })}
          </button>
        </div>

        <!-- Tab Bar -->
        <div style="padding: 12px 20px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-card); display: flex; gap: 8px;">
          <div class="segmented-control" style="width: 100%;">
            ${isTHPT ? `
              <button class="segment-btn ${activeTab === 'thpt' ? 'active' : ''}" id="tab-btn-thpt" style="flex: 1;">
                Quét Đề THPT Quốc gia (3 Phần) <span class="badge badge-orange" style="font-size: 9px; padding: 2px 6px; margin-left: 4px;">WIP</span>
              </button>
            ` : ''}

            ${!isTHPT && !isLLProject ? `
              <button class="segment-btn ${activeTab === 'gemini' ? 'active' : ''}" id="tab-btn-gemini" style="flex: 1;">
                Quét Tài liệu Gemini AI
              </button>
            ` : ''}

            ${isLLProject ? `
              <button class="segment-btn ${activeTab === 'lang' ? 'active' : ''}" id="tab-btn-lang" style="flex: 1;">
                Quét Đề Ngoại ngữ & CEFR <span class="badge badge-orange" style="font-size: 9px; padding: 2px 6px; margin-left: 4px;">WIP</span>
              </button>
            ` : ''}

            <button class="segment-btn ${activeTab === 'premade' ? 'active' : ''}" id="tab-btn-premade" style="flex: 1;">
              Nhập Đề có sẵn (.zip / .json)
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="modal-body">
          ${isScanning ? `
            <div class="scan-progress-card" style="text-align: center; padding: 48px 24px;">
              <div style="font-size: 42px; animation: pulse 1.5s infinite; margin-bottom: 16px; color: var(--color-deep-purple);">
                ${renderSF("sparkles", { size: "48px" })}
              </div>
              <div style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary); margin-bottom: 6px;" id="scan-progress-status">
                ${escapeHtml(modalState.scanStatusText || 'Gemini 3.5 Flash Lite đang phân tích và quét đề thi...')}
              </div>
              <p style="color: var(--text-secondary); font-size: var(--text-xs); margin-bottom: 24px;">
                Vui lòng giữ cửa sổ mở trong quá trình AI phân tích tài liệu và cấu trúc câu hỏi.
              </p>

              <!-- Progress Bar Container -->
              <div style="width: 100%; max-width: 480px; margin: 0 auto; background: var(--border-subtle); height: 10px; border-radius: 6px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.08);">
                <div id="scan-progress-bar" style="width: ${modalState.scanProgress || 15}%; height: 100%; background: linear-gradient(90deg, #1f7ae8, #7a5ccc); border-radius: 6px; transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);"></div>
              </div>

              <div style="margin-top: 16px; font-size: 11px; color: var(--text-tertiary); display: flex; align-items: center; justify-content: center; gap: 6px;">
                ${renderSF("info.circle", { size: "12px" })} Quá trình có thể mất từ 15-30 giây tùy theo độ dài của tài liệu.
              </div>
            </div>
          ` : `
            ${activeTab === 'thpt' ? renderTHPTGeminiTab(project, modalState) : ''}
            ${activeTab === 'gemini' ? renderGeneralGeminiTab(project, modalState) : ''}
            ${activeTab === 'lang' ? renderLanguageExamTab(project, modalState) : ''}
            ${activeTab === 'premade' ? renderPremadeTab(project, modalState) : ''}
          `}
        </div>

        <!-- Footer -->
        ${!isScanning ? `
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-import">${i18n.t("cancel")}</button>
            ${activeTab === 'thpt' ? `
              <button class="btn btn-primary btn-purple" id="btn-start-thpt-scan">
                ${renderSF("sparkles", { size: "14px" })} Quét Đề THPT Quốc gia (3 Phần)
              </button>
            ` : ''}
            ${activeTab === 'gemini' && !isLLProject && !isTHPT ? `
              <button class="btn btn-primary" id="btn-start-gemini-scan">
                ${renderSF("sparkles", { size: "14px" })} ${i18n.t("startGeminiScanBtn")}
              </button>
            ` : ''}
            ${activeTab === 'lang' && isLLProject ? `
              <button class="btn btn-primary btn-purple" id="btn-start-lang-scan">
                ${renderSF("sparkles", { size: "14px" })} ${i18n.t("startLangScanBtn")}
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderTHPTGeminiTab(project, modalState) {
  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Prominent WIP Warning Banner -->
      <div style="padding: 12px 16px; border-radius: var(--radius-md); background: rgba(224, 117, 51, 0.12); border: 1.5px solid var(--color-sunset-orange); display: flex; gap: 12px; align-items: flex-start;">
        <span style="font-size: 20px;">🚧</span>
        <div>
          <div style="font-size: var(--text-xs); font-weight: 800; color: var(--color-sunset-orange);">
            TÍNH NĂNG ĐANG PHÁT TRIỂN / THỬ NGHIỆM (WIP - WORK IN PROGRESS)
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">
            Chế độ Quét Đề thi THPT Quốc gia (3 Phần) đang trong giai đoạn phát triển và thử nghiệm. Việc bóc tách công thức toán phức tạp và hình vẽ từ file tài liệu có thể chưa hoàn hảo và cần được kiểm tra lại trong Trình chỉnh sửa đề thi.
          </div>
        </div>
      </div>

      <div class="greeting-badge" style="background: rgba(122, 92, 204, 0.1); border-color: rgba(122, 92, 204, 0.3); color: var(--color-deep-purple);">
        <span>🎓 <strong>Cấu trúc Đề thi THPT Quốc gia (3 Phần)</strong>: Phần I (4 lựa chọn 0.25đ), Phần II (Đúng/Sai 4 ý tối đa 1.0đ), Phần III (Trả lời ngắn).</span>
      </div>

      <!-- File Selector Card -->
      <div class="glass-card">
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">
          ${i18n.t("selectDocFilePrompt")}
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="file" id="file-thpt-input" accept=".docx,.pdf,.txt,.md" style="display: none;">
          <button class="btn btn-secondary" id="btn-browse-thpt">
            ${renderSF("doc.text", { size: "14px" })} ${i18n.t("selectFileBtn")}
          </button>
          <div style="font-size: var(--text-sm); color: var(--text-secondary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="lbl-selected-thpt-filename">
            ${modalState.selectedFileName || i18n.t("noFileSelected")}
          </div>
        </div>
      </div>

      <!-- Quiz Title -->
      <div>
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
          TÊN BỘ ĐỀ THI THPT QUỐC GIA:
        </label>
        <input type="text" class="form-input" id="input-thpt-quiz-title" placeholder="Đề thi thử THPT Quốc gia môn Toán..." value="${escapeHtml(modalState.quizTitle || '')}">
      </div>
    </div>
  `;
}

function renderGeneralGeminiTab(project, modalState) {
  const isLLProject = project.projectType === "languageLearning";

  if (isLLProject) {
    return `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <div style="font-size: var(--text-md); font-weight: 700; color: var(--color-coral-red);">
          ${i18n.t("onlyInGeneralProjectNotice")}
        </div>
        <p style="margin: 8px 0 16px; color: var(--text-secondary); font-size: var(--text-sm);">
          Dự án "${escapeHtml(project.name)}" là Dự án Học Ngoại ngữ. Vui lòng chuyển sang tab "Quét Đề Ngoại ngữ & CEFR" hoặc chọn/tạo Dự án Ôn tập Chung ở thanh bên.
        </p>
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- File Selector Card -->
      <div class="glass-card">
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">
          ${i18n.t("selectDocFilePrompt")}
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="file" id="file-doc-input" accept=".docx,.pdf,.txt,.md" style="display: none;">
          <button class="btn btn-secondary" id="btn-browse-doc">
            ${renderSF("doc.text", { size: "14px" })} ${i18n.t("selectFileBtn")}
          </button>
          <div style="font-size: var(--text-sm); color: var(--text-secondary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="lbl-selected-filename">
            ${modalState.selectedFileName || i18n.t("noFileSelected")}
          </div>
        </div>
      </div>

      <!-- Quiz Title -->
      <div>
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
          TÊN BỘ ĐỀ THI MỚI (TÙY CHỌN):
        </label>
        <input type="text" class="form-input" id="input-quiz-title" placeholder="${i18n.t("quizTitlePlaceholder")}" value="${escapeHtml(modalState.quizTitle || '')}">
      </div>

      <!-- Toggle Auto-generate vs Extract pre-made -->
      <div class="glass-card">
        <label class="custom-checkbox">
          <input type="checkbox" id="chk-auto-generate" ${modalState.isCreateMultipleChoice ? 'checked' : ''}>
          <span style="font-size: var(--text-sm); font-weight: 700;">${i18n.t("enableAutoGenerate")}</span>
        </label>
        <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-top: 6px; line-height: 1.4;">
          ${modalState.isCreateMultipleChoice ? i18n.t("confirmScanMsgToggleOn") : i18n.t("confirmScanMsgToggleOff")}
        </div>
      </div>

      <!-- AI Question Generation Language -->
      <div class="glass-card">
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
          Ngôn ngữ nội dung tạo câu hỏi AI:
        </label>
        <div class="segmented-control" style="width: 100%;">
          <button class="segment-btn ${(modalState.aiLanguage || 'vi') === 'vi' ? 'active' : ''}" data-import-lang="vi" style="flex: 1;">
            Tiếng Việt
          </button>
          <button class="segment-btn ${(modalState.aiLanguage || 'vi') === 'en' ? 'active' : ''}" data-import-lang="en" style="flex: 1;">
            English
          </button>
        </div>
        <div style="font-size: 11px; color: var(--color-ocean-blue); margin-top: 6px; line-height: 1.4;">
          ${i18n.t("geminiLangNote")}
        </div>
      </div>

      <!-- Depth Mode (When auto-generate is ON) -->
      ${modalState.isCreateMultipleChoice ? `
        <div class="glass-card">
          <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">
            ${i18n.t("depthModeHeader")}
          </label>
          <div class="segmented-control" style="width: 100%;">
            <button class="segment-btn ${modalState.depthMode === 'core' ? 'active' : ''}" data-depth="core" style="flex: 1;">
              Trọng tâm (Core)
            </button>
            <button class="segment-btn ${!modalState.depthMode || modalState.depthMode === 'normal' ? 'active' : ''}" data-depth="normal" style="flex: 1;">
              Tiêu chuẩn (Normal)
            </button>
            <button class="segment-btn ${modalState.depthMode === 'thorough' ? 'active' : ''}" data-depth="thorough" style="flex: 1;">
              Toàn diện (Thorough)
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderLanguageExamTab(project, modalState) {
  const isLLProject = project.projectType === "languageLearning";

  if (!isLLProject) {
    return `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <div style="font-size: var(--text-md); font-weight: 700; color: var(--color-coral-red);">
          ${i18n.t("onlyInLLProjectNotice")}
        </div>
        <p style="margin: 8px 0 16px; color: var(--text-secondary); font-size: var(--text-sm);">
          Dự án "${escapeHtml(project.name)}" là Dự án Ôn tập Chung. Vui lòng chuyển sang tab "Quét Tài liệu Gemini AI" hoặc tạo "Dự án Học Ngoại ngữ" mới ở thanh bên.
        </p>
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Prominent WIP Warning Banner -->
      <div style="padding: 12px 16px; border-radius: var(--radius-md); background: rgba(224, 117, 51, 0.12); border: 1.5px solid var(--color-sunset-orange); display: flex; gap: 12px; align-items: flex-start;">
        <span style="font-size: 20px;">🚧</span>
        <div>
          <div style="font-size: var(--text-xs); font-weight: 800; color: var(--color-sunset-orange);">
            TÍNH NĂNG ĐANG PHÁT TRIỂN / THỬ NGHIỆM (WIP - WORK IN PROGRESS)
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">
            Chế độ Học Ngoại ngữ & Trích xuất Thẻ từ vựng CEFR đang trong giai đoạn thử nghiệm. Tính năng này yêu cầu tài liệu là đề thi ngoại ngữ có cấu trúc rõ ràng.
          </div>
        </div>
      </div>

      <div class="greeting-badge" style="background: rgba(122, 92, 204, 0.1); border-color: rgba(122, 92, 204, 0.3); color: var(--color-deep-purple);">
        <span>${i18n.t("langLearningDesc")}</span>
      </div>

      <!-- File Selector Card -->
      <div class="glass-card">
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">
          ${i18n.t("selectDocFilePrompt")}
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="file" id="file-lang-input" accept=".docx,.pdf,.txt,.md" style="display: none;">
          <button class="btn btn-secondary" id="btn-browse-lang">
            ${renderSF("doc.text", { size: "14px" })} ${i18n.t("selectFileBtn")}
          </button>
          <div style="font-size: var(--text-sm); color: var(--text-secondary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="lbl-selected-lang-filename">
            ${modalState.selectedFileName || i18n.t("noFileSelected")}
          </div>
        </div>
      </div>

      <!-- Quiz Title -->
      <div>
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
          TÊN ĐỀ THI NGOẠI NGỮ:
        </label>
        <input type="text" class="form-input" id="input-lang-quiz-title" placeholder="Đề thi Tiếng Anh THPT Quốc gia..." value="${escapeHtml(modalState.quizTitle || '')}">
      </div>

      <!-- CEFR Level -->
      <div class="glass-card">
        <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
          ${i18n.t("cefrSelectorLabel")}
        </label>
        <select class="form-select" id="select-import-cefr">
          ${Object.values(CEFR_LEVELS).map(lvl => `
            <option value="${lvl.id}" ${modalState.targetCEFR === lvl.id ? 'selected' : ''}>${lvl.label}</option>
          `).join('')}
        </select>
      </div>
    </div>
  `;
}

function renderPremadeTab(project, modalState) {
  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="glass-card" style="text-align: center; padding: 32px 20px;">
        <div style="margin-bottom: 12px; color: var(--color-ocean-blue);">${renderSF("tray.and.arrow.down", { size: "42px" })}</div>
        <div style="font-size: var(--text-md); font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
          ${i18n.t("selectQuizFilePrompt")}
        </div>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: 16px;">
          Hỗ trợ tệp Zip Bundle (.zip) hoặc tệp JSON (.json) được xuất từ QuizMaster
        </p>

        <input type="file" id="file-premade-input" accept=".zip,.json" style="display: none;">
        <button class="btn btn-primary" id="btn-browse-premade">
          ${i18n.t("selectQuizBtn")}
        </button>
      </div>
    </div>
  `;
}

export function bindImportModalEvents(modalState, handlers) {
  // Close / Cancel
  const closeBtn = document.getElementById("btn-close-import");
  if (closeBtn) closeBtn.onclick = () => handlers.onClose();

  const cancelBtn = document.getElementById("btn-cancel-import");
  if (cancelBtn) cancelBtn.onclick = () => handlers.onClose();

  // Tab buttons
  const tabTHPT = document.getElementById("tab-btn-thpt");
  if (tabTHPT) tabTHPT.onclick = () => handlers.onSwitchTab("thpt");

  const tabGemini = document.getElementById("tab-btn-gemini");
  if (tabGemini) tabGemini.onclick = () => handlers.onSwitchTab("gemini");

  const tabLang = document.getElementById("tab-btn-lang");
  if (tabLang) tabLang.onclick = () => handlers.onSwitchTab("lang");

  const tabPremade = document.getElementById("tab-btn-premade");
  if (tabPremade) tabPremade.onclick = () => handlers.onSwitchTab("premade");

  // THPT File Input
  const browseTHPT = document.getElementById("btn-browse-thpt");
  const fileTHPTInput = document.getElementById("file-thpt-input");
  if (browseTHPT && fileTHPTInput) {
    browseTHPT.onclick = () => fileTHPTInput.click();
    fileTHPTInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlers.onFileSelected(file);
    };
  }

  // General File Input
  const browseDoc = document.getElementById("btn-browse-doc");
  const fileDocInput = document.getElementById("file-doc-input");
  if (browseDoc && fileDocInput) {
    browseDoc.onclick = () => fileDocInput.click();
    fileDocInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlers.onFileSelected(file);
    };
  }

  // Lang File Input
  const browseLang = document.getElementById("btn-browse-lang");
  const fileLangInput = document.getElementById("file-lang-input");
  if (browseLang && fileLangInput) {
    browseLang.onclick = () => fileLangInput.click();
    fileLangInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlers.onFileSelected(file);
    };
  }

  // Premade File Input
  const browsePremade = document.getElementById("btn-browse-premade");
  const filePremadeInput = document.getElementById("file-premade-input");
  if (browsePremade && filePremadeInput) {
    browsePremade.onclick = () => filePremadeInput.click();
    filePremadeInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlers.onPremadeFileSelected(file);
    };
  }

  // Quiz Title Inputs
  const thptTitleInput = document.getElementById("input-thpt-quiz-title");
  if (thptTitleInput) {
    thptTitleInput.oninput = (e) => { modalState.quizTitle = e.target.value; };
  }

  const titleInput = document.getElementById("input-quiz-title");
  if (titleInput) {
    titleInput.oninput = (e) => { modalState.quizTitle = e.target.value; };
  }

  const langTitleInput = document.getElementById("input-lang-quiz-title");
  if (langTitleInput) {
    langTitleInput.oninput = (e) => { modalState.quizTitle = e.target.value; };
  }

  // Checkbox Auto-generate
  const chkAuto = document.getElementById("chk-auto-generate");
  if (chkAuto) {
    chkAuto.onchange = (e) => {
      modalState.isCreateMultipleChoice = e.target.checked;
      handlers.onUpdateView();
    };
  }

  // Depth Buttons
  document.querySelectorAll("[data-depth]").forEach(btn => {
    btn.onclick = () => {
      modalState.depthMode = btn.dataset.depth;
      handlers.onUpdateView();
    };
  });

  // Language Buttons
  document.querySelectorAll("[data-import-lang]").forEach(btn => {
    btn.onclick = () => {
      modalState.aiLanguage = btn.dataset.importLang;
      handlers.onUpdateView();
    };
  });

  // CEFR Selector
  const cefrSelect = document.getElementById("select-import-cefr");
  if (cefrSelect) {
    cefrSelect.onchange = (e) => { modalState.targetCEFR = e.target.value; };
  }

  // Scan Actions
  const thptScanBtn = document.getElementById("btn-start-thpt-scan");
  if (thptScanBtn) thptScanBtn.onclick = () => handlers.onStartTHPTScan();

  const scanBtn = document.getElementById("btn-start-gemini-scan");
  if (scanBtn) scanBtn.onclick = () => handlers.onStartGeminiScan();

  const langScanBtn = document.getElementById("btn-start-lang-scan");
  if (langScanBtn) langScanBtn.onclick = () => handlers.onStartLanguageScan();
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

