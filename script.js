/**
 * QOTA — Client Interaction Script
 * Minimalist, ultra-fast, zero-dependency.
 * Handles theme toggling, clipboard copy, native clock, and interactive HUD showcase.
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeManager();
  initClipboard();
  initMacClock();
  initInteractiveShowcase();
  initGitHubStars();
});

/* --------------------------------------------------------------------------
   Theme Manager (Light & Dark with persistence)
   -------------------------------------------------------------------------- */
function initThemeManager() {
  const toggleBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;

  // Retrieve stored theme or default to light (matching Keeby's signature palette)
  const savedTheme = localStorage.getItem('qota-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  setTheme(initialTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = root.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('qota-theme', theme);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }
}

/* --------------------------------------------------------------------------
   Clipboard Copy Handler
   -------------------------------------------------------------------------- */
function initClipboard() {
  const copyBtn = document.getElementById('hero-copy-btn');
  const cmdText = 'git clone https://github.com/jlsonon/qota.git && cd qota && npm install && npm start';

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(cmdText);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'COPIED!';
        copyBtn.style.backgroundColor = 'var(--color-green)';
        copyBtn.style.color = '#ffffff';

        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.backgroundColor = '';
          copyBtn.style.color = '';
        }, 2000);
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = cmdText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        copyBtn.textContent = 'COPIED!';
        setTimeout(() => {
          copyBtn.textContent = 'COPY';
        }, 2000);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   macOS Desktop Menu Bar Clock Ticker
   -------------------------------------------------------------------------- */
function initMacClock() {
  const clockEl = document.getElementById('mac-clock-time');
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[now.getDay()];
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    clockEl.textContent = `${day} ${hours}:${minutes} ${ampm}`;
  }

  updateClock();
  setInterval(updateClock, 10000);
}

/* --------------------------------------------------------------------------
   Interactive Floating HUD Showcase (Actual Cocoa Level 1001 Simulation)
   -------------------------------------------------------------------------- */
