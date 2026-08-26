# Changelog

All notable changes to the **Quýtz Web** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.0.1] - 2026-08-26

### Added & Rebranded
- **Rebrand: QuizMaster ➔ Quýtz**:
  - Rebranded the application name to **Quýtz** (play on *Quýt* 🍊 + *Quiz*).
  - Adopted a vibrant mandarin orange / quýt citrus color scheme (`#fa5a0e` & `#ffb820`) across buttons, badges, ambient glass glows, and icons.
  - Updated all labels, documentation, splash screen, and storage keys with backward-compatible migration for existing user data.

---

## [v2.0.0] - 2026-08-25

### Added
- **Third "THPT Quốc gia" Project Mode (3-Part MOET Exam Format - WIP)**:
  - Added a dedicated THPT Quốc Gia project mode distinct from General and Language Learning modes with prominent WIP badge & warning indicators.
  - **Phần I**: Multiple choice (1 of 4 choices; 0.25 points per correct answer).
  - **Phần II**: True / False Group (4 sub-items a, b, c, d; official MOET scoring formula: 1 correct = 0.1đ, 2 correct = 0.25đ, 3 correct = 0.5đ, 4 correct = 1.0đ).
  - **Phần III**: Short answer fill-in with numeric and string matching (0.25đ / 0.5đ per question).
  - **Comprehensive Mode Support**:
    - **Practice Mode**: Interactive True/False sub-item toggles and short answer input with instant feedback and score computation.
    - **Exam Mode**: Full countdown exam taking across all 3 question parts.
    - **Review Modal**: Detailed sub-item breakdown and short answer comparison against answer keys.
    - **Ending Dialog**: Official 10.0 scale scoring with individual score breakdowns for Part I, Part II, and Part III.
    - **Quiz Editor**: Dynamic form supporting creation and customization of all 3 question types.
    - **Gemini AI Scanner**: Dedicated prompt and parser to scan and extract THPT Quốc gia exam documents into the 3-part structure.
    - **Demo THPT Project**: Pre-loaded with a comprehensive THPT National Exam in Mathematics.
- **Card Reset Progress Button**:
  - Added a direct progress reset button next to the direct edit pencil and 3-dot options menu on completed/practiced quiz cards.
- **SF Symbols Vector Icons System**:
  - Implemented an SVG-based SF Symbols icon engine (`renderSF`) replacing emojis across the sidebar, dashboard, navigation, study views, modals, and buttons with crisp Apple-styled vector icons (excluding greetings).

### Fixed & Improved
- **Header Bar 2-Row Layout**:
  - Refactored the dashboard top header into a 2-row layout (`.top-header-primary` and `.top-header-toolbar`), ensuring the project name remains fully visible at all times regardless of browser zoom level or screen width.
- **DOCX Math & Binary MTEF v5 Parsing**:
  - Engineered a native MathType MTEF v5 binary decoder in `document-parser.js` converting MathType formulas inside OLE compound streams directly into LaTeX formulas ($\vec{u}, \vec{v}, \frac{a}{b}, \sqrt{x}, \int, [0; 40)$).
- **Cross-Batch Image Token Tracking**:
  - Synchronized image token state across section batches in `gemini.js` to ensure diagrams and illustrations are uniquely matched to questions without repeated duplicates.
- **Accurate Section Boundary Detection**:
  - Fixed false answer key regex matching to prevent slicing exam questions mid-sentence.

---

## [v1.1.0] - 2026-08-22

### Added
- **Completed Card Rainbow Gradient & Signature Blue Theme**: Completed quiz cards feature a vibrant 5-color rainbow border with frosted glass backdrop, while active projects, pill buttons, and segmented tabs use the app icon's signature ocean blue gradient.
- **Project 3-Dot Options Action Sheet**: Added a 3-dot (`⋯`) button on each sidebar project allowing users to rename projects, reset all quiz progress, or delete projects with confirmation.
- **Time-Accurate & Interactive Greetings**: Expanded the greeting database with dozens of motivational, witty, and cheesy lines. Tapping the greeting badge dynamically selects from the time-accurate pool (morning, noon, afternoon, evening, night).
- **Author Message Easter Egg**: Double-clicking/tapping the author name in Settings displays an author message popup.
- **National Anthem Easter Egg**: Subtle footer text `QuizMaster v1.1.0 © 2026 | Made in Vietnam` triggers a national anthem popup upon double-tapping/clicking.
- **Exam Mode Shortcuts Strip**: Added bottom keyboard shortcuts guide strip (`A B C D • ← → Chuyển câu`) to Exam Mode.
- **Mandatory 2s Splash Screen**: Smooth 2-second startup animation ensuring assets are cleanly loaded.

### Fixed & Improved
- **Redo Wrong Answers Live Mastery Update**: Fixed the "Làm lại câu sai" mode to isolate wrong questions and immediately synchronize newly corrected answers with parent quiz progress and review modal.
- **Reading Passage Drawer Controls**: Fixed font size buttons (`A-`, `A+`) with reactive 3px step scaling, removed "Bo tròn", and added the "Hệ thống" system typography option.
- **Mobile & High-Scaling Header Adaptability**:
  - **Dashboard**: "Nhập Tài liệu" and toolbar buttons adapt cleanly to multi-row layout without squeezed text.
  - **Practice & Exam Modes**: Responsive 2-row header separating quiz title and controls.
  - **Flashcard Mode**: Responsive top bar keeping the "Danh sách thẻ" button and CEFR filter visible.
- **Flashcard 3D Flip Animation & Button Ordering**: Restored hardware-accelerated 3D flip animation and ordered the green "Đã thuộc bài" button before the red "Chưa thuộc" button.
- **Quiz Editor Mobile Rework**: Redesigned quiz editor with horizontal scrolling question chips and a full-width touch form.
- **Standardized Typography**: Clean Sentence and Title Case across all modal headers, badges, and labels.
- **Direct Quiz Card Edit Button**: Restored the direct pencil edit button (`✏️`) on quiz card headers.

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
