/**
 * QuizMaster Web - Quiz Editor Modal Component
 */
import { i18n } from "../localization/i18n.js";
import { createQuestion, createQuestionOption } from "../models/types.js";

export function renderQuizEditorModal(quiz, editorState) {
  const currentIdx = editorState.selectedQuestionIndex || 0;
  const questions = editorState.draftQuestions || [];
  const currentQ = questions[currentIdx] || null;

  return `
    <div class="modal-overlay open" id="editor-modal-overlay">
      <div class="modal-container editor-modal-container">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">✏️</span>
            <div>
              <h2 style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">
                Chỉnh sửa Bộ đề: ${escapeHtml(quiz.title)}
              </h2>
              <div style="font-size: var(--text-xs); color: var(--text-secondary);">
                ${questions.length} câu hỏi trong bộ đề
              </div>
            </div>
          </div>

          <button class="btn btn-ghost btn-icon-only" id="btn-close-editor">✕</button>
        </div>

        <!-- Mobile Question Strip (horizontal scrolling chips) -->
        <div class="editor-mobile-q-strip">
          <button class="btn-add-chip" id="btn-editor-add-q-mobile">＋ Thêm câu</button>
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
                ＋ Thêm câu
              </button>
            </div>

            <div class="editor-questions-list">
              ${questions.map((q, idx) => `
                <div class="project-item ${idx === currentIdx ? 'active' : ''}" data-editor-q-idx="${idx}">
                  <span class="badge ${idx === currentIdx ? 'badge-blue' : 'badge-gray'}" style="font-size: 10px;">
                    Câu ${idx + 1}
                  </span>
                  <div style="font-size: var(--text-xs); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    ${escapeHtml(q.text || 'Câu hỏi chưa có nội dung...')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right Question Detail Form -->
          <div class="editor-form-area">
            ${currentQ ? `
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                  <span class="badge badge-blue">Chi tiết Câu hỏi ${currentIdx + 1} / ${questions.length}</span>
                  <button class="btn btn-secondary" id="btn-editor-delete-q" style="color: var(--color-coral-red); font-size: var(--text-xs); white-space: nowrap;">
                    Xóa câu này
                  </button>
                </div>

                <div>
                  <label style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 4px;">NỘI DUNG CÂU HỎI:</label>
                  <textarea class="form-textarea" id="editor-q-text" rows="3" style="width: 100%; resize: vertical;">${escapeHtml(currentQ.text)}</textarea>
                </div>

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

  // Inputs
  const qTextInput = document.getElementById("editor-q-text");
  if (qTextInput) {
    qTextInput.oninput = (e) => handlers.onUpdateQuestionText(e.target.value);
  }

  const qExplInput = document.getElementById("editor-q-explanation");
  if (qExplInput) {
    qExplInput.oninput = (e) => handlers.onUpdateExplanation(e.target.value);
  }

  document.querySelectorAll(".editor-opt-input").forEach(input => {
    input.oninput = (e) => {
      const idx = parseInt(input.dataset.optIdx, 10);
      handlers.onUpdateOptionText(idx, e.target.value);
    };
  });

  document.querySelectorAll("[data-mark-correct-idx]").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.markCorrectIdx, 10);
      handlers.onSetCorrectOption(idx);
    };
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
