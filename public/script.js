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
      shortName: 'Flash 3.8',
      notchReset: '1 hour, 31 minutes',
      rate: '1x • 88%',
      sprintPct: 88,
      sprintUnits: '220 / 250u',
      weeklyPct: 97,
      weeklyUnits: '2,716 / 2,800 units',
      resetText: 'Resets in 1 hour, 31 minutes',
      dashResetText: 'Resets in 1 hour, 31 minutes',
      menubarTag: 'AGY FLASH',
      menubarPct: '88%',
      multiplier: '1x'
    },
    {
      asst: 'CLAUDE',
      name: 'Claude 3.7 Sonnet (Thinking)',
      shortName: 'Sonnet 3.7',
      notchReset: '1 hour, 45 minutes',
      rate: '4x • 64%',
      sprintPct: 64,
      sprintUnits: '160 / 250u',
      weeklyPct: 82,
      weeklyUnits: '2,296 / 2,800 units',
      resetText: 'Resets in 1 hour, 45 minutes',
      dashResetText: 'Resets in 1 hour, 45 minutes',
      menubarTag: 'CLAUDE',
      menubarPct: '64%',
      multiplier: '4x'
    },
    {
      asst: 'CODEX',
      name: 'OpenAI o3-mini (High)',
      shortName: 'o3-mini',
      notchReset: '4 hours, 02 minutes',
      rate: '2x • 78%',
      sprintPct: 78,
      sprintUnits: '195 / 250u',
      weeklyPct: 91,
      weeklyUnits: '2,548 / 2,800 units',
      resetText: 'Resets in 4 hours, 02 minutes',
      dashResetText: 'Resets in 4 hours, 02 minutes',
      menubarTag: 'CODEX',
      menubarPct: '78%',
      multiplier: '2x'
    }
  ];

  let currentModelIndex = 0;

  function applyModel(index) {
    currentModelIndex = (index + MODELS.length) % MODELS.length;
    const m = MODELS[currentModelIndex];

    // Update Top-Center Minimalist Circular Notch HUD
    if (asstBadge) asstBadge.textContent = m.asst;
    if (modelName) modelName.textContent = m.shortName || m.name;
    if (rateBadge) rateBadge.textContent = `${m.sprintPct}`;
    if (sprintUnits) sprintUnits.textContent = m.sprintUnits;
    if (sprintFill) sprintFill.style.width = `${m.sprintPct}%`;
    if (weeklyPct) weeklyPct.textContent = `${m.weeklyPct}%`;
    if (weeklyFill) weeklyFill.style.width = `${m.weeklyPct}%`;

    function getQuotaHueColor(pct) {
      const clamped = Math.max(0, Math.min(100, pct));
      const hue = clamped >= 50 ? (45 + ((clamped - 50) / 50) * 85) : ((clamped / 50) * 45);
      return `hsl(${Math.round(hue)}, 84%, 48%)`;
    }

    if (resetTimer) {
      const parts = (m.notchReset || '1 hour, 31 minutes').split(', ');
      if (parts.length === 2) {
        const hMatch = parts[0].match(/(\d+)\s*(hour|hours)/);
        const mMatch = parts[1].match(/(\d+)\s*(minute|minutes)/);
        if (hMatch && mMatch) {
          resetTimer.innerHTML = `<span class="timer-num">${hMatch[1]}</span><span class="timer-unit"> ${hMatch[2]}, </span><span class="timer-num">${mMatch[1]}</span><span class="timer-unit"> ${mMatch[2]}</span>`;
        } else {
          resetTimer.textContent = m.notchReset;
        }
      } else {
        resetTimer.textContent = m.notchReset;
      }
    }

    const quotaColor = getQuotaHueColor(m.sprintPct);
    const circleGauge = document.getElementById('sim-circle-gauge-fill');
    if (circleGauge) {
      const circum = 69.12;
      circleGauge.style.strokeDashoffset = circum * (1 - m.sprintPct / 100);
      circleGauge.style.stroke = quotaColor;
      circleGauge.style.filter = `drop-shadow(0 0 4px ${quotaColor})`;
    }

    const notchDot = document.getElementById('sim-hud-status-dot');
    if (notchDot) {
      notchDot.className = 'notch-status-dot ' + (m.sprintPct < 20 ? 'critical' : m.sprintPct < 50 ? 'warning' : 'healthy');
      notchDot.style.backgroundColor = quotaColor;
      notchDot.style.boxShadow = `0 0 6px ${quotaColor}`;
    }

    // Update 3 Core Hover Cards in Expanded View (Quotas Tab)
    // 1. Current Session
    const dashSessionRemainingText = document.getElementById('dash-session-remaining-text');
    if (dashSessionRemainingText) {
      dashSessionRemainingText.textContent = `${m.sprintPct}% Remaining`;
    }
    if (dashActiveTitle) dashActiveTitle.textContent = m.name.toUpperCase();
    if (dashActiveMult) dashActiveMult.textContent = `${m.multiplier} • ${m.sprintPct}%`;
    if (dashSprintUnits) dashSprintUnits.textContent = m.sprintUnits;
    if (dashSprintFill) dashSprintFill.style.width = `${m.sprintPct}%`;
    if (dashResetTimer) dashResetTimer.textContent = `${m.notchReset || m.resetText} remaining`;

    // 2. This Week
    const dashWeeklyRemainingText = document.getElementById('dash-weekly-remaining-text');
    if (dashWeeklyRemainingText) {
      dashWeeklyRemainingText.textContent = `${m.weeklyPct}% Remaining`;
    }
    if (dashWeeklyUnits) dashWeeklyUnits.textContent = m.weeklyUnits;
    if (dashWeeklyPct) dashWeeklyPct.textContent = `${m.weeklyPct}%`;
    if (dashWeeklyFill) dashWeeklyFill.style.width = `${m.weeklyPct}%`;

    // Models Matrix Switcher (percentage display)
    document.querySelectorAll('.sim-model-card').forEach((card, idx) => {
      card.classList.toggle('active', idx === currentModelIndex);
      const foot = card.querySelector('.model-card-foot');
      if (foot && MODELS[idx]) {
        foot.textContent = `${MODELS[idx].sprintPct}% Available`;
      }
    });

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

  // Interactive Models Matrix Cards in Models Tab
  document.querySelectorAll('.sim-model-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-model-index'), 10);
      applyModel(idx);
    });
  });

  // 7-Day Baseline Rail Toggle
  if (toggle7dBtn && weeklyRailItem) {
    toggle7dBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = toggle7dBtn.classList.toggle('active');
      weeklyRailItem.classList.toggle('hide-rail', !isActive);
    });
  }

  // Expand / Collapse Matrix Dashboard with Hover Intent & Pin Locks
  let hoverTimer = null;
  let leaveTimer = null;
  let isPinned = false;
  let isFloatingHud = true;
  let isCollapsing = false;
  const dashPinBtn = document.getElementById('sim-dash-pin');

  function expandDashboard(pinned = false) {
    if (!dashboard || !hudPill) return;
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    isCollapsing = false;
    if (pinned) {
      isPinned = true;
      if (dashPinBtn) dashPinBtn.classList.add('active');
    }
    dashboard.classList.remove('collapsing');
    dashboard.classList.add('expanding');
    dashboard.style.display = 'block';
    hudPill.style.display = 'none';
  }

  function collapseDashboard() {
    if (!dashboard || !hudPill || isCollapsing) return;
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    isPinned = false;
    hudPill.classList.remove('is-pinned');
    if (dashPinBtn) dashPinBtn.classList.remove('active');
    
    isCollapsing = true;
    dashboard.classList.remove('expanding');
    dashboard.classList.add('collapsing');

    setTimeout(() => {
      if (isCollapsing) {
        dashboard.style.display = 'none';
        dashboard.classList.remove('collapsing');
        isCollapsing = false;
        if (isFloatingHud) {
          hudPill.style.display = 'flex';
          hudPill.classList.remove('notch-reappear');
          void hudPill.offsetWidth;
          hudPill.classList.add('notch-reappear');
        }
      }
    }, 220);
  }

  // Hover to view full details with snappy 20ms response delay
  hudPill.addEventListener('mouseenter', () => {
    clearTimeout(leaveTimer);
    hudPill.classList.add('is-hovered');
    hoverTimer = setTimeout(() => {
      expandDashboard(false);
    }, 20);
  });

  hudPill.addEventListener('mouseleave', () => {
    hudPill.classList.remove('is-hovered');
    clearTimeout(hoverTimer);
  });

  // Leaving the expanded dashboard collapses it back to resting notch quickly after 90ms
  dashboard.addEventListener('mouseenter', () => {
    clearTimeout(leaveTimer);
    if (isCollapsing) {
      isCollapsing = false;
      dashboard.classList.remove('collapsing');
      dashboard.classList.add('expanding');
    }
  });

  dashboard.addEventListener('mouseleave', () => {
    if (!isPinned) {
      clearTimeout(hoverTimer);
      leaveTimer = setTimeout(() => {
        if (!isPinned) {
          collapseDashboard();
        }
      }, 90);
    }
  });

  // Pin button toggles sticky lock
  if (dashPinBtn) {
    dashPinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isPinned = !isPinned;
      dashPinBtn.classList.toggle('active', isPinned);
      hudPill.classList.toggle('is-pinned', isPinned);
    });
  }

  // Explicit expand button locks open
  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      expandDashboard(true);
    });
  }

  // Single-click on notch toggles sticky pin and opens
  hudPill.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    isPinned = !isPinned;
    hudPill.classList.toggle('is-pinned', isPinned);
    if (dashPinBtn) dashPinBtn.classList.toggle('active', isPinned);
    if (isPinned) {
      expandDashboard(true);
    }
  });

  // Escape key listener to dismiss
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isPinned = false;
      hudPill.classList.remove('is-pinned');
      if (dashPinBtn) dashPinBtn.classList.remove('active');
      collapseDashboard();
    }
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

  // Menu Bar Popover Toggle (Smooth Enter & Exit Transitions)
  if (menuPill && menuPopover) {
    function openPopover() {
      menuPopover.style.display = 'flex';
      menuPopover.classList.remove('popover-closing');
    }

    function closePopover() {
      if (menuPopover.style.display === 'flex' && !menuPopover.classList.contains('popover-closing')) {
        menuPopover.classList.add('popover-closing');
        setTimeout(() => {
          menuPopover.style.display = 'none';
          menuPopover.classList.remove('popover-closing');
        }, 110);
      }
    }

    menuPill.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menuPopover.style.display === 'flex' && !menuPopover.classList.contains('popover-closing');
      if (isVisible) {
        closePopover();
      } else {
        openPopover();
      }
    });

    document.addEventListener('click', (e) => {
      if (!menuPopover.contains(e.target) && !menuPill.contains(e.target)) {
        closePopover();
      }
    });
  }

  const simChkFloatHud = document.getElementById('sim-chk-float-hud');
  const popOpenMonitor = document.getElementById('pop-open-monitor');
  const popHudStatus = document.getElementById('pop-hud-status');

  function setFloatingHud(enabled) {
    isFloatingHud = !!enabled;
    if (simChkFloatHud) simChkFloatHud.checked = isFloatingHud;
    if (popHudStatus) {
      popHudStatus.textContent = isFloatingHud ? 'Visible (Top Notch)' : 'Disabled (Menu Bar Only)';
    }

    if (isFloatingHud) {
      if (!dashboard || dashboard.style.display !== 'block') {
        hudPill.style.display = 'flex';
      }
    } else {
      hudPill.style.display = 'none';
      if (!isPinned && dashboard) {
        dashboard.style.display = 'none';
      }
    }
  }

  if (simChkFloatHud) {
    simChkFloatHud.addEventListener('change', () => {
      setFloatingHud(simChkFloatHud.checked);
    });
  }

  if (popToggleHud) {
    popToggleHud.addEventListener('click', () => {
      setFloatingHud(!isFloatingHud);
    });
  }

  if (popOpenMonitor) {
    popOpenMonitor.addEventListener('click', () => {
      if (menuPopover) menuPopover.style.display = 'none';
      expandDashboard(true);
    });
  }

  if (popQuit && menuPopover) {
    popQuit.addEventListener('click', () => {
      menuPopover.style.display = 'none';
      if (hudPill) hudPill.style.display = 'none';
      if (dashboard) dashboard.style.display = 'none';
      setTimeout(() => {
        if (isFloatingHud && hudPill) hudPill.style.display = 'flex';
      }, 1200);
    });
  }

  // Draggable Mechanics (Only if dedicated drag handles exist)
  const hudDragHandle = document.getElementById('sim-hud-drag-handle');
  if (hudDragHandle) {
    makeElementDraggable(hudPill, canvas, hudDragHandle);
  }
  const dashDragHandle = document.getElementById('sim-dash-drag-handle');
  if (dashDragHandle) {
    makeElementDraggable(dashboard, canvas, dashDragHandle);
  }

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

  // Initialize default active model and topnotch HUD floating visibility
  applyModel(0);
  setFloatingHud(true);
}

