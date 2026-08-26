/**
 * QuizMaster Web - Sidebar View Component
 */
import { i18n } from "../localization/i18n.js";
import { storage } from "../services/storage.js";
import { APP_CONFIG } from "../config.js";
import { calculateProjectStats } from "../models/types.js";
import { renderSF } from "../components/icons.js";

export const MORNING_GREETINGS = [
  { emoji: "🌅", text: "Chào buổi sáng! Làm tách cà phê rồi vào cày đề nào ☕" },
  { emoji: "🧠", text: "Sáng sớm tinh mơ, bộ não đang ở đỉnh cao phong độ! 🧠" },
  { emoji: "🚀", text: "Dậy sớm để thành công... hoặc để giải nốt bộ đề này! 🚀" },
  { emoji: "🍳", text: "Trứng rán cần mỡ, bắp cần bơ, thi không lo thì cày đề ngay giờ! 🍳" },
  { emoji: "☀️", text: "Nắng mai rực rỡ, đề thi khó mấy cũng phải chào thua bạn! ☀️" },
  { emoji: "🌾", text: "Sáng sớm mát lành, làm một đề cho tỉnh táo cả ngày! 🌾" },
  { emoji: "🏃", text: "Chạy bộ rèn sức khỏe, chạy đề rèn tư duy! 🏃" },
  { emoji: "🌻", text: "Hướng dương hướng về mặt trời, còn bạn hướng về điểm 10! 🌻" }
];

export const NOON_GREETINGS = [
  { emoji: "🍱", text: "Chào giữa trưa! Vừa nghỉ trưa vừa nạp thêm vài câu trắc nghiệm 🍱" },
  { emoji: "☀️", text: "Nắng đã lên cao, điểm số cũng phải lên theo! ☀️" },
  { emoji: "🚀", text: "Nghỉ trưa ôn bài, chiều thi bao đậu! 🚀" },
  { emoji: "🍜", text: "Ăn no căng bụng rồi, giải vài câu cho tiêu hóa kiến thức nào! 🍜" },
  { emoji: "🍉", text: "Miếng dưa hấu mát ngọt, bộ đề trắc nghiệm ngọt ngào điểm 10! 🍉" },
  { emoji: "☕", text: "Nạp chút năng lượng giữa trưa để chiều nay bứt phá! ☕" }
];

export const AFTERNOON_GREETINGS = [
  { emoji: "🧋", text: "Chào buổi chiều! Làm ly trà sữa cho tỉnh táo rồi ôn tập tiếp 🧋" },
  { emoji: "⚡", text: "Chiều rồi, làm vài câu trắc nghiệm xả stress nào! ⚡" },
  { emoji: "📚", text: "Năng lượng buổi chiều cực sung, cày nốt bài giảng nào! 📚" },
  { emoji: "🌈", text: "Trời xanh mây trắng nắng vàng, làm xong bộ đề lòng nhẹ thênh thang! 🌈" },
  { emoji: "🌸", text: "Hôm nay em bận yêu đời, hẹn ngày mai nhé... à mà thôi ôn bài đã! 🌸" },
  { emoji: "🎯", text: "Chiều tà buông xuống, mục tiêu ôn thi sắp về đích rồi! 🎯" },
  { emoji: "🧁", text: "Thưởng cho mình cái bánh nhỏ rồi quẩy nốt phần trắc nghiệm! 🧁" }
];

export const EVENING_GREETINGS = [
  { emoji: "🌙", text: "Chào buổi tối! Đèn sách ban đêm luôn mang lại điểm cao 🌙" },
  { emoji: "🦉", text: "Cú đêm học bài! Quyết tâm không thua đứa bạn cùng lớp 🦉" },
  { emoji: "🚀", text: "Tối mát mẻ, làm vài đề luyện tập rồi thư giãn nào 🚀" },
  { emoji: "💖", text: "Đường vào tim ai lắm lối, nhưng đường tới điểm 10 chỉ có cày Quýtz! 💖" },
  { emoji: "✨", text: "Học không chơi đánh rơi tuổi trẻ, học cùng Quýtz tuổi trẻ thăng hoa ✨" },
  { emoji: "🍵", text: "Tối thanh bình, nhâm nhi tách trà ôn lại kiến thức vàng! 🍵" },
  { emoji: "🎵", text: "Bật chút nhạc lofi nhẹ nhàng và chinh phục bài học tối nay! 🎵" }
];

