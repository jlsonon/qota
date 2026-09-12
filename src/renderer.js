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

  // Expand Floating Bar to Full Dashboard
  const hudExpandBtn = document.getElementById('btn-hud-expand');
  if (hudExpandBtn) {
    hudExpandBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.antigravityAPI.setWindowMode('expanded');
      document.body.className = 'mode-expanded';
      currentStatus = await window.antigravityAPI.getQuotaStatus();
      renderStatus(currentStatus);
    });
  }

  // Double-click Floating HUD to expand
  const floatingHud = document.getElementById('floating-hud');
  if (floatingHud) {
    floatingHud.addEventListener('dblclick', async (e) => {
      if (e.target.closest('#btn-hud-expand')) return;
      await window.antigravityAPI.setWindowMode('expanded');
      document.body.className = 'mode-expanded';
      currentStatus = await window.antigravityAPI.getQuotaStatus();
      renderStatus(currentStatus);
    });
  }

  // Collapse Full Dashboard back to Floating Bar
  const collapseBtn = document.getElementById('btn-collapse-hud');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', async () => {
      await window.antigravityAPI.setWindowMode('compact');
      document.body.className = 'mode-compact';
      currentStatus = await window.antigravityAPI.getQuotaStatus();
      renderStatus(currentStatus);
    });
  }

  // Settings Save
  const saveBtn = document.getElementById('btn-save-settings');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const selectedInterval = document.querySelector('input[name="refresh-interval"]:checked');
      const newSettings = {
        notifySprintLow: document.getElementById('chk-sprint-low')?.checked ?? true,
        notifyWeeklyLow: document.getElementById('chk-weekly-low')?.checked ?? true,
        notifySprintRefilled: document.getElementById('chk-sprint-refill')?.checked ?? true,
        notifyContextLimit: document.getElementById('chk-context-nudge')?.checked ?? true,
        showWeeklyInHud: document.getElementById('chk-hud-weekly')?.checked ?? true,
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

  // 1. FLOATING DYNAMIC DECREASING QUOTA BAR (HUD Island)
  const hudModelName = document.getElementById('hud-model-name');
  const hudAssistantBadge = document.getElementById('hud-assistant-badge');
  const hudBarFill = document.getElementById('hud-bar-fill');
  const hudWeeklyBarFill = document.getElementById('hud-weekly-bar-fill');

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
    hudModelName.textContent = status.activeModel.name;
    hudModelName.title = `[${(status.activeAssistant || 'Assistant').toUpperCase()}] ${status.activeModel.name} (${status.activeModel.multiplier}x cost)`;
  }
  if (hudBarFill && status.activeModel) {
    hudBarFill.style.width = `${status.activeModel.percentage}%`;
  }
  if (hudWeeklyBarFill && status.weekly) {
    hudWeeklyBarFill.style.width = `${status.weekly.percentage}%`;
  }



  // 3. Status Pill in Header
  const pill = document.getElementById('status-pill');
  const pillText = document.getElementById('status-text');
  if (pill && pillText) {
    pill.className = `status-badge ${status.statusTier}`;
    pillText.textContent = status.statusTier.toUpperCase();
  }

  // 4. Official Antigravity Telemetry Pools
  renderOfficialPools(status.groups, status.activeModel);

  // 5. Weekly Linear Rail
  const weeklyFill = document.getElementById('weekly-progress-fill');
  const weeklyUnitsEl = document.getElementById('weekly-units');
  const weeklyPctEl = document.getElementById('weekly-pct');
  const weeklyChip = document.getElementById('weekly-status-chip');

  if (weeklyFill && status.weekly) {
    weeklyFill.style.width = `${status.weekly.percentage}%`;
  }
  if (weeklyUnitsEl && status.weekly) {
    weeklyUnitsEl.textContent = `${status.weekly.remaining.toLocaleString()} / ${status.weekly.max.toLocaleString()} units`;
  }
  if (weeklyPctEl && status.weekly) {
    weeklyPctEl.textContent = `${status.weekly.percentage}%`;
  }

  if (weeklyChip && status.weekly) {
    if (status.weekly.percentage <= 15) {
      weeklyChip.className = 'status-tag critical';
      weeklyChip.textContent = 'CRITICAL';
    } else if (status.weekly.percentage <= 50) {
      weeklyChip.className = 'status-tag warning';
      weeklyChip.textContent = 'MODERATE';
    } else {
      weeklyChip.className = 'status-tag safe';
      weeklyChip.textContent = 'NORMAL';
    }
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
            ~${model.remainingCalls} <span class="subtle">left</span>
          </div>
        </div>
        <div class="matrix-rail">
          <div class="matrix-fill" style="width: ${model.percentage}%;"></div>
        </div>
        <div class="matrix-card-sub">
          <span>${model.tier}</span>
          <span class="mono">~${model.weeklyCalls.toLocaleString()} weekly</span>
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

    const hudTimerEl = document.getElementById('hud-refill-timer');
    if (hudTimerEl) hudTimerEl.textContent = formatDuration(sprintMs);

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
