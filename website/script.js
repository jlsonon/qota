/**
 * QOTA — Interactive Engine (A+++++++ Tactile Edition)
 *
 * Implements:
 * 1. Web Audio API Haptics Synthesizer (Zero audio assets, pure synthetic acoustic feedback)
 * 2. macOS Desktop Spaces Switcher (Space 1: VS Code, Space 2: Ghostty, Space 3: Browser Docs)
 * 3. 2D Model Multiplier & Quota Velocity Pad (Pointer physics, dynamic token rate scaling)
 * 4. Global Keystroke Reactivity & Physical Keycaps Ribbon (1, 2, 3, Space, R, T, M, D)
 * 5. Local Filesystem Delta Stream Drawer (Live local socket/jsonl translation logs)
 * 6. Pixel-perfect draggable HUD with Cocoa NSScreenSaverWindowLevel (1001) persistence
 * 7. Light / Dark system theme synchronization with custom monochrome palettes
 */

document.addEventListener('DOMContentLoaded', () => {
  initWebAudioHaptics();
  initThemeManager();
  initAssistantProfiles();
  initDraggableHUD();
  initDesktopSpaces();
  initVelocityPad();
  initKeyboardRibbon();
  initTelemetrySimulator();
  initActionHandlers();
  initClipboard();
  initSystemTrayPopover();
  initMacClock();
});

/* ==========================================================================
   1. Web Audio Haptics Synthesizer (Procedural Acoustic Feedback)
   ========================================================================== */
let audioCtx = null;
let audioEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function initWebAudioHaptics() {
  const toggleBtn = document.getElementById('btn-audio-toggle');

  // Retrieve user preference
  const stored = localStorage.getItem('qota-audio') ?? localStorage.getItem('limits-audio');
  if (stored !== null) {
    audioEnabled = stored === 'true';
  } else {
    audioEnabled = true; // Enabled by default for tactile Keeby feel
  }

  updateAudioToggleUI();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      getAudioContext();
      audioEnabled = !audioEnabled;
      localStorage.setItem('qota-audio', audioEnabled ? 'true' : 'false');
      updateAudioToggleUI();
      if (audioEnabled) {
        playKeyClick(1000);
      }
    });
  }

  // Resume AudioContext on first user gesture anywhere
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

function updateAudioToggleUI() {
  const toggleBtn = document.getElementById('btn-audio-toggle');
  if (!toggleBtn) return;
  if (audioEnabled) {
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-pressed', 'true');
    toggleBtn.innerHTML = `
      <span class="audio-wave-icon">
        <span></span><span></span><span></span>
      </span>
      <span class="audio-label mono">HAPTICS: ON</span>
    `;
  } else {
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.innerHTML = `
      <span class="audio-wave-icon muted">
        <span></span><span></span><span></span>
      </span>
      <span class="audio-label mono">HAPTICS: MUTED</span>
    `;
  }
}

/**
 * Mechanical Keycap Click: 12ms highpass filtered impulse imitating a cherry switch
 */
function playKeyClick(freq = 820) {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, ctx.currentTime + 0.015);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.018);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.02);
  } catch (err) {
    // Audio fail safe
  }
}

/**
 * Terminal Prompt Thump: 55Hz sub-bass punch + high affirmative chirp on dispatch
 */
function playPromptThump() {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // 1. Sub-bass punch
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.09);

    subGain.gain.setValueAtTime(0.18, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(ctx.currentTime);
    subOsc.stop(ctx.currentTime + 0.11);

    // 2. High crisp chirp
    const chirpOsc = ctx.createOscillator();
    const chirpGain = ctx.createGain();
    chirpOsc.type = 'triangle';
    chirpOsc.frequency.setValueAtTime(1400, ctx.currentTime);
    chirpOsc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.035);

    chirpGain.gain.setValueAtTime(0.06, ctx.currentTime);
    chirpGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

    chirpOsc.connect(chirpGain);
    chirpGain.connect(ctx.destination);
    chirpOsc.start(ctx.currentTime);
    chirpOsc.stop(ctx.currentTime + 0.045);
  } catch (err) {
    // Safe
  }
}

