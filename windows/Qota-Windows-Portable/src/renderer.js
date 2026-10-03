/**
 * Qota - Minimalist Black & White Renderer
 */

let currentStatus = null;
let countdownTimer = null;
let currentTheme = 'obsidian';

const ICONS = {
  zap: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  sparkles: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 3l1.912 5.888L20 10.8l-4.888 1.912L13.2 19.6 11.288 13.712 6.4 11.8l4.888-1.912L13.2 4z"></path></svg>',
  crown: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polygon points="2 4 7 14 12 6 17 14 22 4 22 20 2 20 2 4"></polygon></svg>'
};

document.addEventListener('DOMContentLoaded', async () => {
  init();
});

async function init() {
  setupTabs();
  setupActionListeners();
  setupThemeListeners();

  try {
    currentStatus = await window.antigravityAPI.getQuotaStatus();
    if (currentStatus && currentStatus.settings && currentStatus.settings.theme) {
      applyTheme(currentStatus.settings.theme);
    } else {
      applyTheme('obsidian');
    }
    renderStatus(currentStatus);
  } catch (err) {
    console.error('Error fetching initial quota status:', err);
  }

  const settings = await window.antigravityAPI.getSettings();
  populateSettings(settings);

  window.antigravityAPI.onQuotaUpdated((updatedStatus) => {
    currentStatus = updatedStatus;
    renderStatus(updatedStatus);
  });

  startCountdownTicker();
}

// Theme handling
const THEMES = ['obsidian', 'paper', 'titanium'];

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'obsidian';
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  document.querySelectorAll('.theme-choice-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
  });
}

function setupThemeListeners() {
  // Toggle button in header cycles through themes
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const nextIndex = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
      const nextTheme = THEMES[nextIndex];
      applyTheme(nextTheme);
      await window.antigravityAPI.saveSettings({ theme: nextTheme });
    });
  }

  // Theme picker in settings tab
  document.querySelectorAll('.theme-choice-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const selected = btn.getAttribute('data-theme');
      applyTheme(selected);
      await window.antigravityAPI.saveSettings({ theme: selected });
    });
  });
}

// Tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.viewport-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const activePanel = document.getElementById(`tab-${target}`);
      if (activePanel) activePanel.classList.add('active');
    });
  });
}

