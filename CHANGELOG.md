# Changelog

All notable changes to the **QuizMaster Web** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.2] - 2026-08-21

### Added
- **Rainbow Gradient CTA Button**: Applied a vibrant animated rainbow gradient (`.btn-rainbow`) to the primary "Nhập Tài liệu" (Import Document) action button for high visual contrast and modern polish.
- **Two-Section API Key Q&A Dialog**: Split the setup wizard API Key Q&A popup into two distinct, card-formatted sections:
  1. *"API Key là gì?"* explaining what a Google AI Studio API Key is and why it must not be shared.
  2. *"Tại sao lại yêu cầu tự cấu hình API Key?"* explaining user privacy, free usage quotas, and open-source sustainability.

### Fixed & Improved
- **Clean Settings Navigation & Larger Gear Icon**: Consolidated settings access to a prominent, enlarged gear icon (`⚙️`) in the sidebar header and eliminated the redundant top-right settings button on the dashboard.
- **Mobile & High-Scaling Header Adaptability**: Refactored the dashboard header bar to smoothly adapt into a clean 2-row layout on mobile devices and enlarged browser text settings, preventing the "Xáo trộn" and "Chọn nhiều" buttons from getting squeezed or hiding their labels.
- **Practice Mode AI Tutor Button**: Restored the `✨` emoji to the "✨ Hỏi AI" (Ask AI) button in Practice Mode.

---

## [v1.0.1] - 2026-08-21

### Added
- **Setup Wizard Q&A Popup**: Added an informative modal button *"Tại sao lại yêu cầu API Key?"* next to the Continue button on Step 2 of the setup wizard, clearly explaining why individual Google AI Studio API Keys are used to protect user privacy and keep the app free and open-source.
- **Exam Mode Timer Options**: Added a timer configuration dialog before starting exams (single and multi-quiz sessions), supporting preset durations (15m, 25m Pomodoro, 45m Standard, 60m, 90m), custom minute inputs, and an "Unlimited Time" mode with no auto-submit.
- **Rich Markdown Formatting**: Added support for inline code snippets (`` `code` ``) and code blocks in `formatMarkdownHTML`, alongside enhanced bold (`**...**`), italic (`*...*`), and paragraph formatting.

### Changed
- **Typography & Weights in Flashcards**: Changed `.flashcard-main-text`, `.flashcard-answer-text`, `.question-text`, and `.option-btn-text` to normal font weight (`font-weight: 450`) so that bold keywords (`<strong>`) stand out distinctly with high contrast instead of rendering all text as uniform heavy bold.
- **Reduced Button Emojis**: Removed excessive emoji prefixes across action buttons, segmented controls, modal footers, and 3-dot action sheets across all views for a cleaner, modern interface.
- **Fluid UI & Responsive Box Scaling**:
  - Replaced hardcoded `html, body { font-size: 16px; }` with `html { font-size: 100%; } body { font-size: 1rem; }` to naturally adapt to browser and OS-level text size preferences.
  - Redesigned cards, settings dialogs, segmented controls, input groups, and buttons to use flexible wrapping and auto-expanding dimensions (`overflow: visible`, `min-width: 0`, `flex-wrap: wrap`), eliminating box overflow and text truncation.
  - Constrained all modal dialogs with `max-height: 90vh; max-height: 90dvh;` and scrollable `.modal-body`.
- **Viewport Scaling**: Updated `meta[name="viewport"]` to allow accessible scaling and zoom (`viewport-fit=cover`).

---

## [v1.0.0] - 2026-08-21

### Initial Release
- **Zero Backend Architecture**: Complete client-side web edition of QuizMaster with zero hosting costs, client-side PDF (`pdf.js`) and Word (`jszip`) document text extraction.
- **Gemini AI Quiz Generation**: Integration with Google Gemini 3.5 Flash Lite API supporting Core, Normal, and Thorough depth extraction modes.
- **Study Modes**: Immediate feedback Practice Mode, Anti-cheat Exam Mode with live countdown, and 3D Spaced Repetition Flashcard Mode with keyboard shortcuts.
- **Export & Portability**: Support for Quiz Zip Bundle export/import, Word (`.docx`) exam export, and database backup/restore.
- **Language Learning & CEFR (WIP)**: Parallel reading passage pane with custom typography/themes and CEFR vocabulary classification.
- **Apple Liquid Glass Design**: Full Dark, Light, and System theme support with mobile off-canvas drawer navigation.