/**
 * Switch Relay: Dual micro-clicks imitating an electronic relay or workspace switch
 */
function playSwitchRelay() {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    playKeyClick(1100);
    setTimeout(() => {
      playKeyClick(880);
    }, 22);
  } catch (err) {
    // Safe
  }
}

/**
 * Velocity Pad Tone: Modulated resonant micro-tone when dragging the 2D puck
 */
let lastPuckToneTime = 0;
function playPuckTone(freq = 440) {
  if (!audioEnabled) return;
  const now = performance.now();
  if (now - lastPuckToneTime < 50) return; // Throttle audio events
  lastPuckToneTime = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (err) {
    // Safe
  }
}

/**
 * Refill Chime: Ascending two-tone harmonic chime (C5 -> G5)
 */
function playRefillChime() {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.07);

      gain.gain.setValueAtTime(0.09, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.17);
    });
  } catch (err) {
    // Safe
  }
}

/* ==========================================================================
   2. Theme Management (Light / Dark Mode)
   ========================================================================== */
function initThemeManager() {
  const lightBtn = document.getElementById('btn-theme-light');
  const darkBtn = document.getElementById('btn-theme-dark');

  const storedTheme = localStorage.getItem('qota-theme') ?? localStorage.getItem('limits-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  if (lightBtn) {
    lightBtn.addEventListener('click', () => {
      playKeyClick(900);
      applyTheme('light');
      localStorage.setItem('qota-theme', 'light');
    });
  }

  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      playKeyClick(700);
      applyTheme('dark');
      localStorage.setItem('qota-theme', 'dark');
    });
  }

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('qota-theme') && !localStorage.getItem('limits-theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark' || theme === 'obsidian' || theme === 'titanium';
    const effectiveTheme = isDark ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', effectiveTheme);

    if (lightBtn && darkBtn) {
      if (effectiveTheme === 'light') {
        lightBtn.classList.add('active');
        darkBtn.classList.remove('active');
      } else {
        darkBtn.classList.add('active');
        lightBtn.classList.remove('active');
      }
    }
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('qota-theme', target);

  const lightBtn = document.getElementById('btn-theme-light');
  const darkBtn = document.getElementById('btn-theme-dark');
  if (lightBtn && darkBtn) {
    if (target === 'light') {
      lightBtn.classList.add('active');
      darkBtn.classList.remove('active');
    } else {
      darkBtn.classList.add('active');
      lightBtn.classList.remove('active');
    }
  }
  playKeyClick(target === 'light' ? 920 : 680);
  logFsEvent('THEME_TOGGLE', `Surface switched to ${target.toUpperCase()} mode palette`);
}

/* ==========================================================================
   3. Assistant Profiles & Telemetry State
   ========================================================================== */
const ASSISTANT_CONFIG = {
  antigravity: {
    name: 'Antigravity',
    badge: 'AGY',
    model: 'Gemini 3.8 Flash (High)',
    costLabel: '1 unit',
    baseCost: 2,
    costValue: 2,
    maxSprint: 250,
    currentSprint: 220,
    weeklyPercent: 97,
    trayTag: 'AGY: FLASH 3.8'
  },
  claude: {
    name: 'Claude Code',
    badge: 'CLAUDE',
    model: 'Claude Sonnet 4.6 (Thinking)',
    costLabel: '4 units',
    baseCost: 8,
    costValue: 8,
    maxSprint: 250,
    currentSprint: 155,
    weeklyPercent: 74,
    trayTag: 'CLAUDE: SONNET 4.6'
  },
  codex: {
    name: 'OpenAI Codex',
    badge: 'CODEX',
    model: 'OpenAI o3-mini (High)',
    costLabel: '2 units',
    baseCost: 4,
    costValue: 4,
    maxSprint: 250,
    currentSprint: 195,
    weeklyPercent: 89,
    trayTag: 'CODEX: o3-mini'
  }
};