export const NIGHT_GREETINGS = [
  { emoji: "🌌", text: "Nửa đêm rồi! Học muộn thế này là thi chắc chắn 10 điểm! 🌌" },
  { emoji: "😴", text: "Ngủ sớm đi bạn ơi... thôi làm nốt câu này rồi ngủ! 😴" },
  { emoji: "🕯️", text: "Học đêm yên tĩnh, kiến thức ngấm cực sâu! 🕯️" },
  { emoji: "🌟", text: "Cả thế giới đi ngủ, riêng thủ khoa tương lai vẫn đang miệt mài! 🌟" },
  { emoji: "⭐", text: "Sao khuya lấp lánh, soi sáng con đường tri thức của bạn! ⭐" },
  { emoji: "🛌", text: "Nhớ giữ gìn sức khỏe nhé, làm nốt câu này rồi đi ngủ sớm nha! 🛌" }
];

export const TIMELESS_GREETINGS = [
  { emoji: "📡", text: "Alo alo! Vũ trụ gửi tín hiệu bạn sắp đạt 100% điểm bài thi này đấy 📡" },
  { emoji: "💡", text: "Bạn có chiếc đầu rất xịn, đừng để nó rảnh rỗi, giải đề thôi! 💡" },
  { emoji: "🎓", text: "Học hành vất vả, kết quả ngọt ngào, điểm 10 vẫy chào! 🎓" },
  { emoji: "😜", text: "Chạm vào tôi làm chi? Đi làm bài trắc nghiệm ngay đi! 😜" },
  { emoji: "🛸", text: "Luyện 1 đề hôm nay, mai sau thành tài năng vũ trụ! 🛸" },
  { emoji: "⚽", text: "Người ta mê bóng đá, tôi mê bóng dáng bạn đang cày bài tập! ⚽" },
  { emoji: "🌟", text: "Học giỏi không phải do may mắn, mà do chăm bấm Quýtz mỗi ngày! 🌟" },
  { emoji: "💎", text: "Kiến thức là kho báu, và Quýtz là chiếc chìa khóa vạn năng! 💎" },
  { emoji: "🏆", text: "Cố thêm một chút mỗi ngày, thành công lớn sẽ tự gõ cửa! 🏆" },
  { emoji: "🧩", text: "Mỗi câu hỏi là một mảnh ghép, ghép đủ là thành cao thủ! 🧩" }
];

export function getTimePool(hour = new Date().getHours()) {
  let specificPool;
  if (hour >= 5 && hour < 11) {
    specificPool = MORNING_GREETINGS;
  } else if (hour >= 11 && hour < 14) {
    specificPool = NOON_GREETINGS;
  } else if (hour >= 14 && hour < 18) {
    specificPool = AFTERNOON_GREETINGS;
  } else if (hour >= 18 && hour < 23) {
    specificPool = EVENING_GREETINGS;
  } else {
    specificPool = NIGHT_GREETINGS;
  }
  return [...specificPool, ...TIMELESS_GREETINGS];
}

let lastGreetingIndex = -1;
let currentActiveGreeting = null;

export function getRandomGreeting(hour = new Date().getHours()) {
  const pool = getTimePool(hour);
  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * pool.length);
  } while (newIdx === lastGreetingIndex && pool.length > 1);
  lastGreetingIndex = newIdx;
  return pool[newIdx];
}