function initInteractiveShowcase() {
  const canvas = document.querySelector('.mac-canvas');
  const hudPill = document.getElementById('sim-hud-pill');
  const dashboard = document.getElementById('sim-hud-dashboard');
  const asstBadge = document.getElementById('sim-hud-asst-badge');
  const modelName = document.getElementById('sim-hud-model-name');
  const rateBadge = document.getElementById('sim-hud-rate-badge');
  const sprintUnits = document.getElementById('sim-sprint-units');
  const sprintFill = document.getElementById('sim-sprint-fill');
  const weeklyPct = document.getElementById('sim-weekly-pct');
  const weeklyFill = document.getElementById('sim-weekly-fill');
  const resetTimer = document.getElementById('sim-reset-timer');
  const toggle7dBtn = document.getElementById('sim-hud-7d-toggle');
  const expandBtn = document.getElementById('sim-hud-expand-btn');
  const weeklyRailItem = document.getElementById('sim-weekly-rail-item');

  // Expanded Dashboard Elements
  const dashCollapse = document.getElementById('sim-dash-collapse');
  const dashClose = document.getElementById('sim-dash-close');
  const dashSync = document.getElementById('sim-dash-sync');
  const dashActiveTitle = document.getElementById('dash-active-model-title');
  const dashActiveMult = document.getElementById('dash-active-multiplier');
  const dashSprintUnits = document.getElementById('dash-sprint-units');
  const dashSprintFill = document.getElementById('dash-sprint-fill');
  const dashResetTimer = document.getElementById('dash-reset-timer');
  const dashWeeklyUnits = document.getElementById('dash-weekly-units');
  const dashWeeklyPct = document.getElementById('dash-weekly-pct');
  const dashWeeklyFill = document.getElementById('dash-weekly-fill');
  const dashTabs = document.querySelectorAll('.dash-tab');

  // Menu Bar Controls
  const menuPill = document.getElementById('sim-menubar-pill');
  const menuPct = document.getElementById('sim-menu-pct');
  const menuModel = document.getElementById('sim-menu-model');
  const menuPopover = document.getElementById('sim-menubar-popover');
  const popCycleModel = document.getElementById('pop-cycle-model');
  const popModelVal = document.getElementById('pop-model-val');
  const popSprintVal = document.getElementById('pop-sprint-val');
  const popWeeklyVal = document.getElementById('pop-weekly-val');
  const popToggleHud = document.getElementById('pop-toggle-hud');
  const popQuit = document.getElementById('pop-quit');

  if (!canvas || !hudPill) return;

  // Realistic AI Model Quota Profiles
  const MODELS = [
    {
      asst: 'AGY',
      name: 'Gemini 3.8 Flash (High)',
      rate: '1x • 88%',
      sprintPct: 88,
      sprintUnits: '220 / 250u',
      weeklyPct: 97,
      weeklyUnits: '2,716 / 2,800 units',
      resetText: 'RESETS IN 3H 14M',
      dashResetText: 'Resets in 3h 14m',
      menubarTag: 'AGY FLASH',
      menubarPct: '88%',
      multiplier: '1x'
    },
    {
      asst: 'CLAUDE',
      name: 'Claude 3.7 Sonnet (Thinking)',
      rate: '4x • 64%',
      sprintPct: 64,
      sprintUnits: '160 / 250u',
      weeklyPct: 82,
      weeklyUnits: '2,296 / 2,800 units',
      resetText: 'RESETS IN 1H 45M',
      dashResetText: 'Resets in 1h 45m',
      menubarTag: 'CLAUDE',
      menubarPct: '64%',
      multiplier: '4x'
    },
    {
      asst: 'CODEX',
      name: 'OpenAI o3-mini (High)',
      rate: '2x • 78%',
      sprintPct: 78,
      sprintUnits: '195 / 250u',
      weeklyPct: 91,
      weeklyUnits: '2,548 / 2,800 units',
      resetText: 'RESETS IN 4H 02M',
      dashResetText: 'Resets in 4h 02m',
      menubarTag: 'CODEX',
      menubarPct: '78%',
      multiplier: '2x'
    }
  ];

  let currentModelIndex = 0;

  function applyModel(index) {
    currentModelIndex = (index + MODELS.length) % MODELS.length;
    const m = MODELS[currentModelIndex];

    // Update Floating HUD Pill
    if (asstBadge) asstBadge.textContent = m.asst;
    if (modelName) modelName.textContent = m.name;
    if (rateBadge) rateBadge.textContent = m.rate;
    if (sprintUnits) sprintUnits.textContent = m.sprintUnits;
    if (sprintFill) sprintFill.style.width = `${m.sprintPct}%`;
    if (weeklyPct) weeklyPct.textContent = `${m.weeklyPct}%`;
    if (weeklyFill) weeklyFill.style.width = `${m.weeklyPct}%`;
    if (resetTimer) resetTimer.textContent = m.resetText;

    // Update Expanded Dashboard View
    if (dashActiveTitle) dashActiveTitle.textContent = m.name.toUpperCase();
    if (dashActiveMult) dashActiveMult.textContent = m.multiplier;
    if (dashSprintUnits) dashSprintUnits.textContent = `${m.sprintUnits} (${m.sprintPct}%)`;
    if (dashSprintFill) dashSprintFill.style.width = `${m.sprintPct}%`;
    if (dashResetTimer) dashResetTimer.textContent = m.dashResetText;
    if (dashWeeklyUnits) dashWeeklyUnits.textContent = m.weeklyUnits;
    if (dashWeeklyPct) dashWeeklyPct.textContent = `${m.weeklyPct}%`;
    if (dashWeeklyFill) dashWeeklyFill.style.width = `${m.weeklyPct}%`;

    // Update Status Bar Pill & Popover
    if (menuPct) menuPct.textContent = m.menubarPct;
    if (menuModel) menuModel.textContent = m.menubarTag;
    if (popModelVal) popModelVal.textContent = m.name.split(' (')[0];
    if (popSprintVal) popSprintVal.textContent = `${m.sprintUnits} (${m.sprintPct}%)`;
    if (popWeeklyVal) popWeeklyVal.textContent = `${m.weeklyPct}% Remaining`;
  }

  // Model Switch Listeners
  if (asstBadge) {
    asstBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      applyModel(currentModelIndex + 1);
    });
  }

  if (popCycleModel) {
    popCycleModel.addEventListener('click', () => {
      applyModel(currentModelIndex + 1);
    });
  }

  // 7-Day Baseline Rail Toggle
  if (toggle7dBtn && weeklyRailItem) {
    toggle7dBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = toggle7dBtn.classList.toggle('active');
      weeklyRailItem.classList.toggle('hide-rail', !isActive);
    });
  }

  // Expand / Collapse Matrix Dashboard
  function expandDashboard() {
    if (!dashboard || !hudPill) return;
    hudPill.style.display = 'none';
    dashboard.style.display = 'block';

    // Align dashboard position with current hud pill coordinates if set
    if (hudPill.style.left) {
      const maxLeft = Math.max(10, canvas.clientWidth - dashboard.offsetWidth - 10);
      const targetLeft = Math.min(parseFloat(hudPill.style.left), maxLeft);
      dashboard.style.left = `${targetLeft}px`;
      dashboard.style.right = 'auto';
    }
    if (hudPill.style.top) {
      const maxTop = Math.max(10, canvas.clientHeight - dashboard.offsetHeight - 10);
      const targetTop = Math.min(parseFloat(hudPill.style.top), maxTop);
      dashboard.style.top = `${targetTop}px`;
      dashboard.style.bottom = 'auto';
    }
  }

  function collapseDashboard() {
    if (!dashboard || !hudPill) return;
    dashboard.style.display = 'none';
    hudPill.style.display = 'block';
  }

  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      expandDashboard();
    });
  }

  // Double-click floating HUD to expand
  hudPill.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    expandDashboard();
  });

  if (dashCollapse) {
    dashCollapse.addEventListener('click', (e) => {
      e.stopPropagation();
      collapseDashboard();
    });
  }

  if (dashClose) {
    dashClose.addEventListener('click', (e) => {
      e.stopPropagation();
      collapseDashboard();
    });
  }

  if (dashSync) {
    dashSync.addEventListener('click', (e) => {
      e.stopPropagation();
      dashSync.style.transform = 'rotate(360deg)';
      dashSync.style.transition = 'transform 0.4s ease';
      setTimeout(() => {
        dashSync.style.transform = '';
        dashSync.style.transition = '';
      }, 400);
      applyModel(currentModelIndex);
    });
  }

  // Dashboard Tabs Switcher
  dashTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      dashTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const targetTab = tab.getAttribute('data-tab');

      document.querySelectorAll('.dash-pane').forEach((pane) => {
        pane.style.display = pane.id === `pane-${targetTab}` ? 'block' : 'none';
      });
    });
  });

  // Menu Bar Popover Toggle
  if (menuPill && menuPopover) {
    menuPill.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menuPopover.style.display === 'flex';
      menuPopover.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
      if (!menuPopover.contains(e.target) && !menuPill.contains(e.target)) {
        menuPopover.style.display = 'none';
      }
    });
  }

  if (popToggleHud) {
    popToggleHud.addEventListener('click', () => {
      const isHidden = hudPill.style.display === 'none' && (!dashboard || dashboard.style.display === 'none');
      if (isHidden) {
        hudPill.style.display = 'block';
        popToggleHud.querySelector('.pop-highlight').textContent = 'Visible (Level 1001)';
      } else {
        hudPill.style.display = 'none';
        if (dashboard) dashboard.style.display = 'none';
        popToggleHud.querySelector('.pop-highlight').textContent = 'Hidden';
      }
    });
  }

  if (popQuit && menuPopover) {
    popQuit.addEventListener('click', () => {
      menuPopover.style.display = 'none';
      if (hudPill) hudPill.style.display = 'none';
      if (dashboard) dashboard.style.display = 'none';
      setTimeout(() => {
        if (hudPill) hudPill.style.display = 'block';
      }, 1200);
    });
  }

  // Draggable Mechanics for Floating HUD and Dashboard
  makeElementDraggable(hudPill, canvas, document.getElementById('sim-hud-drag-handle'));
  makeElementDraggable(dashboard, canvas, document.getElementById('sim-dash-drag-handle'));

  function makeElementDraggable(el, container, handle) {
    if (!el || !container) return;
    const dragTarget = handle || el;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    dragTarget.addEventListener('pointerdown', (e) => {
      // Ignore clicks on buttons or interactive inputs
      if (e.target.closest('button') || e.target.closest('.btn-interactive')) return;

      isDragging = true;
      el.classList.add('is-dragging');
      dragTarget.setPointerCapture(e.pointerId);

      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      initialLeft = rect.left - containerRect.left;
      initialTop = rect.top - containerRect.top;
      startX = e.clientX;
      startY = e.clientY;

      e.preventDefault();
    });

    dragTarget.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const elWidth = el.offsetWidth;
      const elHeight = el.offsetHeight;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Constrain inside container bounds
      const minX = 6;
      const maxX = Math.max(minX, containerWidth - elWidth - 6);
      const minY = 6;
      const maxY = Math.max(minY, containerHeight - elHeight - 6);

      newLeft = Math.max(minX, Math.min(newLeft, maxX));
      newTop = Math.max(minY, Math.min(newTop, maxY));

      el.style.left = `${newLeft}px`;
      el.style.top = `${newTop}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });

    const stopDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('is-dragging');
      try {
        dragTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignored
      }
    };

    dragTarget.addEventListener('pointerup', stopDrag);
    dragTarget.addEventListener('pointercancel', stopDrag);
  }
}

/* --------------------------------------------------------------------------
   GitHub Stars Manager
   -------------------------------------------------------------------------- */
function initGitHubStars() {
  const navStars = document.getElementById('gh-nav-stars');
  const heroStars = document.getElementById('hero-gh-stars');

  const CACHE_KEY = 'qota_gh_stars';
  const CACHE_TIME_KEY = 'qota_gh_stars_time';
  const CACHE_DURATION = 3600 * 1000; // 1 hour

  // Check cached count
  const cached = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  if (cached && cachedTime && Date.now() - parseInt(cachedTime, 10) < CACHE_DURATION) {
    applyStars(cached);
  } else {
    fetchRepoStars();
  }

  async function fetchRepoStars() {
    try {
      const res = await fetch('https://api.github.com/repos/jlsonon/qota');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.stargazers_count === 'number') {
          const formatted = data.stargazers_count >= 1000
            ? (data.stargazers_count / 1000).toFixed(1) + 'k'
            : data.stargazers_count.toString();
          localStorage.setItem(CACHE_KEY, formatted);
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          applyStars(formatted);
        }
      }
    } catch (e) {
      // Offline or rate-limited: default fallback remains
    }
  }

  function applyStars(count) {
    if (navStars) navStars.textContent = count;
    if (heroStars) heroStars.textContent = count;
  }

  // Celebratory click reaction on star buttons
  const starButtons = document.querySelectorAll('.nav-github-star, .hero-star-badge');
  starButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const starIcon = btn.querySelector('.star-icon, .star-sparkle');
      if (starIcon) {
        starIcon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        starIcon.style.transform = 'scale(1.5) rotate(35deg)';
        setTimeout(() => {
          starIcon.style.transform = '';
        }, 350);
      }
    });
  });
}