let currentAssistant = 'antigravity';
let currentMultiplier = 1.0;
let currentVelocity = 1.0;

function initAssistantProfiles() {
  const pills = document.querySelectorAll('.asst-pill-btn');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      playSwitchRelay();
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const asstKey = pill.getAttribute('data-asst');
      if (ASSISTANT_CONFIG[asstKey]) {
        currentAssistant = asstKey;
        recalculateActiveCost();
        syncHUDDisplay();
        logFsEvent('ASSISTANT_SWITCH', `Active engine focused: ${ASSISTANT_CONFIG[asstKey].name} (${ASSISTANT_CONFIG[asstKey].model})`);
      }
    });
  });
}

function selectAssistantByIndex(idx) {
  const keys = ['antigravity', 'claude', 'codex'];
  if (idx >= 0 && idx < keys.length) {
    const key = keys[idx];
    const targetPill = document.querySelector(`.asst-pill-btn[data-asst="${key}"]`);
    if (targetPill) {
      targetPill.click();
    }
  }
}

function recalculateActiveCost() {
  const cfg = ASSISTANT_CONFIG[currentAssistant];
  if (!cfg) return;

  const scaled = Math.max(1, Math.round(cfg.baseCost * currentMultiplier));
  cfg.costValue = scaled;
  cfg.costLabel = `${scaled} units`;

  const costBtnLabel = document.getElementById('btn-sim-cost');
  if (costBtnLabel) costBtnLabel.textContent = cfg.costLabel;
}

function syncHUDDisplay() {
  const cfg = ASSISTANT_CONFIG[currentAssistant];
  if (!cfg) return;

  const badgeEl = document.getElementById('replica-badge');
  const modelEl = document.getElementById('replica-model');
  const costBtnLabel = document.getElementById('btn-sim-cost');
  const sprintFill = document.getElementById('replica-fill-5h');
  const weeklyFill = document.getElementById('replica-fill-7d');

  if (badgeEl) badgeEl.textContent = cfg.badge;
  if (modelEl) modelEl.textContent = cfg.model;
  if (costBtnLabel) costBtnLabel.textContent = cfg.costLabel;

  const pct = Math.max(0, Math.min(100, Math.round((cfg.currentSprint / cfg.maxSprint) * 100)));

  if (sprintFill) {
    sprintFill.style.width = `${pct}%`;
    sprintFill.classList.remove('warning', 'critical');
    if (pct < 20) {
      sprintFill.classList.add('critical');
    } else if (pct < 45) {
      sprintFill.classList.add('warning');
    }
  }

  if (weeklyFill) {
    weeklyFill.style.width = `${cfg.weeklyPercent}%`;
  }

  const readout = document.getElementById('sim-readout');
  if (readout) {
    readout.textContent = `Sprint: ${cfg.currentSprint}/${cfg.maxSprint}u • ${pct}%`;
  }

  const trayUnits = document.getElementById('tray-live-units');
  const trayModel = document.getElementById('tray-live-model');
  const trayDot = document.getElementById('tray-live-dot');
  const macMenuTrayPct = document.getElementById('mac-menu-tray-pct');
  const macMenuTrayDot = document.getElementById('mac-menu-tray-dot');

  if (trayUnits) trayUnits.textContent = `${pct}%`;
  if (macMenuTrayPct) macMenuTrayPct.textContent = `${pct}%`;
  if (trayModel) trayModel.textContent = cfg.trayTag;

  const dotClass = pct < 20 ? 'red' : (pct < 45 ? 'amber' : 'green');
  if (trayDot) {
    trayDot.className = `tray-dot ${dotClass}`;
  }
  if (macMenuTrayDot) {
    macMenuTrayDot.className = `tray-dot ${dotClass}`;
  }

  const trayAsst = document.getElementById('tray-menu-asst');
  const trayQuota = document.getElementById('tray-menu-quota');
  if (trayAsst) trayAsst.textContent = cfg.name;
  if (trayQuota) trayQuota.textContent = `${cfg.currentSprint} / ${cfg.maxSprint}u (${pct}%)`;
}

