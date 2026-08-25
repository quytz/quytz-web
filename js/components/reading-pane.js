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

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cleanMathFallback(expr) {
  let s = String(expr);
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)");
  s = s.replace(/\\cdot/g, "·");
  s = s.replace(/\\approx/g, "≈");
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\le(q)?\b/g, "≤");
  s = s.replace(/\\ge(q)?\b/g, "≥");
  s = s.replace(/\\ne(q)?\b/g, "≠");
  s = s.replace(/\\inft?y\b/g, "∞");
  s = s.replace(/\\pm\b/g, "±");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
  s = s.replace(/\\left\(/g, "(").replace(/\\right\)/g, ")");
  s = s.replace(/\\vec\{([^}]+)\}/g, "$1⃗");
  return escapeHtml(s);
}

function renderMath(latex, isDisplay = false) {
  if (typeof window !== "undefined" && window.katex && typeof window.katex.renderToString === "function") {
    try {
      return window.katex.renderToString(latex, {
        displayMode: isDisplay,
        throwOnError: false
      });
    } catch (e) {
      console.warn("KaTeX render error:", e);
    }
  }
  const clean = cleanMathFallback(latex);
  if (isDisplay) {
    return `<div class="math-block" style="text-align: center; margin: 0.5em 0; font-family: 'Cambria Math', 'KaTeX_Math', serif; font-style: italic;">${clean}</div>`;
  }
  return `<span class="math-inline" style="font-family: 'Cambria Math', 'KaTeX_Math', serif; font-style: italic;">${clean}</span>`;
}

