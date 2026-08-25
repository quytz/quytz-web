/**
 * QuizMaster Web - Quiz Editor Modal Component
 */
import { i18n } from "../localization/i18n.js";
import { createQuestion, createQuestionOption, createSubItem } from "../models/types.js";
import { renderSF } from "../components/icons.js";

export function renderQuizEditorModal(quiz, editorState) {
  const currentIdx = editorState.selectedQuestionIndex || 0;
  const questions = editorState.draftQuestions || [];
  const currentQ = questions[currentIdx] || null;

  const isPart2 = currentQ && (currentQ.part === "part2" || currentQ.questionType === "trueFalseGroup");
  const isPart3 = currentQ && (currentQ.part === "part3" || currentQ.questionType === "shortAnswer");
  const isPart1 = !isPart2 && !isPart3;

  return `
    <div class="modal-overlay open" id="editor-modal-overlay">
      <div class="modal-container editor-modal-container">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${renderSF("square.and.pencil", { size: "22px" })}
            <div>
              <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
                Chỉnh sửa Bộ đề: ${escapeHtml(quiz.title)}
              </h2>
              <div style="font-size: var(--text-xs); color: var(--text-secondary);">
                ${questions.length} câu hỏi trong bộ đề
              </div>
            </div>
          </div>

          <button class="btn btn-ghost btn-icon-only" id="btn-close-editor">
            ${renderSF("xmark", { size: "14px" })}
          </button>
        </div>

        <!-- Mobile Question Strip -->
        <div class="editor-mobile-q-strip">
          <button class="btn-add-chip" id="btn-editor-add-q-mobile">
            ${renderSF("plus", { size: "12px" })} Thêm câu
          </button>
          ${questions.map((q, idx) => `
            <button class="q-chip ${idx === currentIdx ? 'active' : ''}" data-editor-q-idx="${idx}">
              Câu ${idx + 1}
            </button>
          `).join('')}
        </div>

        <!-- Body Split -->
        <div class="editor-split-body">
          <!-- Left Question List Sidebar -->
          <div class="editor-questions-sidebar">
            <div class="editor-sidebar-header">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary);">DANH SÁCH CÂU HỎI</span>
              <button class="btn btn-pill btn-primary" id="btn-editor-add-q" style="font-size: 11px; padding: 4px 10px;">
                ${renderSF("plus", { size: "12px" })} Thêm câu
              </button>
            </div>

            <div class="editor-questions-list">
              ${questions.map((q, idx) => {
                const qPart = q.part || (q.questionType === "trueFalseGroup" ? "part2" : (q.questionType === "shortAnswer" ? "part3" : "part1"));
                let partBadge = "P.I";
                if (qPart === "part2") partBadge = "P.II";
                if (qPart === "part3") partBadge = "P.III";

                return `
                  <div class="project-item ${idx === currentIdx ? 'active' : ''}" data-editor-q-idx="${idx}">
                    <span class="badge ${idx === currentIdx ? 'badge-blue' : 'badge-gray'}" style="font-size: 10px;">
                      ${partBadge} • Câu ${idx + 1}
                    </span>
                    <div style="font-size: var(--text-xs); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                      ${escapeHtml(q.text || 'Câu hỏi chưa có nội dung...')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Right Question Detail Form -->
          <div class="editor-form-area">
            ${currentQ ? `
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="badge badge-blue">Chi tiết Câu hỏi ${currentIdx + 1} / ${questions.length}</span>
                  <button class="btn btn-secondary" id="btn-editor-delete-q" style="color: var(--color-coral-red); font-size: var(--text-xs); white-space: nowrap;">
                    ${renderSF("trash", { size: "13px" })} Xóa câu này
                  </button>
                </div>

                <!-- Part / Question Type Selector -->
                <div class="glass-card">
                  <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
                    DẠNG CÂU HỎI / PHẦN THI:
                  </label>
                  <div class="segmented-control" style="width: 100%;">
                    <button class="segment-btn ${isPart1 ? 'active' : ''}" data-set-part="part1" style="flex: 1;">
                      Phần I: 4 Lựa chọn
                    </button>
                    <button class="segment-btn ${isPart2 ? 'active' : ''}" data-set-part="part2" style="flex: 1;">
                      Phần II: Đúng / Sai (4 ý)
                    </button>
                    <button class="segment-btn ${isPart3 ? 'active' : ''}" data-set-part="part3" style="flex: 1;">
                      Phần III: Trả lời ngắn
                    </button>
                  </div>
                </div>

                <div>
                  <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">NỘI DUNG CÂU HỎI:</label>
                  <textarea class="form-textarea" id="editor-q-text" rows="3" style="width: 100%; resize: vertical;">${escapeHtml(currentQ.text)}</textarea>
                </div>

                <!-- FORM FOR PART 1: 4 Options Multiple Choice -->
                ${isPart1 ? `
                  <div>
                    <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">CÁC PHƯƠNG ÁN LỰA CHỌN (TÍCH CHỌN ĐÁP ÁN ĐÚNG):</label>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${currentQ.options.map((opt, optIdx) => {
                        const isCorrect = currentQ.correctAnswerIndex === optIdx;

                        return `
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="btn btn-pill ${isCorrect ? 'btn-primary btn-green' : 'btn-secondary'}" data-mark-correct-idx="${optIdx}" style="width: 46px; min-width: 46px; font-weight: 800; flex-shrink: 0;" title="Chọn làm đáp án đúng">
                              ${opt.label} ${isCorrect ? '✓' : ''}
                            </button>
                            <input type="text" class="form-input editor-opt-input" data-opt-idx="${optIdx}" value="${escapeHtml(opt.text)}" style="flex: 1; min-width: 0;">
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- FORM FOR PART 2: True/False Sub-items (a, b, c, d) -->
                ${isPart2 ? `
                  <div>
                    <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">
                      4 Ý KHẲNG ĐỊNH (a, b, c, d) & THIẾT LẬP TÍNH ĐÚNG / SAI:
                    </label>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                      ${(currentQ.subItems || []).map((sub, sIdx) => {
                        return `
                          <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-card); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                            <span class="badge badge-purple" style="font-size: 11px; width: 28px; justify-content: center;">${sub.label || String.fromCharCode(97 + sIdx)}</span>
                            <input type="text" class="form-input editor-sub-text" data-sub-idx="${sIdx}" value="${escapeHtml(sub.text)}" placeholder="Nội dung ý ${sub.label}..." style="flex: 1; min-width: 0;">
                            <div class="segmented-control" style="flex-shrink: 0;">
                              <button class="segment-btn ${sub.isCorrect ? 'active' : ''}" data-set-sub-tf="true" data-sub-idx="${sIdx}" style="padding: 4px 10px; font-size: 11px;">Đúng</button>
                              <button class="segment-btn ${!sub.isCorrect ? 'active' : ''}" data-set-sub-tf="false" data-sub-idx="${sIdx}" style="padding: 4px 10px; font-size: 11px;">Sai</button>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- FORM FOR PART 3: Short Answer -->
                ${isPart3 ? `
                  <div class="glass-card">
                    <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">
                      ĐÁP ÁN CHÍNH XÁC (SỐ HOẶC VĂN BẢN NGẮN):
                    </label>
                    <input type="text" class="form-input" id="editor-short-answer" value="${escapeHtml(currentQ.shortAnswer || '')}" placeholder="Ví dụ: 12.5 hoặc -4 hoặc 2/3" style="font-family: var(--font-family-mono); font-weight: 700; margin-bottom: 8px;">

                    <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                      ĐIỂM CỦA CÂU HỎI (MẶC ĐỊNH 0.25đ HOẶC 0.5đ):
                    </label>
                    <input type="number" step="0.25" min="0.25" max="1.0" class="form-input" id="editor-point-value" value="${currentQ.pointValue || 0.25}" style="max-width: 140px;">
                  </div>
                ` : ''}

                <div>
                  <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">GIẢI THÍCH CHI TIẾT (TÙY CHỌN):</label>
                  <textarea class="form-textarea" id="editor-q-explanation" rows="3" style="width: 100%; resize: vertical;">${escapeHtml(currentQ.explanation || '')}</textarea>
                </div>
              </div>
            ` : `
              <div style="text-align: center; padding: 48px; color: var(--text-secondary);">
                Chọn một câu hỏi ở danh sách hoặc bấm "Thêm câu"
              </div>
            `}
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-editor">Hủy</button>
          <button class="btn btn-primary" id="btn-save-editor">Lưu Thay Đổi</button>
        </div>
      </div>
    </div>
  `;
}

export function bindQuizEditorEvents(editorState, handlers) {
  // Close / Cancel
  const closeBtn = document.getElementById("btn-close-editor");
  if (closeBtn) closeBtn.onclick = () => handlers.onClose();

  const cancelBtn = document.getElementById("btn-cancel-editor");
  if (cancelBtn) cancelBtn.onclick = () => handlers.onClose();

  // Save
  const saveBtn = document.getElementById("btn-save-editor");
  if (saveBtn) saveBtn.onclick = () => handlers.onSave();

  // Add Question (Desktop & Mobile)
  const addBtn = document.getElementById("btn-editor-add-q");
  if (addBtn) addBtn.onclick = () => handlers.onAddQuestion();

  const addBtnMobile = document.getElementById("btn-editor-add-q-mobile");
  if (addBtnMobile) addBtnMobile.onclick = () => handlers.onAddQuestion();

  // Delete Question
  const deleteBtn = document.getElementById("btn-editor-delete-q");
  if (deleteBtn) deleteBtn.onclick = () => handlers.onDeleteQuestion();

  // Select Question
  document.querySelectorAll("[data-editor-q-idx]").forEach(item => {
    item.onclick = () => {
      const idx = parseInt(item.dataset.editorQIdx, 10);
      handlers.onSelectQuestion(idx);
    };
  });

  // Switch Part Type
  document.querySelectorAll("[data-set-part]").forEach(btn => {
    btn.onclick = () => {
      const part = btn.dataset.setPart;
      const currentQ = editorState.draftQuestions[editorState.selectedQuestionIndex];
      if (currentQ) {
        currentQ.part = part;
        if (part === "part1") {
          currentQ.questionType = "multipleChoice";
          currentQ.pointValue = 0.25;
          if (!currentQ.options || currentQ.options.length === 0) {
            currentQ.options = [createQuestionOption("A", ""), createQuestionOption("B", ""), createQuestionOption("C", ""), createQuestionOption("D", "")];
          }
        } else if (part === "part2") {
          currentQ.questionType = "trueFalseGroup";
          currentQ.pointValue = 1.0;
          if (!currentQ.subItems || currentQ.subItems.length === 0) {
            currentQ.subItems = [createSubItem("a", "", true), createSubItem("b", "", false), createSubItem("c", "", true), createSubItem("d", "", false)];
          }
        } else if (part === "part3") {
          currentQ.questionType = "shortAnswer";
          currentQ.pointValue = 0.25;
          if (!currentQ.shortAnswer) currentQ.shortAnswer = "";
        }
        handlers.onUpdateView();
      }
    };
  });

  // Question Text
  const qTextInput = document.getElementById("editor-q-text");
  if (qTextInput) {
    qTextInput.oninput = (e) => handlers.onUpdateQuestionText(e.target.value);
  }

  // Question Explanation
  const qExplInput = document.getElementById("editor-q-explanation");
  if (qExplInput) {
    qExplInput.oninput = (e) => handlers.onUpdateExplanation(e.target.value);
  }

  // Part 1 Option text inputs
  document.querySelectorAll(".editor-opt-input").forEach(input => {
    input.oninput = (e) => {
      const idx = parseInt(input.dataset.optIdx, 10);
      handlers.onUpdateOptionText(idx, e.target.value);
    };
  });

  // Part 1 Mark Correct
  document.querySelectorAll("[data-mark-correct-idx]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.markCorrectIdx, 10);
      handlers.onSetCorrectOption(idx);
    };
  });

  // Part 2 Sub-item text inputs
  document.querySelectorAll(".editor-sub-text").forEach(input => {
    input.oninput = (e) => {
      const idx = parseInt(input.dataset.subIdx, 10);
      const currentQ = editorState.draftQuestions[editorState.selectedQuestionIndex];
      if (currentQ && currentQ.subItems && currentQ.subItems[idx]) {
        currentQ.subItems[idx].text = e.target.value;
      }
    };
  });

  // Part 2 Sub-item True/False toggles
  document.querySelectorAll("[data-set-sub-tf]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.subIdx, 10);
      const isTrue = btn.dataset.setSubTf === "true";
      const currentQ = editorState.draftQuestions[editorState.selectedQuestionIndex];
      if (currentQ && currentQ.subItems && currentQ.subItems[idx]) {
        currentQ.subItems[idx].isCorrect = isTrue;
        handlers.onUpdateView();
      }
    };
  });

  // Part 3 Short Answer input
  const shortAnswerInput = document.getElementById("editor-short-answer");
  if (shortAnswerInput) {
    shortAnswerInput.oninput = (e) => {
      const currentQ = editorState.draftQuestions[editorState.selectedQuestionIndex];
      if (currentQ) currentQ.shortAnswer = e.target.value;
    };
  }

  // Part 3 Point Value input
  const pointValueInput = document.getElementById("editor-point-value");
  if (pointValueInput) {
    pointValueInput.oninput = (e) => {
      const currentQ = editorState.draftQuestions[editorState.selectedQuestionIndex];
      if (currentQ) currentQ.pointValue = parseFloat(e.target.value) || 0.25;
    };
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

