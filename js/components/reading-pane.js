/**
 * QuizMaster Web - Reading Passage Pane Component
 */

export function renderReadingPassagePane(passageText, state, onStateChange) {
  if (!passageText || !passageText.trim()) return "";

  const themeClass = state.theme ? `reading-theme-${state.theme}` : "";
  const fontFamilyStyle = state.fontFamily === "serif"
    ? "var(--font-family-serif)"
    : (state.fontFamily === "rounded" ? "var(--font-family-rounded)" : (state.fontFamily === "mono" ? "var(--font-family-mono)" : "var(--font-family-system)"));
  
  const fontSizeStyle = `calc(14px * var(--font-scale) + ${state.fontSizeDelta || 0}px)`;
  const lineSpacingStyle = `${state.lineSpacing || 1.6}`;
  const isBold = state.isBold ? "font-weight: 600;" : "font-weight: 400;";

  return `
    <div class="reading-pane ${themeClass}">
      <div class="reading-pane-header">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: var(--color-deep-purple); font-size: 16px;">📖</span>
          <span style="font-size: var(--text-xs); font-weight: 800; color: var(--color-deep-purple); letter-spacing: 0.05em;">ĐOẠN VĂN ĐỌC HIỂU</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button class="btn btn-secondary btn-icon-only" id="btn-font-dec" title="Giảm cỡ chữ" style="font-size: 11px; font-weight: 800;">A-</button>
          <button class="btn btn-secondary btn-icon-only" id="btn-font-inc" title="Tăng cỡ chữ" style="font-size: 11px; font-weight: 800;">A+</button>
          <button class="btn btn-pill ${state.showDrawer ? 'active' : 'btn-secondary'}" id="btn-toggle-reading-drawer" style="font-size: 11px;">
            ⚙️ Tùy chỉnh
          </button>
        </div>
      </div>

      ${state.showDrawer ? `
        <div class="reading-customizer-drawer">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: var(--text-xs); font-weight: 600; color: var(--text-secondary); width: 60px;">Màu nền:</span>
            <div class="segmented-control" style="flex: 1;">
              <button class="segment-btn ${!state.theme || state.theme === 'standard' ? 'active' : ''}" data-theme="standard">Tự động</button>
              <button class="segment-btn ${state.theme === 'sepia' ? 'active' : ''}" data-theme="sepia">Sepia 📖</button>
              <button class="segment-btn ${state.theme === 'paper' ? 'active' : ''}" data-theme="paper">Trắng 📄</button>
              <button class="segment-btn ${state.theme === 'slate' ? 'active' : ''}" data-theme="slate">Tối 🌙</button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: var(--text-xs); font-weight: 600; color: var(--text-secondary); width: 60px;">Kiểu chữ:</span>
            <div class="segmented-control" style="flex: 1;">
              <button class="segment-btn ${state.fontFamily === 'serif' ? 'active' : ''}" data-font="serif">Có chân</button>
              <button class="segment-btn ${state.fontFamily === 'system' ? 'active' : ''}" data-font="system">Mặc định</button>
              <button class="segment-btn ${state.fontFamily === 'rounded' ? 'active' : ''}" data-font="rounded">Bo tròn</button>
              <button class="segment-btn ${state.fontFamily === 'mono' ? 'active' : ''}" data-font="mono">Đơn cách</button>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <label class="custom-checkbox" style="font-size: var(--text-xs);">
              <input type="checkbox" id="chk-reading-bold" ${state.isBold ? 'checked' : ''}> In đậm
            </label>
            <button class="btn btn-ghost" id="btn-reading-reset" style="font-size: 11px; color: var(--color-ocean-blue);">Khôi phục mặc định</button>
          </div>
        </div>
      ` : ''}

      <div class="reading-content-scroll" style="font-family: ${fontFamilyStyle}; font-size: ${fontSizeStyle}; line-height: ${lineSpacingStyle}; ${isBold}">
        ${formatMarkdownHTML(passageText)}
      </div>
    </div>
  `;
}

export function bindReadingPaneEvents(state, updateStateCallback) {
  const decBtn = document.getElementById("btn-font-dec");
  if (decBtn) {
    decBtn.onclick = () => {
      if ((state.fontSizeDelta || 0) > -4) {
        state.fontSizeDelta = (state.fontSizeDelta || 0) - 1;
        updateStateCallback(state);
      }
    };
  }

  const incBtn = document.getElementById("btn-font-inc");
  if (incBtn) {
    incBtn.onclick = () => {
      if ((state.fontSizeDelta || 0) < 12) {
        state.fontSizeDelta = (state.fontSizeDelta || 0) + 1;
        updateStateCallback(state);
      }
    };
  }

  const toggleDrawer = document.getElementById("btn-toggle-reading-drawer");
  if (toggleDrawer) {
    toggleDrawer.onclick = () => {
      state.showDrawer = !state.showDrawer;
      updateStateCallback(state);
    };
  }

  document.querySelectorAll(".reading-customizer-drawer button[data-theme]").forEach(btn => {
    btn.onclick = () => {
      state.theme = btn.dataset.theme;
      updateStateCallback(state);
    };
  });

  document.querySelectorAll(".reading-customizer-drawer button[data-font]").forEach(btn => {
    btn.onclick = () => {
      state.fontFamily = btn.dataset.font;
      updateStateCallback(state);
    };
  });

  const chkBold = document.getElementById("chk-reading-bold");
  if (chkBold) {
    chkBold.onchange = (e) => {
      state.isBold = e.target.checked;
      updateStateCallback(state);
    };
  }

  const resetBtn = document.getElementById("btn-reading-reset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      state.fontSizeDelta = 0;
      state.theme = "standard";
      state.fontFamily = "serif";
      state.isBold = false;
      updateStateCallback(state);
    };
  }
}

export function formatMarkdownHTML(rawText) {
  if (!rawText) return "";
  let text = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code block fences
  text = text.replace(/```[a-z]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Bold: **word** or __word__
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Italic: *word* or _word_
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Underline tags: [underlined]
  text = text.replace(/\[([^\]]+)\]/g, '<u>$1</u>');

  // Convert line breaks to paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.map(p => `<p style="margin-bottom: 12px;">${p.replace(/\n/g, '<br>')}</p>`).join('');
}