/* ==========================================================================
   4. macOS Desktop Spaces Switcher (Space 1 VS Code, Space 2 Ghostty, Space 3 Docs)
   ========================================================================== */
function initDesktopSpaces() {
  const tabs = document.querySelectorAll('.space-tab-btn');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const spaceIndex = parseInt(tab.getAttribute('data-space'), 10);
      switchDesktopSpace(spaceIndex);
    });
  });
}

function switchDesktopSpace(spaceNum) {
  const tabs = document.querySelectorAll('.space-tab-btn');
  const surfaces = [
    document.getElementById('space-surface-1'),
    document.getElementById('space-surface-2'),
    document.getElementById('space-surface-3')
  ];

  playSwitchRelay();

  tabs.forEach(t => {
    const idx = parseInt(t.getAttribute('data-space'), 10);
    const isActive = idx === spaceNum;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  surfaces.forEach((surf, idx) => {
    if (!surf) return;
    if (idx === (spaceNum - 1)) {
      surf.style.display = 'flex';
      surf.classList.add('active');
    } else {
      surf.style.display = 'none';
      surf.classList.remove('active');
    }
  });

  const spaceTitles = ['VS Code IDE', 'Ghostty Terminal', 'Browser Docs'];
  const title = spaceTitles[spaceNum - 1] || `Space ${spaceNum}`;
  logFsEvent('SPACE_MIGRATE', `Switched to Space ${spaceNum} (${title}) • Cocoa level 1001 HUD remained in place`);
}

/* ==========================================================================
   5. 2D Model Multiplier & Quota Velocity Pad (Pointer Physics)
   ========================================================================== */
function initVelocityPad() {
  const surface = document.getElementById('velocity-pad-surface');
  const puck = document.getElementById('velocity-puck');
  const crossH = document.getElementById('pad-cross-h');
  const crossV = document.getElementById('pad-cross-v');
  const coordsLabel = document.getElementById('velocity-coords');

  if (!surface || !puck) return;

  let isDraggingPad = false;

  function updatePadPosition(clientX, clientY) {
    const rect = surface.getBoundingClientRect();
    let normX = (clientX - rect.left) / rect.width;
    let normY = (clientY - rect.top) / rect.height;

    // Clamped strictly to [0, 1]
    normX = Math.max(0, Math.min(1, normX));
    normY = Math.max(0, Math.min(1, normY));

    // Multiplier (X-axis): 1.0x (Left) to 8.0x (Right)
    const mult = +(1.0 + (normX * 7.0)).toFixed(1);

    // Velocity / Burst (Y-axis): 1.0x (Bottom) to 5.0x (Top)
    const vel = +(1.0 + ((1.0 - normY) * 4.0)).toFixed(1);

    currentMultiplier = mult;
    currentVelocity = vel;

    // Reposition Puck & Crosshairs
    puck.style.left = `${normX * 100}%`;
    puck.style.top = `${normY * 100}%`;

    if (crossH) crossH.style.top = `${normY * 100}%`;
    if (crossV) crossV.style.left = `${normX * 100}%`;

    // Acoustic tone feedback
    const baseFreq = 220 + (normX * 350) + ((1 - normY) * 200);
    playPuckTone(baseFreq);

    // Update readout
    if (coordsLabel) {
      coordsLabel.textContent = `${mult.toFixed(1)}x MULT • ${vel.toFixed(1)}x VELOCITY`;
    }

    // Live update unit cost
    recalculateActiveCost();
  }

  function onPadPointerDown(e) {
    isDraggingPad = true;
    puck.classList.add('active');
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    updatePadPosition(clientX, clientY);

    window.addEventListener('mousemove', onPadPointerMove);
    window.addEventListener('mouseup', onPadPointerUp);
    window.addEventListener('touchmove', onPadPointerMove, { passive: false });
    window.addEventListener('touchend', onPadPointerUp);
  }

  function onPadPointerMove(e) {
    if (!isDraggingPad) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    updatePadPosition(clientX, clientY);
  }

  function onPadPointerUp() {
    if (!isDraggingPad) return;
    isDraggingPad = false;
    puck.classList.remove('active');

    window.removeEventListener('mousemove', onPadPointerMove);
    window.removeEventListener('mouseup', onPadPointerUp);
    window.removeEventListener('touchmove', onPadPointerMove);
    window.removeEventListener('touchend', onPadPointerUp);

    playKeyClick(600);
    logFsEvent('MULTIPLIER_SET', `2D Pad locked: ${currentMultiplier.toFixed(1)}x cost multiplier, ${currentVelocity.toFixed(1)}x velocity`);
  }

  surface.addEventListener('mousedown', onPadPointerDown);
  surface.addEventListener('touchstart', onPadPointerDown, { passive: false });

  // Accessible keyboard control for puck
  puck.addEventListener('keydown', (e) => {
    const step = 0.05;
    const currLeft = parseFloat(puck.style.left || '15') / 100;
    const currTop = parseFloat(puck.style.top || '75') / 100;
    const rect = surface.getBoundingClientRect();

    if (e.key === 'ArrowRight') {
      updatePadPosition(rect.left + (currLeft + step) * rect.width, rect.top + currTop * rect.height);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      updatePadPosition(rect.left + (currLeft - step) * rect.width, rect.top + currTop * rect.height);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      updatePadPosition(rect.left + currLeft * rect.width, rect.top + (currTop - step) * rect.height);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      updatePadPosition(rect.left + currLeft * rect.width, rect.top + (currTop + step) * rect.height);
      e.preventDefault();
    }
  });
}

/* ==========================================================================
   6. Global Keystroke Reactivity & Keyboard Ribbon (Keeby-inspired)
   ========================================================================== */
function initKeyboardRibbon() {
  const ribbonBadges = document.querySelectorAll('.key-badge');

  // Click on badges directly for mouse users
  ribbonBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      const key = badge.getAttribute('data-key');
      triggerKeyAction(key);
      animateKeyBadge(badge);
    });
  });

  // Global window listener
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes inside inputs or contenteditable elements
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return; // Allow browser shortcuts

    const key = e.key.toLowerCase();
    const isHandled = triggerKeyAction(key);

    if (isHandled) {
      if (key === ' ' || key === 'enter') {
        e.preventDefault(); // Prevent spacebar scroll
      }
      const matchBadge = document.querySelector(`.key-badge[data-key="${key === 'enter' ? ' ' : key}"]`);
      if (matchBadge) {
        animateKeyBadge(matchBadge);
      }
    }
  });
}