export function renderSidebar(selectedProjectId, appState) {
  const currentHour = new Date().getHours();
  if (!currentActiveGreeting) {
    currentActiveGreeting = getRandomGreeting(currentHour);
  }
  const greeting = currentActiveGreeting;
  const isOpen = !!appState.isMobileSidebarOpen;

  return `
    <aside class="app-sidebar ${isOpen ? 'sidebar-open' : ''}" id="app-sidebar">
      <div class="sidebar-header">
        <div class="brand-row">
          <img src="assets/AppIcon.png" alt="Quýtz Icon" class="brand-icon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><rect fill=\\'%23fa5a0e\\' width=\\'100\\' height=\\'100\\' rx=\\'22\\'/><text fill=\\'white\\' font-size=\\'45\\' font-family=\\'sans-serif\\' font-weight=\\'bold\\' x=\\'50\\' y=\\'64\\' text-anchor=\\'middle\\'>QZ</text></svg>'">
          <div class="brand-info">
            <div class="brand-title">${i18n.t("appName")}</div>
            <div class="brand-subtitle">${i18n.t("projects")}</div>
          </div>
          <button class="btn btn-ghost btn-icon-only" id="btn-open-settings" title="${i18n.t("settings")}" style="font-size: 1.25rem; width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center;">
            ${renderSF("gearshape", { size: "1.35rem" })}
          </button>
          <button class="btn btn-ghost btn-icon-only mobile-menu-btn" id="btn-close-sidebar" title="Đóng thanh bên" style="display: none;">
            ${renderSF("xmark", { size: "1.2rem" })}
          </button>
        </div>

        <div class="greeting-badge" id="greeting-badge" style="cursor: pointer; user-select: none;" title="Nhấn để đổi câu chào hóm hỉnh khác!">
          <span id="greeting-emoji">${greeting.emoji}</span>
          <span id="greeting-text">${greeting.text}</span>
        </div>
      </div>

      <div class="project-list-container" id="project-list-container">
        ${storage.projects.length === 0 ? `
          <div style="text-align: center; padding: 32px 16px; color: var(--text-secondary);">
            <div style="margin-bottom: 8px; color: var(--color-ocean-blue);">${renderSF("folder", { size: "36px" })}</div>
            <div style="font-size: var(--text-sm);">${i18n.t("noProjects")}</div>
          </div>
        ` : storage.projects.map(project => {
          const stats = calculateProjectStats(project);
          const isSelected = project.id === selectedProjectId;
          const isLL = project.projectType === "languageLearning";
          const isTHPT = project.projectType === "thptQuocGia";

          let iconName = "folder";
          let projectTypeClass = "";
          if (isLL) {
            iconName = "book.closed";
            projectTypeClass = "is-ll";
          } else if (isTHPT) {
            iconName = "graduationcap";
            projectTypeClass = "is-thpt";
          }

          return `
            <div class="project-item ${isSelected ? 'active' : ''} ${projectTypeClass}" data-project-id="${project.id}">
              <div class="project-icon-box">
                ${renderSF(iconName, { size: "18px" })}
              </div>
              <div class="project-details">
                <div class="project-name">${escapeHtml(project.name)}</div>
                <div class="project-meta">
                  ${project.quizzes.length} ${i18n.t("quizzesCount")} • ${stats.totalQuestions} ${i18n.t("questionsCount")}
                </div>
              </div>
              ${stats.masteryPercentage > 0 ? `
                <span class="badge ${stats.masteryPercentage >= 75 ? 'badge-green' : (isTHPT ? 'badge-orange' : (isLL ? 'badge-purple' : 'badge-blue'))}">
                  ${stats.masteryPercentage}%
                </span>
              ` : ''}
              <button class="btn btn-ghost btn-icon-only btn-project-menu" data-project-id="${project.id}" title="Tùy chọn dự án" style="width: 1.85rem; height: 1.85rem; flex-shrink: 0; margin-left: 2px;">
                ${renderSF("ellipsis", { size: "14px" })}
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="sidebar-footer">
        <button class="btn btn-primary" id="btn-add-project" style="width: 100%;">
          ${renderSF("plus", { size: "16px" })} ${i18n.t("addProject")}
        </button>

        <button class="btn btn-secondary" id="btn-sidebar-feedback" style="width: 100%; margin-top: 6px; font-size: var(--text-xs); display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 10px;">
          ${renderSF("bubble.left.and.bubble.right", { size: "13px" })} Gửi Phản Hồi & Báo Lỗi
        </button>

        <!-- Easter Egg Footer -->
        <div class="app-easter-egg-footer" id="app-easter-egg-footer" title="Chạm 2 lần để xem điều bất ngờ!">
          Quýtz ${APP_CONFIG.version} © 2026 | Made in Vietnam
        </div>
      </div>
    </aside>
  `;
}

export function bindSidebarEvents(appState, onProjectSelect, onNewProject, onOpenSettings, onCloseSidebar, onOpenEasterEgg, onOpenProjectMenu, onOpenFeedback) {
  document.querySelectorAll(".project-item").forEach(item => {
    item.onclick = (e) => {
      // If click was on the project menu button, don't trigger selection
      if (e.target.closest(".btn-project-menu")) return;
      const pid = item.dataset.projectId;
      onProjectSelect(pid);
    };
  });

  document.querySelectorAll(".btn-project-menu").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onOpenProjectMenu) onOpenProjectMenu(btn.dataset.projectId);
    };
  });

  const addBtn = document.getElementById("btn-add-project");
  if (addBtn) addBtn.onclick = () => onNewProject();

  const feedbackBtn = document.getElementById("btn-sidebar-feedback");
  if (feedbackBtn && onOpenFeedback) feedbackBtn.onclick = () => onOpenFeedback();

  const settingsBtn = document.getElementById("btn-open-settings");
  if (settingsBtn) settingsBtn.onclick = () => onOpenSettings();

  const closeSidebarBtn = document.getElementById("btn-close-sidebar");
  if (closeSidebarBtn) closeSidebarBtn.onclick = () => {
    if (onCloseSidebar) onCloseSidebar();
  };

  // Greeting pill tap to change
  const greetingBadge = document.getElementById("greeting-badge");
  if (greetingBadge) {
    greetingBadge.onclick = () => {
      const next = getRandomGreeting();
      currentActiveGreeting = next;
      const emojiEl = document.getElementById("greeting-emoji");
      const textEl = document.getElementById("greeting-text");
      if (emojiEl) emojiEl.textContent = next.emoji;
      if (textEl) textEl.textContent = next.text;
      greetingBadge.style.transform = "scale(0.95)";
      setTimeout(() => {
        greetingBadge.style.transform = "scale(1)";
      }, 120);
    };
  }

  // Easter egg double tap / dblclick
  const footerEl = document.getElementById("app-easter-egg-footer");
  if (footerEl && onOpenEasterEgg) {
    footerEl.ondblclick = () => onOpenEasterEgg();

    // Mobile double tap detection
    let lastTap = 0;
    footerEl.ontouchend = (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 450 && tapLength > 0) {
        e.preventDefault();
        onOpenEasterEgg();
      }
      lastTap = currentTime;
    };
  }
}

function getTimeGreeting(hour) {
  if (hour >= 5 && hour < 11) {
    const opts = [
      { emoji: "🌅", text: "Chào buổi sáng! Làm tách cà phê rồi vào cày đề nào ☕" },
      { emoji: "🧠", text: "Sáng sớm tinh mơ, bộ não đang ở đỉnh cao phong độ! 🧠" },
      { emoji: "🍳", text: "Trứng rán cần mỡ, bắp cần bơ, thi không lo thì cày đề ngay giờ! 🍳" },
      { emoji: "🚀", text: "Dậy sớm để thành công... hoặc để giải nốt bộ đề này! 🚀" }
    ];
    return opts[hour % opts.length];
  } else if (hour >= 11 && hour < 14) {
    const opts = [
      { emoji: "🍱", text: "Chào giữa trưa! Vừa nghỉ trưa vừa nạp thêm vài câu trắc nghiệm 🍱" },
      { emoji: "☀️", text: "Nắng đã lên cao, điểm số cũng phải lên theo! ☀️" },
      { emoji: "🍜", text: "Ăn no căng bụng rồi, giải vài câu cho tiêu hóa kiến thức nào! 🍜" },
      { emoji: "🚀", text: "Nghỉ trưa ôn bài, chiều thi bao đậu! 🚀" }
    ];
    return opts[hour % opts.length];
  } else if (hour >= 14 && hour < 18) {
    const opts = [
      { emoji: "🧋", text: "Chào buổi chiều! Làm ly trà sữa cho tỉnh táo rồi ôn tập tiếp 🧋" },
      { emoji: "⚡", text: "Chiều rồi, làm vài câu trắc nghiệm xả stress nào! ⚡" },
      { emoji: "🌈", text: "Trời xanh mây trắng nắng vàng, làm xong bộ đề lòng nhẹ thênh thang! 🌈" },
      { emoji: "📚", text: "Năng lượng buổi chiều cực sung, cày nốt bài giảng nào! 📚" }
    ];
    return opts[hour % opts.length];
  } else if (hour >= 18 && hour < 23) {
    const opts = [
      { emoji: "🌙", text: "Chào buổi tối! Đèn sách ban đêm luôn mang lại điểm cao 🌙" },
      { emoji: "🦉", text: "Cú đêm học bài! Quyết tâm không thua đứa bạn cùng lớp 🦉" },
      { emoji: "💖", text: "Đường vào tim ai lắm lối, nhưng đường tới điểm 10 chỉ có cày Quýtz! 💖" },
      { emoji: "✨", text: "Học không chơi đánh rơi tuổi trẻ, học cùng Quýtz tuổi trẻ thăng hoa ✨" }
    ];
    return opts[hour % opts.length];
  } else {
    const opts = [
      { emoji: "🌌", text: "Nửa đêm rồi! Học muộn thế này là thi chắc chắn 10 điểm! 🌌" },
      { emoji: "😴", text: "Ngủ sớm đi bạn ơi... thôi làm nốt câu này rồi ngủ! 😴" },
      { emoji: "🌟", text: "Cả thế giới đi ngủ, riêng thủ khoa tương lai vẫn đang miệt mài! 🌟" },
      { emoji: "🕯️", text: "Học đêm yên tĩnh, kiến thức ngấm cực sâu! 🕯️" }
    ];
    return opts[hour % opts.length];
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