/* --------------------------------------------------------------------------
   GitHub Stars Manager (Live Polling + Optimistic +1)
   -------------------------------------------------------------------------- */
function initGitHubStars() {
  const navStars = document.getElementById('gh-nav-stars');
  const heroStars = document.getElementById('hero-gh-stars');

  const CACHE_KEY = 'qota_gh_stars';
  const CACHE_TIME_KEY = 'qota_gh_stars_time';
  const CLICKED_KEY = 'qota_gh_starred_optimistic';
  const CACHE_DURATION = 60 * 1000; // 1 minute fresh cache

  let currentStarsCount = 1;

  // Initialize from cache if recent, else fetch immediately
  const cached = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  if (cached && cachedTime && Date.now() - parseInt(cachedTime, 10) < CACHE_DURATION) {
    applyStars(cached);
  } else {
    fetchRepoStars();
  }

  // Periodic background polling (every 60s when user is active on tab)
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchRepoStars();
    }
  }, 60000);

  // Re-fetch immediately when user returns to this tab from GitHub
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchRepoStars();
    }
  });

  async function fetchRepoStars() {
    try {
      const res = await fetch('https://api.github.com/repos/jlsonon/qota');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.stargazers_count === 'number') {
          currentStarsCount = data.stargazers_count;
          const formatted = formatCount(currentStarsCount);
          localStorage.setItem(CACHE_KEY, formatted);
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          applyStars(formatted);
        }
      }
    } catch (e) {
      // Offline or network error: retain current display
    }
  }

  function formatCount(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  }

  function applyStars(countStr) {
    if (navStars) {
      navStars.textContent = countStr;
      triggerBounce(navStars);
    }
    if (heroStars) {
      heroStars.textContent = countStr;
      triggerBounce(heroStars);
    }
  }

  function triggerBounce(el) {
    el.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = 'scale(1.18)';
    setTimeout(() => {
      el.style.transform = '';
    }, 250);
  }

  // Optimistic +1 and celebratory micro-interaction on click
  const starButtons = document.querySelectorAll('.nav-github-star, .hero-star-badge');
  starButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const starIcon = btn.querySelector('.star-icon, .star-sparkle');
      if (starIcon) {
        starIcon.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
        starIcon.style.transform = 'scale(1.6) rotate(35deg)';
        setTimeout(() => {
          starIcon.style.transform = '';
        }, 400);
      }

      // Optimistic increment if not already clicked in this browser
      if (!sessionStorage.getItem(CLICKED_KEY)) {
        sessionStorage.setItem(CLICKED_KEY, 'true');
        currentStarsCount += 1;
        const newFormatted = formatCount(currentStarsCount);
        localStorage.setItem(CACHE_KEY, newFormatted);
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        applyStars(newFormatted);
      }
    });
  });
}


