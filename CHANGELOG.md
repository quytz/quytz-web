# Changelog

All notable changes to the **QuizMaster Web** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