function animateKeyBadge(el) {
  if (!el) return;
  el.classList.add('pressed');
  playKeyClick(780);
  setTimeout(() => {
    el.classList.remove('pressed');
  }, 160);
}

function triggerKeyAction(key) {
  switch (key) {
    case '1':
      selectAssistantByIndex(0);
      switchDesktopSpace(1);
      return true;

    case '2':
      selectAssistantByIndex(1);
      switchDesktopSpace(2);
      return true;

    case '3':
      selectAssistantByIndex(2);
      switchDesktopSpace(3);
      return true;

    case ' ':
    case 'enter': {
      const promptBtn = document.getElementById('btn-sim-prompt');
      if (promptBtn) {
        promptBtn.click();
      }
      return true;
    }

    case 'r': {
      const refillBtn = document.getElementById('btn-sim-refill');
      if (refillBtn) {
        refillBtn.click();
      }
      return true;
    }

    case 't': {
      const btn7d = document.getElementById('replica-btn-7d');
      if (btn7d) {
        btn7d.click();
      }
      return true;
    }

    case 'm': {
      const btnMatrix = document.getElementById('replica-btn-matrix');
      if (btnMatrix) {
        btnMatrix.click();
      }
      return true;
    }

    case 'd':
      toggleTheme();
      return true;

    default:
      return false;
  }
}

