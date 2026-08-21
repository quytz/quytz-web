/**
 * QuizMaster Web - Sidebar View Component
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { calculateProjectStats } from "../models/types.js";

export function renderSidebar(selectedProjectId, appState) {
  const currentHour = new Date().getHours();
  const greeting = getTimeGreeting(currentHour);
  const isOpen = !!appState.isMobileSidebarOpen;

  return `
    <aside class="app-sidebar ${isOpen ? 'sidebar-open' : ''}" id="app-sidebar">
      <div class="sidebar-header">
        <div class="brand-row">
          <img src="assets/AppIcon.png" alt="QuizMaster Icon" class="brand-icon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><rect fill=\\'%231f7ae8\\' width=\\'100\\' height=\\'100\\' rx=\\'22\\'/><text fill=\\'white\\' font-size=\\'45\\' font-family=\\'sans-serif\\' font-weight=\\'bold\\' x=\\'50\\' y=\\'64\\' text-anchor=\\'middle\\'>QM</text></svg>'">
          <div class="brand-info">
            <div class="brand-title">${i18n.t("appName")}</div>
            <div class="brand-subtitle">${i18n.t("projects")}</div>
          </div>
          <button class="btn btn-ghost btn-icon-only" id="btn-open-settings" title="${i18n.t("settings")}" style="font-size: 1.35rem; width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center;">
            ⚙️
          </button>
          <button class="btn btn-ghost btn-icon-only mobile-menu-btn" id="btn-close-sidebar" title="Đóng thanh bên" style="display: none;">
            ✕
          </button>
        </div>

        <div class="greeting-badge">
          <span>${greeting.emoji}</span>
          <span>${greeting.text}</span>
        </div>
      </div>

      <div class="project-list-container" id="project-list-container">
        ${storage.projects.length === 0 ? `
          <div style="text-align: center; padding: 32px 16px; color: var(--text-secondary);">
            <div style="font-size: 36px; margin-bottom: 8px;">📂</div>
            <div style="font-size: var(--text-sm);">${i18n.t("noProjects")}</div>
          </div>
        ` : storage.projects.map(project => {
          const stats = calculateProjectStats(project);
          const isSelected = project.id === selectedProjectId;
          const isLL = project.projectType === "languageLearning";

          return `
            <div class="project-item ${isSelected ? 'active' : ''} ${isLL ? 'is-ll' : ''}" data-project-id="${project.id}">
              <div class="project-icon-box">
                ${isLL ? '📖' : '📁'}
              </div>
              <div class="project-details">
                <div class="project-name">${escapeHtml(project.name)}</div>
                <div class="project-meta">
                  ${project.quizzes.length} ${i18n.t("quizzesCount")} • ${stats.totalQuestions} ${i18n.t("questionsCount")}
                </div>
              </div>
              ${stats.masteryPercentage > 0 ? `
                <span class="badge ${stats.masteryPercentage >= 75 ? 'badge-green' : 'badge-blue'}">
                  ${stats.masteryPercentage}%
                </span>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="sidebar-footer">
        <button class="btn btn-primary" id="btn-add-project" style="width: 100%;">
          <span>＋</span> ${i18n.t("addProject")}
        </button>
      </div>
    </aside>
  `;
}

export function bindSidebarEvents(appState, onProjectSelect, onNewProject, onOpenSettings, onCloseSidebar) {
  document.querySelectorAll(".project-item").forEach(item => {
    item.onclick = () => {
      const pid = item.dataset.projectId;
      onProjectSelect(pid);
    };
  });

  const addBtn = document.getElementById("btn-add-project");
  if (addBtn) addBtn.onclick = () => onNewProject();

  const settingsBtn = document.getElementById("btn-open-settings");
  if (settingsBtn) settingsBtn.onclick = () => onOpenSettings();

  const closeSidebarBtn = document.getElementById("btn-close-sidebar");
  if (closeSidebarBtn) closeSidebarBtn.onclick = () => {
    if (onCloseSidebar) onCloseSidebar();
  };
}

function getTimeGreeting(hour) {
  if (hour >= 5 && hour < 11) {
    const opts = [
      "Chào buổi sáng! Làm tách cà phê rồi vào cày đề nào ☕",
      "Sáng sớm tinh mơ, bộ não đang ở đỉnh cao phong độ! 🧠",
      "Dậy sớm để thành công... hoặc để giải nốt bộ đề này! 🚀"
    ];
    return { emoji: "🌅", text: opts[hour % opts.length] };
  } else if (hour >= 11 && hour < 14) {
    const opts = [
      "Chào giữa trưa! Vừa nghỉ trưa vừa nạp thêm vài câu trắc nghiệm 🍱",
      "Nắng đã lên cao, điểm số cũng phải lên theo! ☀️",
      "Nghỉ trưa ôn bài, chiều thi bao đậu! 🚀"
    ];
    return { emoji: "☀️", text: opts[hour % opts.length] };
  } else if (hour >= 14 && hour < 18) {
    const opts = [
      "Chào buổi chiều! Làm ly trà sữa cho tỉnh táo rồi ôn tập tiếp 🧋",
      "Chiều rồi, làm vài câu trắc nghiệm xả stress nào! ⚡",
      "Năng lượng buổi chiều cực sung, cày nốt bài giảng nào! 📚"
    ];
    return { emoji: "🌤️", text: opts[hour % opts.length] };
  } else if (hour >= 18 && hour < 23) {
    const opts = [
      "Chào buổi tối! Đèn sách ban đêm luôn mang lại điểm cao 🌙",
      "Cú đêm học bài! Quyết tâm không thua đứa bạn cùng lớp 🦉",
      "Tối mát mẻ, làm vài đề luyện tập rồi thư giãn nào 🚀"
    ];
    return { emoji: "🌙", text: opts[hour % opts.length] };
  } else {
    const opts = [
      "Nửa đêm rồi! Học muộn thế này là thi chắc chắn 10 điểm! 🌌",
      "Ngủ sớm đi bạn ơi... thôi làm nốt câu này rồi ngủ! 😴",
      "Học đêm yên tĩnh, kiến thức ngấm cực sâu! 🕯️"
    ];
    return { emoji: "🌌", text: opts[hour % opts.length] };
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
