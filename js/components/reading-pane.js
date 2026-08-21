/**
 * QuizMaster Web - Reading Passage Pane Component
 */

export function renderReadingPassagePane(passageText, state, onStateChange) {
  if (!passageText || !passageText.trim()) return "";

  const themeClass = state.theme ? `reading-theme-${state.theme}` : "";
  let fontFamilyStyle = "Georgia, 'Times New Roman', serif";
  if (state.fontFamily === "sans") {
    fontFamilyStyle = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  } else if (state.fontFamily === "mono") {
    fontFamilyStyle = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
  } else if (state.fontFamily === "system") {
    fontFamilyStyle = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  }
  
  const fontSizeDelta = Number(state.fontSizeDelta) || 0;
  const fontSizeStyle = `calc(1.05rem + ${fontSizeDelta * 3}px)`;
  const lineSpacingStyle = `${state.lineSpacing || 1.65}`;
  const isBold = state.isBold ? "font-weight: 600;" : "font-weight: 400;";

  return `
    <div class="reading-pane ${themeClass}">
      <div class="reading-pane-header">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: var(--color-deep-purple); font-size: 16px;">📖</span>
          <span style="font-size: var(--text-xs); font-weight: 700; color: var(--color-deep-purple);">Đoạn văn đọc hiểu</span>
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
              <button class="segment-btn ${!state.fontFamily || state.fontFamily === 'serif' ? 'active' : ''}" data-font="serif">Có chân</button>
              <button class="segment-btn ${state.fontFamily === 'sans' ? 'active' : ''}" data-font="sans">Không chân</button>
              <button class="segment-btn ${state.fontFamily === 'mono' ? 'active' : ''}" data-font="mono">Đơn cách</button>
              <button class="segment-btn ${state.fontFamily === 'system' ? 'active' : ''}" data-font="system">Hệ thống</button>
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

      <div class="reading-content-scroll" style="font-family: ${fontFamilyStyle} !important; font-size: ${fontSizeStyle} !important; line-height: ${lineSpacingStyle} !important; ${isBold}">
        ${formatMarkdownHTML(passageText)}
      </div>
    </div>
  `;
}

export function bindReadingPaneEvents(state, updateStateCallback) {
  const decBtn = document.getElementById("btn-font-dec");
  if (decBtn) {
    decBtn.onclick = (e) => {
      e.stopPropagation();
      state.fontSizeDelta = (Number(state.fontSizeDelta) || 0) - 1;
      if (state.fontSizeDelta < -4) state.fontSizeDelta = -4;
      updateStateCallback(state);
    };
  }

  const incBtn = document.getElementById("btn-font-inc");
  if (incBtn) {
    incBtn.onclick = (e) => {
      e.stopPropagation();
      state.fontSizeDelta = (Number(state.fontSizeDelta) || 0) + 1;
      if (state.fontSizeDelta > 8) state.fontSizeDelta = 8;
      updateStateCallback(state);
    };
  }

  const toggleDrawer = document.getElementById("btn-toggle-reading-drawer");
  if (toggleDrawer) {
    toggleDrawer.onclick = (e) => {
      e.stopPropagation();
      state.showDrawer = !state.showDrawer;
      updateStateCallback(state);
    };
  }

  document.querySelectorAll(".reading-customizer-drawer button[data-theme]").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      state.theme = btn.dataset.theme;
      updateStateCallback(state);
    };
  });

  document.querySelectorAll(".reading-customizer-drawer button[data-font]").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
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
    resetBtn.onclick = (e) => {
      e.stopPropagation();
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
  let text = String(rawText)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code block fences
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, '<pre><code class="code-block">$2</code></pre>');
  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold: **word** or __word__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic: *word* or _word_
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Convert line breaks to paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<pre>") && trimmed.endsWith("</pre>")) return trimmed;
    return `<p style="margin-bottom: 0.65em; line-height: 1.55;">${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('');
}