/* ==========================================================================
   7. Local Filesystem Delta Stream Drawer
   ========================================================================== */
function logFsEvent(op, msg) {
  const body = document.getElementById('fs-stream-body');
  if (!body) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const row = document.createElement('div');
  row.className = 'fs-log-row';
  row.innerHTML = `<span class="fs-time">${timeStr}</span> <span class="fs-op">${op}</span> <span class="fs-msg">${msg}</span>`;

  body.appendChild(row);

  // Keep max 25 rows to prevent DOM bloat
  while (body.children.length > 25) {
    body.removeChild(body.children[0]);
  }

  // Smooth scroll to latest log
  body.scrollTop = body.scrollHeight;

  // Pulse indicator
  const indicator = document.querySelector('.fs-indicator');
  if (indicator) {
    indicator.style.transform = 'scale(1.4)';
    setTimeout(() => {
      indicator.style.transform = '';
    }, 150);
  }
}

/* ==========================================================================
   8. Draggable HUD Replica Physics (Pixel-Perfect Relative Clamping)
   ========================================================================== */
function initDraggableHUD() {
  const hud = document.getElementById('interactive-hud');
  const surface = document.getElementById('sim-editor-surface');
  const cueText = document.getElementById('drag-cue-text');
  if (!hud || !surface) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  function onPointerDown(e) {
    if (e.target.closest('button') || e.target.closest('.replica-matrix-popover')) return;

    isDragging = true;
    hud.classList.add('dragging');
    playKeyClick(680);

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    startX = clientX;
    startY = clientY;

    const hudRect = hud.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();

    initialLeft = hudRect.left - surfaceRect.left;
    initialTop = hudRect.top - surfaceRect.top;

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    const surfaceRect = surface.getBoundingClientRect();
    const hudWidth = hud.offsetWidth;
    const hudHeight = hud.offsetHeight;

    const maxLeft = surfaceRect.width - hudWidth - 16;
    const maxTop = surfaceRect.height - hudHeight - 16;
    const minLeft = 16;
    const minTop = 16;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
    newTop = Math.max(minTop, Math.min(maxTop, newTop));

    hud.style.left = `${newLeft}px`;
    hud.style.top = `${newTop}px`;
    hud.style.right = 'auto';

    if (cueText) {
      cueText.textContent = `HUD Position Clamped: [X: ${Math.round(newLeft)}px, Y: ${Math.round(newTop)}px] • Pinned Level 1001`;
    }
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    hud.classList.remove('dragging');

    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);

    playKeyClick(750);
  }

  hud.addEventListener('mousedown', onPointerDown);
  hud.addEventListener('touchstart', onPointerDown, { passive: false });
}

/* ==========================================================================
   9. Telemetry Simulator Actions (Prompt Consumption & Refill)
   ========================================================================== */