function parseMarkdownTables(text) {
  const lines = text.split("\n");
  const result = [];
  let inTable = false;
  let tableRows = [];

  const isTableSeparator = (line) => /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line.trim());
  const isTableRow = (line) => line.trim().includes("|") && line.trim().length > 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    if (!inTable && isTableRow(line) && nextLine && isTableSeparator(nextLine)) {
      inTable = true;
      tableRows = [line];
    } else if (inTable) {
      if (isTableRow(line)) {
        tableRows.push(line);
      } else {
        result.push(renderTableHTML(tableRows));
        inTable = false;
        tableRows = [];
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  if (inTable && tableRows.length > 0) {
    result.push(renderTableHTML(tableRows));
  }

  return result.join("\n");
}

function renderTableHTML(rows) {
  if (rows.length < 2) return rows.join("\n");
  const headerRow = rows[0];
  const bodyRows = rows.slice(2);

  const parseCells = (row) => {
    let clean = row.trim();
    if (clean.startsWith("|")) clean = clean.substring(1);
    if (clean.endsWith("|")) clean = clean.substring(0, clean.length - 1);
    return clean.split("|").map(c => c.trim());
  };

  const headers = parseCells(headerRow);
  const theadHtml = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;

  const tbodyHtml = bodyRows.length > 0 ? `<tbody>${bodyRows.map(r => {
    const cells = parseCells(r);
    return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
  }).join('')}</tbody>` : '';

  return `<div class="table-container"><table class="markdown-table">${theadHtml}${tbodyHtml}</table></div>`;
}

function safeHtmlEscape(str) {
  return str
    .replace(/&(?!(?:amp|lt|gt|quot|#39|emsp|ensp|nbsp|plusmn|times|div|infin|approx|ne|le|ge|sub|supe);)/gi, "&amp;")
    .replace(/<(?!(?:\/?(strong|em|p|br|code|pre|div|span|table|thead|tbody|tr|th|td|a|h\d)\b))/gi, "&lt;")
    .replace(/>(?!(?:<\/?[a-z0-9]+[^>]*>))/gi, "&gt;");
}

export function formatMarkdownHTML(rawText) {
  if (!rawText) return "";
  let text = String(rawText);

  // 1. Extract and Protect Code Blocks
  const codeBlocks = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="code-block">${escapeHtml(code)}</code></pre>`);
    return `§§CODEBLOCK${idx}§§`;
  });

  // 1.5 Extract and Protect Images (![alt](src))
  const imageBlocks = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    const idx = imageBlocks.length;
    const safeAlt = escapeHtml(alt);
    imageBlocks.push(`<div class="question-img-container" style="text-align: center; margin: 12px 0;"><img src="${src}" alt="${safeAlt}" class="question-inline-img" style="max-width: 100%; max-height: 420px; border-radius: 8px; border: 1.5px solid var(--border-subtle); box-shadow: 0 2px 10px rgba(0,0,0,0.06); object-fit: contain;">${safeAlt ? `<div style="font-size: var(--text-xs); color: var(--text-secondary); margin-top: 4px; font-style: italic;">${safeAlt}</div>` : ''}</div>`);
    return `§§IMAGEBLOCK${idx}§§`;
  });

  // 2. Extract and Protect Display Math ($$...$$ and \[...\])
  const mathBlocks = [];
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
    const idx = mathBlocks.length;
    mathBlocks.push(renderMath(expr.trim(), true));
    return `§§MATHBLOCK${idx}§§`;
  });
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, expr) => {
    const idx = mathBlocks.length;
    mathBlocks.push(renderMath(expr.trim(), true));
    return `§§MATHBLOCK${idx}§§`;
  });

  // 3. Extract and Protect Inline Math ($...$ and \(...\))
  text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, expr) => {
    const idx = mathBlocks.length;
    mathBlocks.push(renderMath(expr.trim(), false));
    return `§§MATHBLOCK${idx}§§`;
  });
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, expr) => {
    const idx = mathBlocks.length;
    mathBlocks.push(renderMath(expr.trim(), false));
    return `§§MATHBLOCK${idx}§§`;
  });

  // 4. Extract and Protect Inline Code
  const inlineCodes = [];
  text = text.replace(/`([^`]+)`/g, (match, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="inline-code">${escapeHtml(code)}</code>`);
    return `§§INLINECODE${idx}§§`;
  });

  // 5. Parse Markdown Tables
  text = parseMarkdownTables(text);

  // 6. Safe HTML Escape (preserving entity names & table HTML)
  text = safeHtmlEscape(text);

  // 6.5 Chemistry & Math Subscripts and Superscripts (e.g. [Cu(OH2)6]2+, H2SO4, Fe^{2+}, Fe_{2}(SO_{4})_{3})
  text = text.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
  text = text.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
  text = text.replace(/([a-zA-Z\)])\{([0-9]+)\}/g, '$1<sub>$2</sub>');
  text = text.replace(/([a-zA-Z\)\],])_([0-9a-zA-Z+\-]+)(?![a-zA-Z0-9_]*<\/sub>)/g, '$1<sub>$2</sub>');
  text = text.replace(/([a-zA-Z\)\],])\^([0-9a-zA-Z+\-]+)(?![a-zA-Z0-9_]*<\/sup>)/g, '$1<sup>$2</sup>');
  text = text.replace(/~([^~\n]+)~/g, '<sub>$1</sub>');

  // 7. Bold & Italic (using word boundaries to prevent underscores in chemistry/math from breaking)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/(^|[\s\(\[\{])_([^\s_][^_]*[^\s_])_([\s\)\]\}\.,:;!\?]|$)/g, '$1<em>$2</em>$3');

  // 8. Restore Placeholders
  text = text.replace(/§§INLINECODE(\d+)§§/g, (m, i) => inlineCodes[Number(i)] || "");
  text = text.replace(/§§MATHBLOCK(\d+)§§/g, (m, i) => mathBlocks[Number(i)] || "");
  text = text.replace(/§§IMAGEBLOCK(\d+)§§/g, (m, i) => imageBlocks[Number(i)] || "");
  text = text.replace(/§§CODEBLOCK(\d+)§§/g, (m, i) => codeBlocks[Number(i)] || "");

  // 9. Convert paragraphs & line breaks, preserving indentation
  const blocks = text.split(/\n{2,}/);
  return blocks.map(b => {
    const trimmed = b.replace(/^\n+|\n+$/g, '');
    if (!trimmed) return "";
    if (trimmed.startsWith("<pre>") || trimmed.startsWith("<div class=\"table-container\"") || trimmed.startsWith("<div class=\"math-block\"") || trimmed.startsWith("<div class=\"question-img-container\"")) {
      return trimmed;
    }
    return `<div class="formatted-paragraph" style="margin-bottom: 0.65em; line-height: 1.6; white-space: pre-wrap;">${trimmed.replace(/\n/g, '<br>')}</div>`;
  }).filter(Boolean).join('');
}