// Action Button Listeners
function setupActionListeners() {
  // Sync
  const syncBtn = document.getElementById('btn-sync');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.style.transform = 'rotate(180deg)';
      setTimeout(() => { syncBtn.style.transform = 'none'; }, 400);
      currentStatus = await window.antigravityAPI.refreshQuota();
      renderStatus(currentStatus);
    });
  }

  // Close to tray
  const closeBtn = document.getElementById('btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.antigravityAPI.hideWindow();
    });
  }

  // Pin HUD Toggle
  let isPinned = false;
  let hoverTimer = null;
  let leaveTimer = null;

  const pinBtn = document.getElementById('btn-pin-hud');
  if (pinBtn) {
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isPinned = !isPinned;
      pinBtn.classList.toggle('active', isPinned);
      if (floatingHud) floatingHud.classList.toggle('is-pinned', isPinned);
      pinBtn.title = isPinned ? 'Unpin HUD (Auto-collapse on mouse leave)' : 'Pin HUD (Keep open)';
    });
  }

  // Hover on Notch Island to expand
  const floatingHud = document.getElementById('floating-hud');
  const fullDashboard = document.getElementById('full-dashboard');

  if (floatingHud) {
    floatingHud.addEventListener('mouseenter', () => {
      if (document.body.classList.contains('mode-compact')) {
        clearTimeout(leaveTimer);
        floatingHud.classList.add('is-hovered');
        hoverTimer = setTimeout(async () => {
          await window.antigravityAPI.setWindowMode('expanded');
          document.body.className = 'mode-expanded';
          if (fullDashboard) {
            fullDashboard.classList.remove('collapsing');
            fullDashboard.classList.add('expanding');
          }
          currentStatus = await window.antigravityAPI.getQuotaStatus();
          renderStatus(currentStatus);
        }, 20); // Fast response trigger
      }
    });

    floatingHud.addEventListener('mouseleave', () => {
      floatingHud.classList.remove('is-hovered');
      clearTimeout(hoverTimer);
    });

    // Single-click on notch to toggle sticky pin & open
    floatingHud.addEventListener('click', async (e) => {
      if (e.target.closest('#btn-hud-expand')) return;
      isPinned = !isPinned;
      if (pinBtn) pinBtn.classList.toggle('active', isPinned);
      floatingHud.classList.toggle('is-pinned', isPinned);

      if (isPinned && !document.body.classList.contains('mode-expanded')) {
        await window.antigravityAPI.setWindowMode('expanded');
        document.body.className = 'mode-expanded';
        if (fullDashboard) {
          fullDashboard.classList.remove('collapsing');
          fullDashboard.classList.add('expanding');
        }
        currentStatus = await window.antigravityAPI.getQuotaStatus();
        renderStatus(currentStatus);
      }
    });
  }

  // Escape key to dismiss/collapse back to compact notch
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      isPinned = false;
      if (pinBtn) pinBtn.classList.remove('active');
      if (floatingHud) floatingHud.classList.remove('is-pinned');
      if (document.body.classList.contains('mode-expanded')) {
        if (fullDashboard) {
          fullDashboard.classList.remove('expanding');
          fullDashboard.classList.add('collapsing');
          setTimeout(async () => {
            await window.antigravityAPI.setWindowMode('compact');
            document.body.className = 'mode-compact';
            fullDashboard.classList.remove('collapsing');
            if (floatingHud) {
              floatingHud.classList.remove('is-pinned');
              floatingHud.classList.remove('notch-reappear');
              void floatingHud.offsetWidth;
              floatingHud.classList.add('notch-reappear');
            }
            currentStatus = await window.antigravityAPI.getQuotaStatus();
            renderStatus(currentStatus);
          }, 200);
        }
      }
    }
  });

  // Mouseleave on full dashboard collapses back to notch unless pinned
  if (fullDashboard) {
    fullDashboard.addEventListener('mouseleave', () => {
      if (!isPinned && document.body.classList.contains('mode-expanded')) {
        clearTimeout(hoverTimer);
        leaveTimer = setTimeout(() => {
          if (!isPinned) {
            fullDashboard.classList.remove('expanding');
            fullDashboard.classList.add('collapsing');
            setTimeout(async () => {
              if (!isPinned) {
                await window.antigravityAPI.setWindowMode('compact');
                document.body.className = 'mode-compact';
                fullDashboard.classList.remove('collapsing');
                if (floatingHud) {
                  floatingHud.classList.remove('is-pinned');
                  floatingHud.classList.remove('notch-reappear');
                  void floatingHud.offsetWidth;
                  floatingHud.classList.add('notch-reappear');
                }
                currentStatus = await window.antigravityAPI.getQuotaStatus();
                renderStatus(currentStatus);
              }
            }, 220);
          }
        }, 90); // Fast, smooth collapse back to notch on hover away
      }
    });

    fullDashboard.addEventListener('mouseenter', () => {
      clearTimeout(leaveTimer);
      fullDashboard.classList.remove('collapsing');
    });
  }

  // Explicit Expand Button
  const hudExpandBtn = document.getElementById('btn-hud-expand');
  if (hudExpandBtn) {
    hudExpandBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      isPinned = true;
      if (pinBtn) pinBtn.classList.add('active');
      if (floatingHud) floatingHud.classList.add('is-pinned');
      await window.antigravityAPI.setWindowMode('expanded');
      document.body.className = 'mode-expanded';
      currentStatus = await window.antigravityAPI.getQuotaStatus();
      renderStatus(currentStatus);
    });
  }

  // Collapse Full Dashboard back to Notch
  const collapseBtn = document.getElementById('btn-collapse-hud');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', async () => {
      isPinned = false;
      if (pinBtn) pinBtn.classList.remove('active');
      if (floatingHud) floatingHud.classList.remove('is-pinned');
      const isFloating = !!(currentStatus?.settings?.enableFloatingHud);
      if (!isFloating) {
        window.antigravityAPI.hideWindow();
      } else {
        await window.antigravityAPI.setWindowMode('compact');
        document.body.className = 'mode-compact';
        currentStatus = await window.antigravityAPI.getQuotaStatus();
        renderStatus(currentStatus);
      }
    });
  }

  // Settings Save
  const saveBtn = document.getElementById('btn-save-settings');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const selectedInterval = document.querySelector('input[name="refresh-interval"]:checked');
      const isFloatingChecked = document.getElementById('chk-float-hud')?.checked ?? false;
      const newSettings = {
        notifySprintLow: document.getElementById('chk-sprint-low')?.checked ?? true,
        notifyWeeklyLow: document.getElementById('chk-weekly-low')?.checked ?? true,
        notifySprintRefilled: document.getElementById('chk-sprint-refill')?.checked ?? true,
        notifyContextLimit: document.getElementById('chk-context-nudge')?.checked ?? true,
        showWeeklyInHud: document.getElementById('chk-hud-weekly')?.checked ?? true,
        enableFloatingHud: isFloatingChecked,
        soundEnabled: document.getElementById('chk-sound')?.checked ?? true,
        pollingIntervalSec: selectedInterval ? parseInt(selectedInterval.value, 10) : 60,
        theme: currentTheme,
        visibleSections: {
          antigravity: document.getElementById('chk-sec-antigravity')?.checked ?? true,
          claudeCode: document.getElementById('chk-sec-claudeCode')?.checked ?? true,
          codex: document.getElementById('chk-sec-codex')?.checked ?? true,
          grokCli: document.getElementById('chk-sec-grokCli')?.checked ?? true
        }
      };

      if (window.antigravityAPI && window.antigravityAPI.setFloatingHud) {
        await window.antigravityAPI.setFloatingHud(isFloatingChecked);
      }
      currentStatus = await window.antigravityAPI.saveSettings(newSettings);
      renderStatus(currentStatus);

      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Configuration Saved';
      setTimeout(() => { saveBtn.textContent = originalText; }, 1400);
    });
  }

  // Toggle Weekly Rail right from the Floating HUD
  const toggleWeeklyBtn = document.getElementById('btn-toggle-hud-weekly');
  if (toggleWeeklyBtn) {
    toggleWeeklyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isCurrentlyShown = !(document.getElementById('floating-hud')?.classList.contains('hide-weekly'));
      const nextShow = !isCurrentlyShown;
      applyWeeklyHudVisibility(nextShow);
      await window.antigravityAPI.setHudWeekly(nextShow);
    });
  }

  // One-click section visibility switches
  const sectionCheckboxes = [
    { id: 'chk-sec-antigravity', key: 'antigravity' },
    { id: 'chk-sec-claudeCode', key: 'claudeCode' },
    { id: 'chk-sec-codex', key: 'codex' },
    { id: 'chk-sec-grokCli', key: 'grokCli' }
  ];

  sectionCheckboxes.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', async () => {
        const visibleSections = currentStatus?.settings?.visibleSections || {
          antigravity: true, claudeCode: true, codex: true, grokCli: true
        };
        visibleSections[key] = el.checked;
        applySectionVisibility(visibleSections);
        currentStatus = await window.antigravityAPI.saveSettings({ visibleSections });
      });
    }
  });

  // Floating HUD Weekly rail checkbox in Settings
  const chkHudWeekly = document.getElementById('chk-hud-weekly');
  if (chkHudWeekly) {
    chkHudWeekly.addEventListener('change', async () => {
      const show = chkHudWeekly.checked;
      applyWeeklyHudVisibility(show);
      await window.antigravityAPI.setHudWeekly(show);
    });
  }

  // Float Circular Notch HUD on Screen checkbox in Settings
  const chkFloatHud = document.getElementById('chk-float-hud');
  if (chkFloatHud) {
    chkFloatHud.addEventListener('change', async () => {
      const enabled = chkFloatHud.checked;
      if (window.antigravityAPI && window.antigravityAPI.setFloatingHud) {
        await window.antigravityAPI.setFloatingHud(enabled);
      }
      currentStatus = await window.antigravityAPI.saveSettings({ enableFloatingHud: enabled });
      renderStatus(currentStatus);
    });
  }

  // Quit App
  const quitBtn = document.getElementById('btn-quit-app');
  if (quitBtn) {
    quitBtn.addEventListener('click', () => {
      window.antigravityAPI.quitApp();
    });
  }
}