function initTelemetrySimulator() {
  const promptBtn = document.getElementById('btn-sim-prompt');
  const refillBtn = document.getElementById('btn-sim-refill');
  const toastChip = document.getElementById('replica-toast-chip');
  const hud = document.getElementById('interactive-hud');

  if (promptBtn) {
    promptBtn.addEventListener('click', () => {
      const cfg = ASSISTANT_CONFIG[currentAssistant];
      if (!cfg) return;

      playPromptThump();

      // Deduct units dynamically based on pad multiplier
      cfg.currentSprint = Math.max(0, cfg.currentSprint - cfg.costValue);
      syncHUDDisplay();

      // Floating deduction toast chip
      if (toastChip && hud) {
        const hudRect = hud.getBoundingClientRect();
        const surface = document.getElementById('sim-editor-surface');
        if (surface) {
          const surfRect = surface.getBoundingClientRect();
          const chipLeft = (hudRect.left - surfRect.left) + (hud.offsetWidth / 2) - 28;
          const chipTop = Math.max(10, (hudRect.top - surfRect.top) - 28);
          toastChip.style.left = `${chipLeft}px`;
          toastChip.style.top = `${chipTop}px`;
        }

        toastChip.textContent = `-${cfg.costValue}u`;
        toastChip.style.display = 'block';
        toastChip.style.animation = 'none';
        void toastChip.offsetWidth; // Force reflow
        toastChip.style.animation = 'chipFloat 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards';

        setTimeout(() => {
          toastChip.style.display = 'none';
        }, 750);
      }

      // Tactile rail shimmer
      const sprintFill = document.getElementById('replica-fill-5h');
      if (sprintFill) {
        sprintFill.style.filter = 'brightness(1.9)';
        setTimeout(() => {
          sprintFill.style.filter = '';
        }, 120);
      }

      logFsEvent('TOKEN_DISPATCH', `Dispatched prompt &bull; -${cfg.costValue}u deducted from ${cfg.badge} [${cfg.currentSprint}/${cfg.maxSprint}u]`);
    });
  }

  if (refillBtn) {
    refillBtn.addEventListener('click', () => {
      const cfg = ASSISTANT_CONFIG[currentAssistant];
      if (!cfg) return;

      playRefillChime();
      cfg.currentSprint = cfg.maxSprint;
      syncHUDDisplay();

      logFsEvent('SPRINT_REFILL', `Restored ${cfg.badge} sprint baseline to +${cfg.maxSprint} units full capacity`);
    });
  }
}

/* ==========================================================================
   10. HUD Replica Hover Controls (7D toggle & Matrix popover)
   ========================================================================== */
function initActionHandlers() {
  const btn7d = document.getElementById('replica-btn-7d');
  const weeklyRow = document.getElementById('replica-weekly-row');
  const btnMatrix = document.getElementById('replica-btn-matrix');
  const matrixPopover = document.getElementById('replica-matrix-popover');

  let weeklyVisible = true;
  let matrixVisible = false;

  if (btn7d && weeklyRow) {
    btn7d.addEventListener('click', (e) => {
      e.stopPropagation();
      playKeyClick(850);
      weeklyVisible = !weeklyVisible;
      weeklyRow.style.display = weeklyVisible ? 'block' : 'none';
      btn7d.style.opacity = weeklyVisible ? '1' : '0.4';
      logFsEvent('HUD_7D_TOGGLE', `Weekly 7-Day baseline rail ${weeklyVisible ? 'visible' : 'hidden'}`);
    });
  }

  if (btnMatrix && matrixPopover) {
    btnMatrix.addEventListener('click', (e) => {
      e.stopPropagation();
      playKeyClick(950);
      matrixVisible = !matrixVisible;
      matrixPopover.style.display = matrixVisible ? 'flex' : 'none';
      btnMatrix.style.background = matrixVisible ? 'var(--text-pure)' : '';
      btnMatrix.style.color = matrixVisible ? 'var(--bg-page)' : '';
      logFsEvent('HUD_MATRIX', `Multi-model multiplier matrix popover ${matrixVisible ? 'expanded' : 'collapsed'}`);
    });
  }

  // Binary download modal handlers
  const macDl = document.getElementById('btn-mac-dl');
  const winDl = document.getElementById('btn-win-dl');
  const dlModal = document.getElementById('dl-info-modal');
  const dlTitle = document.getElementById('dl-modal-title');
  const dlDesc = document.getElementById('dl-modal-desc');
  const dlClose = document.getElementById('dl-modal-close');

  if (macDl) {
    macDl.addEventListener('click', (e) => {
      e.preventDefault();
      playPromptThump();
      if (dlModal && dlTitle && dlDesc) {
        dlTitle.textContent = 'MACOS UNIVERSAL (.DMG) — APPLE SILICON & INTEL';
        dlDesc.innerHTML = 'Built for macOS 12+ (Monterey, Ventura, Sonoma, Sequoia). Includes hardened runtime with <code>NSScreenSaverWindowLevel</code>. If macOS Gatekeeper alerts on first run, use: <code>xattr -cr /Applications/Qota.app</code>';
        dlModal.style.display = 'block';
        dlModal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  if (winDl) {
    winDl.addEventListener('click', (e) => {
      e.preventDefault();
      playPromptThump();
      if (dlModal && dlTitle && dlDesc) {
        dlTitle.textContent = 'WINDOWS 64-BIT (.EXE) — PORTABLE & INSTALLER';
        dlDesc.innerHTML = 'Built for Windows 10/11 64-bit. Utilizes native Win32 <code>HWND_TOPMOST</code> window flags and direct tray hooks. If Windows SmartScreen prompts, select "More Info" &rarr; "Run Anyway".';
        dlModal.style.display = 'block';
        dlModal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  if (dlClose && dlModal) {
    dlClose.addEventListener('click', () => {
      playKeyClick(650);
      dlModal.style.display = 'none';
    });
  }
}

/* ==========================================================================
   11. Interactive System Tray Menu Simulator
   ========================================================================== */
function initSystemTrayPopover() {
  const trigger = document.getElementById('sys-tray-trigger');
  const popover = document.getElementById('tray-menu-popover');
  const onTopAction = document.getElementById('tray-menu-action-ontop');
  const resetAction = document.getElementById('tray-menu-action-reset');

  if (!trigger || !popover) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    playKeyClick(900);
    const isVisible = popover.style.display === 'block';
    popover.style.display = isVisible ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !trigger.contains(e.target)) {
      popover.style.display = 'none';
    }
  });

  let alwaysOnTop = true;
  if (onTopAction) {
    onTopAction.addEventListener('click', () => {
      playKeyClick(850);
      alwaysOnTop = !alwaysOnTop;
      const val = onTopAction.querySelector('.menu-val');
      if (val) val.innerHTML = alwaysOnTop ? '&check;' : '&times;';
      logFsEvent('TRAY_ON_TOP', `Always on top toggle set to ${alwaysOnTop}`);
    });
  }

  if (resetAction) {
    resetAction.addEventListener('click', () => {
      playRefillChime();
      const val = resetAction.querySelector('.menu-val');
      if (val) val.textContent = 'OK';
      const trayDot = document.getElementById('tray-live-dot');
      if (trayDot) {
        trayDot.style.transform = 'scale(1.5)';
        setTimeout(() => {
          trayDot.style.transform = '';
          if (val) val.innerHTML = '&circlearrowright;';
        }, 300);
      }
      logFsEvent('TRAY_RESET', 'Daemon cache refreshed and socket resynced');
    });
  }
}

/* ==========================================================================
   12. Clipboard Copy for Terminal Commands
   ========================================================================== */
function initClipboard() {
  const copyBtn = document.getElementById('cli-copy-btn');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', async () => {
    playPromptThump();
    const text = `git clone https://github.com/jlsonon/limits.git\ncd limits\nnpm install\nnpm start`;
    try {
      await navigator.clipboard.writeText(text);
      const original = copyBtn.textContent;
      copyBtn.textContent = 'COPIED TO CLIPBOARD';
      copyBtn.style.background = '#ffffff';
      copyBtn.style.color = '#000000';

      setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.style.background = '';
        copyBtn.style.color = '';
      }, 2000);
      logFsEvent('CLI_COPY', 'Quickstart commands copied to system clipboard');
    } catch (err) {
      copyBtn.textContent = 'CMD+C TO COPY';
    }
  });
}

/* ==========================================================================
   13. Authentic macOS Desktop Menu Bar Live Clock
   ========================================================================== */
function initMacClock() {
  const clockEl = document.getElementById('mac-clock-time');
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[now.getDay()];
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 12-hour format
    clockEl.textContent = `${dayName} ${hours}:${minutes} ${ampm}`;
  }

  updateClock();
  setInterval(updateClock, 10000);
}