function applyWeeklyHudVisibility(show) {
  const hud = document.getElementById('floating-hud');
  const toggleBtn = document.getElementById('btn-toggle-hud-weekly');
  const chk = document.getElementById('chk-hud-weekly');

  if (hud) {
    hud.classList.toggle('hide-weekly', !show);
  }
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', show);
  }
  if (chk) {
    chk.checked = show;
  }
}

function applySectionVisibility(visibleSections) {
  if (!visibleSections) return;
  Object.keys(visibleSections).forEach(key => {
    const isVisible = !!visibleSections[key];
    const sectionEls = document.querySelectorAll(`[data-section="${key}"]`);
    sectionEls.forEach(el => {
      el.classList.toggle('section-hidden', !isVisible);
    });
  });
}

function renderStatus(status) {
  if (!status) return;

  // 0. Synchronize Body Window Mode
  if (status.windowMode) {
    document.body.className = status.windowMode === 'compact' ? 'mode-compact' : 'mode-expanded';
  }

  // Synchronize Weekly Limit visibility in Floating HUD
  const showWeekly = status.showWeeklyInHud !== undefined ? status.showWeeklyInHud : true;
  applyWeeklyHudVisibility(showWeekly);

  // Synchronize Section Visibilities
  applySectionVisibility(status.visibleSections);

  // 1. TOP-CENTER MINIMALIST CIRCULAR NOTCH / ISLAND HUD
  const hudModelName = document.getElementById('hud-model-name');
  const hudAssistantBadge = document.getElementById('hud-assistant-badge');
  const hudBarFill = document.getElementById('hud-bar-fill');
  const hudWeeklyBarFill = document.getElementById('hud-weekly-bar-fill');
  const hudStatusDot = document.getElementById('hud-status-dot');
  const hudQuotaPct = document.getElementById('hud-quota-pct');
  const hudResetTimer = document.getElementById('hud-reset-timer');
  const circleGaugeFill = document.getElementById('circle-gauge-fill');

  const sprintPct = status.sprint ? status.sprint.percentage : (status.activeModel ? status.activeModel.percentage : 100);
  const quotaColor = getQuotaHueColor(sprintPct);

  if (circleGaugeFill) {
    // Circumference for r=11: 2 * Math.PI * 11 = 69.115
    const circum = 69.12;
    circleGaugeFill.style.strokeDashoffset = circum * (1 - sprintPct / 100);
    // Dynamic continuous HSL color lerp (Green -> Amber -> Red)
    circleGaugeFill.style.stroke = quotaColor;
    circleGaugeFill.style.filter = `drop-shadow(0 0 4px ${quotaColor})`;
  }

  if (hudStatusDot) {
    const healthClass = sprintPct < 20 ? 'critical' : sprintPct < 50 ? 'warning' : 'healthy';
    hudStatusDot.className = `notch-status-dot circle-status-dot ${healthClass}`;
    hudStatusDot.style.backgroundColor = quotaColor;
    hudStatusDot.style.boxShadow = `0 0 6px ${quotaColor}`;
    hudStatusDot.title = `Status: ${healthClass.toUpperCase()} (${sprintPct}%)`;
  }

  if (hudQuotaPct) {
    hudQuotaPct.textContent = `${sprintPct}`;
  }

  if (hudResetTimer && status.sprint) {
    const sprintMs = Math.max(0, (status.sprint.resetAt || Date.now()) - Date.now());
    hudResetTimer.innerHTML = formatFriendlyDurationHtml(sprintMs);
  }

  if (hudAssistantBadge) {
    const asst = status.activeAssistant || (status.activeModel && status.activeModel.assistant) || 'antigravity';
    const asstMap = {
      antigravity: 'AGY',
      claude: 'CLAUDE',
      codex: 'CODEX'
    };
    hudAssistantBadge.textContent = asstMap[asst] || asst.toUpperCase().slice(0, 6);
    hudAssistantBadge.className = `hud-assistant-badge assistant-${asst}`;
  }

  if (hudModelName && status.activeModel) {
    const shortName = status.activeModel.name.replace(/^Gemini\s+/, '').replace(/^Claude\s+/, '').replace(/^OpenAI\s+/, '').split(' (')[0];
    hudModelName.textContent = shortName;
    hudModelName.title = `[${(status.activeAssistant || 'Assistant').toUpperCase()}] ${status.activeModel.name} (${status.activeModel.multiplier}x cost)`;
  }
  if (hudBarFill && status.activeModel) {
    hudBarFill.style.width = `${status.activeModel.percentage}%`;
  }
  if (hudWeeklyBarFill && status.weekly) {
    hudWeeklyBarFill.style.width = `${status.weekly.percentage}%`;
  }

  // 2. HOVER TELEMETRY CARDS (Quotas Tab)
  // Section 1: Current Session
  const sessionRemainingText = document.getElementById('session-remaining-text');
  const sessionUnits = document.getElementById('session-units');
  const sessionPct = document.getElementById('session-pct');
  const sessionRailFill = document.getElementById('session-rail-fill');
  const sessionTimer = document.getElementById('session-timer');
  const sessionChip = document.getElementById('session-status-chip');
  if (sessionRemainingText && status.sprint) {
    sessionRemainingText.textContent = `${status.sprint.percentage}% Remaining`;
  }
  if (sessionUnits && status.sprint) {
    sessionUnits.textContent = `${status.sprint.remaining.toLocaleString()} / ${status.sprint.max.toLocaleString()}u`;
  }
  if (sessionPct && status.sprint) {
    sessionPct.textContent = `${status.sprint.percentage}%`;
  }
  if (sessionRailFill && status.sprint) {
    sessionRailFill.style.width = `${status.sprint.percentage}%`;
    const healthClass = status.sprint.percentage < 20 ? 'critical' : status.sprint.percentage < 50 ? 'warning' : 'safe';
    sessionRailFill.className = `telemetry-bar-fill sprint ${healthClass}`;
  }
  if (sessionTimer && status.sprint) {
    sessionTimer.textContent = `${status.sprint.friendlyReset || status.sprint.formattedReset || '38m'} remaining`;
  }
  if (sessionChip && status.sprint) {
    if (status.sprint.percentage <= 20) {
      sessionChip.className = 'status-chip critical mono';
      sessionChip.textContent = 'LOW';
    } else if (status.sprint.percentage <= 50) {
      sessionChip.className = 'status-chip warning mono';
      sessionChip.textContent = 'MODERATE';
    } else {
      sessionChip.className = 'status-chip safe mono';
      sessionChip.textContent = 'ACTIVE';
    }
  }

  // Section 2: This Week
  const weeklyRemainingText = document.getElementById('weekly-remaining-text');
  const weeklyFill = document.getElementById('weekly-progress-fill');
  const weeklyUnitsEl = document.getElementById('weekly-units');
  const weeklyPctEl = document.getElementById('weekly-pct');
  const weeklyChip = document.getElementById('weekly-status-chip');
  const weeklyTimerEl = document.getElementById('weekly-timer');

  if (weeklyRemainingText && status.weekly) {
    weeklyRemainingText.textContent = `${status.weekly.percentage}% Remaining`;
  }
  if (weeklyFill && status.weekly) {
    weeklyFill.style.width = `${status.weekly.percentage}%`;
    const healthClass = status.weekly.percentage < 20 ? 'critical' : status.weekly.percentage < 50 ? 'warning' : 'safe';
    weeklyFill.className = `telemetry-bar-fill weekly ${healthClass}`;
  }
  if (weeklyUnitsEl && status.weekly) {
    weeklyUnitsEl.textContent = `${status.weekly.remaining.toLocaleString()} / ${status.weekly.max.toLocaleString()}u`;
  }
  if (weeklyPctEl && status.weekly) {
    weeklyPctEl.textContent = `${status.weekly.percentage}%`;
  }
  if (weeklyTimerEl && status.weekly) {
    weeklyTimerEl.textContent = status.weekly.formattedReset || '7d 00h';
  }
  if (weeklyChip && status.weekly) {
    if (status.weekly.percentage <= 15) {
      weeklyChip.className = 'status-chip critical mono';
      weeklyChip.textContent = 'CRITICAL';
    } else if (status.weekly.percentage <= 50) {
      weeklyChip.className = 'status-chip warning mono';
      weeklyChip.textContent = 'MODERATE';
    } else {
      weeklyChip.className = 'status-chip safe mono';
      weeklyChip.textContent = 'NORMAL';
    }
  }

  // Section 3: Other Models (Horizontal percentage bar + remaining limit)
  const otherModelsContainer = document.getElementById('other-models-list');
  if (otherModelsContainer && status.models) {
    const activeModelId = status.activeModelId || (status.activeModel && status.activeModel.id);
    const otherModels = status.models.filter(m => m.id !== activeModelId);

    otherModelsContainer.innerHTML = otherModels.map(m => {
      const isLow = m.percentage < 20;
      const isMid = m.percentage < 50;
      const colorClass = isLow ? 'critical' : isMid ? 'warning' : 'safe';
      return `
        <div class="other-model-item">
          <div class="other-model-row">
            <div class="other-model-info">
              <span class="other-model-name">${m.name.split(' (')[0]}</span>
              <span class="cost-pill">${m.badge || (m.multiplier + 'x')}</span>
            </div>
            <div class="other-model-limit mono">
              <span class="${colorClass}">${m.percentage}%</span> &bull; ~${m.remainingCalls} calls
            </div>
          </div>
          <div class="telemetry-bar-rail">
            <div class="telemetry-bar-fill ${colorClass}" style="width: ${m.percentage}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Section 3: Plan Limits
  const planSprintCap = document.getElementById('plan-sprint-cap');
  const planActiveMult = document.getElementById('plan-active-mult');
  if (planSprintCap && status.sprint) {
    planSprintCap.textContent = `${status.sprint.max} units / 5h`;
  }
  if (planActiveMult && status.activeModel) {
    planActiveMult.textContent = `${status.activeModel.multiplier}x (${status.activeModel.name.split(' (')[0]})`;
  }

  // Section 4: Weekly Limits
  const weeklyPoolCap = document.getElementById('weekly-pool-cap');
  if (weeklyPoolCap && status.weekly) {
    weeklyPoolCap.textContent = `${status.weekly.max.toLocaleString()} units / 7d`;
  }

  // 6. Claude Code Prompt Cache Health (Only show if active model is Claude)
  const isClaudeActive = status.activeModel && status.activeModel.id && status.activeModel.id.includes('claude');
  const claudeSection = document.querySelector('[data-section="claudeCode"]');
  if (claudeSection) {
    const sectionEnabled = status.visibleSections?.claudeCode !== false;
    claudeSection.style.display = (isClaudeActive && sectionEnabled) ? '' : 'none';
  }
  if (isClaudeActive) {
    renderPromptCache(status.promptCache);
  }

  // 7. Codex / OpenAI Status
  renderCodexStatus(status.serviceStatuses);

  // 8. Models Matrix
  renderModelsMatrix(status.models);

  // 11. Footer Status
  const updatedEl = document.getElementById('last-updated');
  if (updatedEl && status.lastSyncedAt) {
    updatedEl.textContent = new Date(status.lastSyncedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  if (status.antigravityConnection) {
    const dot = document.getElementById('agy-conn-dot');
    const text = document.getElementById('agy-conn-text');
    if (dot && text) {
      if (status.antigravityConnection.detected) {
        dot.className = 'beacon-dot live';
        const sessions = status.antigravityConnection.activeSessions;
        text.textContent = `Antigravity: ${sessions > 0 ? `${sessions} live session(s)` : 'Synced'}`;
      } else {
        dot.className = 'beacon-dot';
        text.textContent = 'Antigravity: Standalone';
      }
    }
  }
}

// ========================================================
// Prompt Cache Health Renderer
// ========================================================
function renderPromptCache(cache) {
  const hitRateEl = document.getElementById('cache-hit-rate');
  const timerEl = document.getElementById('cache-ttl-timer');
  const statusLineEl = document.getElementById('cache-status-line');
  const chipEl = document.getElementById('cache-status-chip');

  if (!cache || !cache.available) {
    if (hitRateEl) hitRateEl.textContent = '--%';
    if (timerEl) timerEl.textContent = '--:--';
    if (statusLineEl) statusLineEl.textContent = 'Awaiting Claude Code session';
    if (chipEl) { chipEl.className = 'status-tag subtle'; chipEl.textContent = 'STANDBY'; }
    return;
  }

  if (hitRateEl) hitRateEl.textContent = `${cache.hitRatePercentage}%`;
  if (timerEl) timerEl.textContent = cache.formattedTtl || '05:00';
  if (statusLineEl) {
    statusLineEl.textContent = cache.isExpired
      ? 'Cache Expired • Will re-seed on next prompt'
      : `Cache ${cache.hitRatePercentage}% Hit Rate • Expires in ${cache.formattedTtl}`;
  }

  if (chipEl) {
    if (cache.isExpired) {
      chipEl.className = 'status-tag subtle';
      chipEl.textContent = 'EXPIRED';
    } else {
      chipEl.className = 'status-tag safe';
      chipEl.textContent = 'WARM';
    }
  }
}

// ========================================================
// Codex / OpenAI Service Status Renderer
// ========================================================
function renderCodexStatus(statuses) {
  const chip = document.getElementById('codex-status-chip');
  const desc = document.getElementById('codex-status-desc');
  if (!chip || !desc || !statuses) return;

  const openai = statuses.find(s => s.id === 'openai');
  if (openai) {
    const ind = openai.indicator || 'none';
    if (ind === 'none') {
      chip.className = 'status-tag safe';
      chip.textContent = 'OPERATIONAL';
    } else if (ind === 'minor') {
      chip.className = 'status-tag warning';
      chip.textContent = 'DEGRADED';
    } else {
      chip.className = 'status-tag critical';
      chip.textContent = 'OUTAGE';
    }
    desc.textContent = openai.description || 'All Systems Operational';
  }
}



// ========================================================
// Official Antigravity Telemetry Pools Renderer
// ========================================================
function renderOfficialPools(groups, activeModel) {
  const container = document.getElementById('official-pools-list');
  if (!container) return;

  if (!groups || groups.length === 0) {
    container.innerHTML = '<div class="subtle" style="text-align: center; padding: 14px; font-size: 10px;">Listening for Antigravity quotas...</div>';
    return;
  }

  const isClaudeActive = activeModel && activeModel.id && activeModel.id.includes('claude');

  container.innerHTML = groups.map(group => {
    const isClaudeGroup = group.displayName && (group.displayName.toLowerCase().includes('claude') || group.displayName.toLowerCase().includes('gpt'));
    const isSelectedGroup = isClaudeGroup ? isClaudeActive : !isClaudeActive;
    const iconSvg = isClaudeGroup ? ICONS.sparkles : ICONS.zap;

    const bucketsHtml = (group.buckets || []).map(b => {
      return `
        <div class="pool-bucket-item">
          <div class="pool-bucket-top">
            <span class="pool-bucket-title">${escapeHtml(b.displayName)}</span>
            <span class="pool-bucket-pct mono">${b.percentage}%</span>
          </div>
          <div class="pool-bucket-rail">
            <div class="pool-bucket-fill" style="width: ${b.percentage}%;"></div>
          </div>
          <div class="pool-bucket-desc">${escapeHtml(b.description || '')}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="pool-group-card ${isSelectedGroup ? 'is-active' : ''}">
        <div class="pool-group-head">
          <div class="pool-head-left">
            <span class="pool-glyph">${iconSvg}</span>
            <div>
              <span class="pool-name">${escapeHtml(group.displayName)}</span>
              <div class="pool-models-desc">${escapeHtml(group.description || '')}</div>
            </div>
          </div>
        </div>
        <div class="pool-buckets-list">
          ${bucketsHtml}
        </div>
      </div>
    `;
  }).join('');
}

// ========================================================
// All Models Matrix
// ========================================================
function renderModelsMatrix(models) {
  const container = document.getElementById('models-list');
  if (!container || !models) return;

  container.innerHTML = models.map(model => {
    const isSelected = model.isSelected;
    const isLow = model.remainingCalls <= 10;
    return `
      <div class="matrix-card ${isSelected ? 'is-active' : ''}">
        <div class="matrix-card-header">
          <div class="matrix-card-title">
            <span class="matrix-glyph">${ICONS[model.iconKey] || ''}</span>
            <span class="matrix-card-name">${model.name}</span>
            <span class="cost-pill">${model.badge}</span>
          </div>
          <div class="matrix-card-calls mono" style="color: ${isLow ? 'var(--text-subtle)' : 'var(--text-pure)'};">
            ${model.percentage}%
          </div>
        </div>
        <div class="matrix-rail">
          <div class="matrix-fill" style="width: ${model.percentage}%;"></div>
        </div>
        <div class="matrix-card-sub">
          <span>${model.tier}</span>
          <span class="mono">${model.percentage}% Available</span>
        </div>
      </div>
    `;
  }).join('');
}

function populateSettings(settings) {
  if (!settings) return;

  const sprintLow = document.getElementById('chk-sprint-low');
  if (sprintLow) sprintLow.checked = !!settings.notifySprintLow;

  const weeklyLow = document.getElementById('chk-weekly-low');
  if (weeklyLow) weeklyLow.checked = !!settings.notifyWeeklyLow;

  const sprintRefill = document.getElementById('chk-sprint-refill');
  if (sprintRefill) sprintRefill.checked = !!settings.notifySprintRefilled;

  const contextNudge = document.getElementById('chk-context-nudge');
  if (contextNudge) contextNudge.checked = !!settings.notifyContextLimit;

  const hudWeekly = document.getElementById('chk-hud-weekly');
  if (hudWeekly) hudWeekly.checked = settings.showWeeklyInHud !== undefined ? !!settings.showWeeklyInHud : true;

  const floatHud = document.getElementById('chk-float-hud');
  if (floatHud) floatHud.checked = !!settings.enableFloatingHud;

  const sound = document.getElementById('chk-sound');
  if (sound) sound.checked = !!settings.soundEnabled;

  const radio = document.querySelector(`input[name="refresh-interval"][value="${settings.pollingIntervalSec || 60}"]`);
  if (radio) radio.checked = true;

  if (settings.visibleSections) {
    const secAntigravity = document.getElementById('chk-sec-antigravity');
    if (secAntigravity) secAntigravity.checked = !!settings.visibleSections.antigravity;

    const secClaude = document.getElementById('chk-sec-claudeCode');
    if (secClaude) secClaude.checked = !!settings.visibleSections.claudeCode;

    const secCodex = document.getElementById('chk-sec-codex');
    if (secCodex) secCodex.checked = !!settings.visibleSections.codex;

    const secGrok = document.getElementById('chk-sec-grokCli');
    if (secGrok) secGrok.checked = !!settings.visibleSections.grokCli;

    applySectionVisibility(settings.visibleSections);
  }

  if (settings.theme) {
    applyTheme(settings.theme);
  }
}

function startCountdownTicker() {
  if (countdownTimer) clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    if (!currentStatus) return;

    const now = Date.now();
    const sprintMs = Math.max(0, currentStatus.sprint.resetAt - now);
    const weeklyMs = Math.max(0, currentStatus.weekly.resetAt - now);

    const weeklyTimerEl = document.getElementById('weekly-timer');
    if (weeklyTimerEl) weeklyTimerEl.textContent = formatDuration(weeklyMs);

    // Update hud-reset-timer with friendly duration (e.g. 1 hour, 31 minutes)
    const hudResetTimer = document.getElementById('hud-reset-timer');
    if (hudResetTimer) {
      hudResetTimer.innerHTML = formatFriendlyDurationHtml(sprintMs);
    }

    const sessionTimerEl = document.getElementById('session-timer');
    if (sessionTimerEl) {
      sessionTimerEl.textContent = `${formatFriendlyDuration(sprintMs)} remaining`;
    }

    // Claude Prompt Cache Countdown
    if (currentStatus.promptCache && currentStatus.promptCache.available && currentStatus.promptCache.expiresAt) {
      const cacheMs = Math.max(0, currentStatus.promptCache.expiresAt - now);
      const timerEl = document.getElementById('cache-ttl-timer');
      const statusLineEl = document.getElementById('cache-status-line');
      const formatted = formatCountdown(cacheMs);
      if (timerEl) timerEl.textContent = formatted;
      if (statusLineEl) {
        statusLineEl.textContent = cacheMs <= 0
          ? 'Cache Expired • Will re-seed on next prompt'
          : `Cache ${currentStatus.promptCache.hitRatePercentage}% Hit Rate • Expires in ${formatted}`;
      }
    }

    if (sprintMs === 0 || weeklyMs === 0) {
      window.antigravityAPI.refreshQuota().then(res => {
        currentStatus = res;
        renderStatus(res);
      });
    }
  }, 1000);
}

function getQuotaHueColor(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  // At 100% remaining: Hue 130° (crisp Apple neon emerald)
  // At 50%: Hue 45° (warm amber gold)
  // At 0%: Hue 0° (pure coral crimson warning)
  const hue = clamped >= 50 ? (45 + ((clamped - 50) / 50) * 85) : ((clamped / 50) * 45);
  return `hsl(${Math.round(hue)}, 84%, 48%)`;
}

function formatCountdown(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

function formatFriendlyDurationHtml(ms) {
  if (ms <= 0) return '<span class="timer-num">0</span><span class="timer-unit"> minutes</span>';
  const totalSecs = Math.floor(ms / 1000);
  const totalMins = Math.floor(totalSecs / 60);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (days > 0) {
    return `<span class="timer-num">${days}</span><span class="timer-unit"> day${days > 1 ? 's' : ''}, </span><span class="timer-num">${remHours}</span><span class="timer-unit"> hour${remHours > 1 ? 's' : ''}</span>`;
  }
  if (hours > 0) {
    return `<span class="timer-num">${hours}</span><span class="timer-unit"> hour${hours > 1 ? 's' : ''}, </span><span class="timer-num">${mins}</span><span class="timer-unit"> minute${mins > 1 ? 's' : ''}</span>`;
  }
  return `<span class="timer-num">${mins}</span><span class="timer-unit"> minute${mins > 1 ? 's' : ''}</span>`;
}

function formatFriendlyDuration(ms) {
  if (ms <= 0) return '0 minutes';
  const totalSecs = Math.floor(ms / 1000);
  const totalMins = Math.floor(totalSecs / 60);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${remHours} hour${remHours > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}, ${mins} minute${mins > 1 ? 's' : ''}`;
  }
  return `${mins} minute${mins > 1 ? 's' : ''}`;
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}
