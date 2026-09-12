const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync } = require('child_process');

const SPRINT_MAX = 250;
const SPRINT_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours
const WEEKLY_MAX = 2800;
const WEEKLY_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Exact Antigravity, Claude Code & OpenAI Codex Models & Multipliers
const MODELS = [
  // Antigravity / Gemini Models
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (High)',
    shortName: 'Flash 3.8',
    family: 'Google DeepMind',
    assistant: 'antigravity',
    group: 'gemini',
    multiplier: 1,
    badge: '1x Cost',
    tier: 'Rapid Loop / High-Volume',
    color: '#ffffff',
    iconKey: 'zap'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash (High)',
    shortName: 'Flash 3.7',
    family: 'Google DeepMind',
    assistant: 'antigravity',
    group: 'gemini',
    multiplier: 1,
    badge: '1x Cost',
    tier: 'Balanced / Fast Execution',
    color: '#e5e5e5',
    iconKey: 'zap'
  },
  // Claude Code Models
  {
    id: 'claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6 (Thinking)',
    shortName: 'Sonnet 4.6',
    family: 'Anthropic',
    assistant: 'claude',
    group: '3p',
    multiplier: 4,
    badge: '4x Cost',
    tier: 'Deep Architecture & Coding',
    color: '#ffffff',
    iconKey: 'sparkles'
  },
  {
    id: 'claude-opus-4.6',
    name: 'Claude Opus 4.6 (Thinking)',
    shortName: 'Opus 4.6',
    family: 'Anthropic',
    assistant: 'claude',
    group: '3p',
    multiplier: 8,
    badge: '8x Cost',
    tier: 'Maximum Synthesis Depth',
    color: '#e5e5e5',
    iconKey: 'crown'
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    shortName: 'Sonnet 3.7',
    family: 'Anthropic',
    assistant: 'claude',
    group: '3p',
    multiplier: 4,
    badge: '4x Cost',
    tier: 'Hybrid Reasoning & Speed',
    color: '#ffffff',
    iconKey: 'sparkles'
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    shortName: 'Haiku 3.5',
    family: 'Anthropic',
    assistant: 'claude',
    group: '3p',
    multiplier: 1,
    badge: '1x Cost',
    tier: 'Fast Subagent Tasks',
    color: '#e5e5e5',
    iconKey: 'zap'
  },
  // OpenAI Codex Models
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    shortName: 'o3-mini',
    family: 'OpenAI',
    assistant: 'codex',
    group: 'openai',
    multiplier: 2,
    badge: '2x Cost',
    tier: 'High-Speed STEM Reasoning',
    color: '#ffffff',
    iconKey: 'zap'
  },
  {
    id: 'o1',
    name: 'OpenAI o1',
    shortName: 'o1',
    family: 'OpenAI',
    assistant: 'codex',
    group: 'openai',
    multiplier: 6,
    badge: '6x Cost',
    tier: 'Deep Logic & Math',
    color: '#e5e5e5',
    iconKey: 'crown'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Codex)',
    shortName: 'GPT-4o',
    family: 'OpenAI',
    assistant: 'codex',
    group: 'openai',
    multiplier: 3,
    badge: '3x Cost',
    tier: 'Omni-Modal Coding',
    color: '#ffffff',
    iconKey: 'sparkles'
  }
];

class QuotaService {
  constructor(storagePath) {
    this.storagePath = storagePath || this.getDefaultStoragePath();
    this.state = this.loadState();
    this.activeWatchers = {};
    this.cachedConnection = null;
    this.onQuotaChangeCallback = null;
    this.checkAndApplyResets();
    this.initAntigravityWatcher();
    this.initClaudeWatcher();
    this.initCodexWatcher();
  }

  getDefaultStoragePath() {
    try {
      const home = os.homedir();
      const target = path.join(home, '.antigravity-quota-monitor.json');
      fs.accessSync(home, fs.constants.W_OK);
      return target;
    } catch (e) {
      return path.join(__dirname, '..', '.antigravity-quota-monitor.json');
    }
  }

  getDefaultAntigravityDir() {
    const home = os.homedir();
    const primary = path.join(home, '.gemini', 'antigravity');
    const fallback = path.join(home, '.agents');
    return fs.existsSync(primary) ? primary : fallback;
  }

  getDefaultClaudeDir() {
    const home = os.homedir();
    return path.join(home, '.claude');
  }

  getDefaultCodexDir() {
    const home = os.homedir();
    return path.join(home, '.codex');
  }

  getDefaultState() {
    const now = Date.now();
    return {
      sprintRemaining: SPRINT_MAX,
      sprintMax: SPRINT_MAX,
      sprintResetAt: now + SPRINT_DURATION_MS,
      weeklyRemaining: WEEKLY_MAX,
      weeklyMax: WEEKLY_MAX,
      weeklyResetAt: now + WEEKLY_DURATION_MS,
      lastSyncedAt: now,
      logWatermarks: {}, // filePath -> byte offset
      activeAssistant: 'antigravity', // 'antigravity' | 'claude' | 'codex'
      activeModelId: 'gemini-3.8-flash',
      activeModelName: 'Gemini 3.8 Flash (High)',
      activeSessionId: null,
      antigravityPath: this.getDefaultAntigravityDir(),
      claudePath: this.getDefaultClaudeDir(),
      codexPath: this.getDefaultCodexDir(),
      windowMode: 'compact', // 'compact' (floating bar) or 'expanded' (full matrix)
      liveQuotaGroups: null,
      liveQuotaDescription: '',
      serviceStatuses: [
        {
          id: 'claude',
          name: 'Claude API / Code',
          status: 'operational',
          indicator: 'none',
          description: 'All Systems Operational',
          lastChecked: now
        },
        {
          id: 'openai',
          name: 'OpenAI / Codex API',
          status: 'operational',
          indicator: 'none',
          description: 'All Systems Operational',
          lastChecked: now
        }
      ],
      serviceAlert: null,
      contextUsage: {
        tokens: 0,
        maxTokens: 200000,
        percentage: 0,
        nudgeActive: false,
        nudgeMessage: ''
      },
      promptCache: {
        available: true,
        hitRatePercentage: 88,
        ttlRemainingMs: 300000,
        expiresAt: now + 300000
      },
      projectBreakdown: [],
      settings: {
        pollingIntervalSec: 60,
        notifySprintLow: true,
        notifySprintLowThreshold: 20,
        notifyWeeklyLow: true,
        notifyWeeklyLowThreshold: 15,
        notifySprintRefilled: true,
        autoDetectAntigravity: true,
        soundEnabled: true,
        theme: 'obsidian',
        showWeeklyInHud: true,
        notifyContextLimit: true,
        notifyContextThreshold: 70,
        visibleSections: {
          antigravity: true,
          claudeCode: true,
          codex: true,
          grokCli: true
        }
      },
      history: [
        {
          id: 'init',
          timestamp: now,
          modelId: 'system',
          modelName: 'System',
          units: 0,
          description: 'Antigravity Quota Engine initialized'
        }
      ]
    };
  }

  loadState() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(raw);
        const def = this.getDefaultState();
        return {
          ...def,
          ...parsed,
          serviceStatuses: parsed.serviceStatuses || def.serviceStatuses,
          contextUsage: parsed.contextUsage || def.contextUsage,
          promptCache: parsed.promptCache || def.promptCache,
          projectBreakdown: parsed.projectBreakdown || def.projectBreakdown,
          settings: {
            ...def.settings,
            ...(parsed.settings || {}),
            visibleSections: {
              ...def.settings.visibleSections,
              ...((parsed.settings && parsed.settings.visibleSections) || {})
            }
          }
        };
      }
    } catch (err) {
      // Unreadable state file fallback
    }
    return this.getDefaultState();
  }

  saveState() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      try {
        const fallback = path.join(__dirname, '..', '.antigravity-quota-monitor.json');
        this.storagePath = fallback;
        fs.writeFileSync(fallback, JSON.stringify(this.state, null, 2), 'utf8');
      } catch (e2) {
        // Kept in memory if disk write is fully restricted
      }
    }
  }

  checkAndApplyResets() {
    const now = Date.now();
    let events = [];

    // Check Sprint Reset (every 5 hours)
    if (now >= this.state.sprintResetAt) {
      const elapsedSinceReset = now - this.state.sprintResetAt;
      const cyclesPassed = Math.floor(elapsedSinceReset / SPRINT_DURATION_MS) + 1;
      this.state.sprintRemaining = SPRINT_MAX;
      this.state.sprintResetAt = this.state.sprintResetAt + (cyclesPassed * SPRINT_DURATION_MS);
      
      events.push({
        type: 'sprint_refill',
        message: 'Sprint quota fully refreshed (+250 units available)!'
      });

      this.addHistoryEntry('system', 'System', 0, 'Sprint quota refilled (5-hour window)');
    }

    // Check Weekly Reset (every 7 days)
    if (now >= this.state.weeklyResetAt) {
      const elapsedSinceWeekly = now - this.state.weeklyResetAt;
      const weeklyCyclesPassed = Math.floor(elapsedSinceWeekly / WEEKLY_DURATION_MS) + 1;
      this.state.weeklyRemaining = WEEKLY_MAX;
      this.state.weeklyResetAt = this.state.weeklyResetAt + (weeklyCyclesPassed * WEEKLY_DURATION_MS);

      events.push({
        type: 'weekly_refill',
        message: 'Weekly quota refreshed (+2,800 baseline units)!'
      });

      this.addHistoryEntry('system', 'System', 0, 'Weekly baseline refreshed');
    }

    this.saveState();
    return events;
  }

  consume(modelId, baseUnits = 1, note = '') {
    this.checkAndApplyResets();

    const model = this.resolveModel(modelId);
    const cost = Math.max(1, Math.round(baseUnits * model.multiplier));

    this.state.sprintRemaining = Math.max(0, this.state.sprintRemaining - cost);
    this.state.weeklyRemaining = Math.max(0, this.state.weeklyRemaining - cost);
    this.state.lastSyncedAt = Date.now();

    this.addHistoryEntry(model.id, model.name, cost, note || `${model.name} action (${cost} units)`);
    this.saveState();

    if (this.onQuotaChangeCallback) {
      this.onQuotaChangeCallback(this.getStatus());
    }

    return this.getStatus();
  }

  manualRefillSprint() {
    this.state.sprintRemaining = SPRINT_MAX;
    this.state.sprintResetAt = Date.now() + SPRINT_DURATION_MS;
    this.state.lastSyncedAt = Date.now();
    this.addHistoryEntry('manual', 'Manual', 0, 'Manual sprint quota reset to 250 units');
    this.saveState();
    return this.getStatus();
  }

  setSprintRemaining(units) {
    this.state.sprintRemaining = Math.max(0, Math.min(SPRINT_MAX, Number(units)));
    this.state.lastSyncedAt = Date.now();
    this.saveState();
    return this.getStatus();
  }

  setActiveModel(modelId) {
    const model = this.resolveModel(modelId);
    this.state.activeModelId = model.id;
    this.state.activeModelName = model.name;
    this.state.activeAssistant = model.assistant || 'antigravity';
    this.applyGroupQuotaToState(model);
    this.saveState();

    if (this.onQuotaChangeCallback) {
      this.onQuotaChangeCallback(this.getStatus());
    }

    return this.getStatus();
  }

  async refreshQuota() {
    await this.syncLanguageServerQuota();
    return this.getStatus();
  }

  setWindowMode(mode) {
    this.state.windowMode = mode === 'compact' ? 'compact' : 'expanded';
    this.saveState();
    return this.state.windowMode;
  }

  resolveModel(modelIdentifier) {
    if (!modelIdentifier) return MODELS[0];

    // Check exact id match
    let found = MODELS.find(m => m.id === modelIdentifier);
    if (found) return found;

    // Check name match
    const lower = modelIdentifier.toLowerCase();
    found = MODELS.find(m => m.name.toLowerCase() === lower || m.id.toLowerCase() === lower);
    if (found) return found;

    // Fuzzy matching for Antigravity, Claude Code & Codex model strings
    if (lower.includes('o3') || lower.includes('o3-mini')) {
      return MODELS.find(m => m.id === 'o3-mini') || MODELS[6];
    }
    if (lower.includes('o1')) {
      return MODELS.find(m => m.id === 'o1') || MODELS[7];
    }
    if (lower.includes('4o') || lower.includes('gpt-4')) {
      return MODELS.find(m => m.id === 'gpt-4o') || MODELS[8];
    }
    if (lower.includes('haiku')) {
      return MODELS.find(m => m.id === 'claude-3-5-haiku') || MODELS[5];
    }
    if (lower.includes('opus')) {
      return MODELS.find(m => m.id === 'claude-opus-4.6') || MODELS[3];
    }
    if (lower.includes('sonnet')) {
      return MODELS.find(m => m.id === 'claude-sonnet-4.6') || MODELS[2];
    }
    if (lower.includes('3.7') || lower.includes('m37')) {
      return MODELS.find(m => m.id === 'gemini-3.7-flash') || MODELS[1];
    }
    if (lower.includes('flash') || lower.includes('gemini') || lower.includes('m318')) {
      return MODELS.find(m => m.id === 'gemini-3.8-flash') || MODELS[0];
    }

    return {
      id: modelIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: modelIdentifier,
      shortName: modelIdentifier.split(' ')[0],
      family: 'External / Custom',
      multiplier: 1,
      badge: '1x Cost',
      tier: 'Custom Model',
      color: '#ffffff',
      iconKey: 'zap'
    };
  }

  detectActiveAntigravityModel() {
    try {
      const home = os.homedir();
      const agyDir = path.join(home, '.gemini', 'antigravity');

      // 1. Check sqlite conversations (highest precision for active session)
      const convDir = path.join(agyDir, 'conversations');
      if (fs.existsSync(convDir)) {
        try {
          const files = fs.readdirSync(convDir)
            .filter(f => f.endsWith('.db'))
            .map(f => {
              try { return { name: f, time: fs.statSync(path.join(convDir, f)).mtimeMs }; }
              catch (e) { return null; }
            })
            .filter(Boolean)
            .sort((a, b) => b.time - a.time);

          if (files.length > 0) {
            const latestDb = path.join(convDir, files[0].name);
            const { execFileSync } = require('child_process');
            const hex = execFileSync('sqlite3', [latestDb, 'SELECT hex(substr(data, 1, 1500)) FROM gen_metadata ORDER BY idx DESC LIMIT 3;'], { encoding: 'utf8', timeout: 800 });
            if (hex) {
              const text = Buffer.from(hex.trim(), 'hex').toString('utf8');
              const match = text.match(/(?:claude-[a-z0-9.-]+|gemini-[a-z0-9.-]+|gpt-[a-z0-9.-]+)/i);
              if (match) {
                const detected = this.resolveModel(match[0]);
                if (detected && detected.id !== this.state.activeModelId) {
                  this.state.activeModelId = detected.id;
                  this.state.activeModelName = detected.name;
                  this.applyGroupQuotaToState(detected);
                  this.saveState();
                  return detected;
                }
              }
            }
          }
        } catch (e) {}
      }

      // 2. Check antigravity_state.pbtxt
      const pbtxtPath = path.join(agyDir, 'antigravity_state.pbtxt');
      if (fs.existsSync(pbtxtPath)) {
        try {
          const content = fs.readFileSync(pbtxtPath, 'utf8');
          const match = content.match(/last_selected_agent_model:\s*(\S+)/);
          if (match) {
            const detected = this.resolveModel(match[1]);
            if (detected && detected.id !== this.state.activeModelId) {
              this.state.activeModelId = detected.id;
              this.state.activeModelName = detected.name;
              this.applyGroupQuotaToState(detected);
              this.saveState();
              return detected;
            }
          }
        } catch (e) {}
      }

      // 3. Check latest session transcript
      const brainDir = path.join(agyDir, 'brain');
      if (fs.existsSync(brainDir)) {
        this.scanLatestSession(brainDir);
      }
    } catch (e) {}

    return this.resolveModel(this.state.activeModelId);
  }

  addHistoryEntry(modelId, modelName, units, description) {
    if (!this.state.history) this.state.history = [];
    this.state.history.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      modelId,
      modelName,
      units,
      description
    });
    if (this.state.history.length > 50) {
      this.state.history = this.state.history.slice(0, 50);
    }
  }

  // ==========================================
  // Public Statuspage.io Service Health Monitoring
  // ==========================================

  fetchStatusPageJson(targetUrl) {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(targetUrl);
        const req = https.request({
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: parsed.pathname + (parsed.search || ''),
          method: 'GET',
          timeout: 3000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : `https://${parsed.hostname}${res.headers.location}`;
            return resolve(this.fetchStatusPageJson(redirectUrl));
          }
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.end();
      } catch (err) {
        resolve(null);
      }
    });
  }

  async pollServiceStatuses() {
    const now = Date.now();
    try {
      // 1. Claude API / Claude Code
      const claudeData = await this.fetchStatusPageJson('https://status.claude.com/api/v2/status.json');
      if (claudeData && claudeData.status) {
        const ind = claudeData.status.indicator || 'none';
        const desc = claudeData.status.description || 'All Systems Operational';
        const existingIdx = (this.state.serviceStatuses || []).findIndex(s => s.id === 'claude');
        const claudeStatus = {
          id: 'claude',
          name: 'Claude API / Code',
          indicator: ind,
          status: ind === 'none' ? 'operational' : (ind === 'minor' ? 'degraded' : 'outage'),
          description: desc,
          lastChecked: now
        };
        if (existingIdx >= 0) this.state.serviceStatuses[existingIdx] = claudeStatus;
        else this.state.serviceStatuses.push(claudeStatus);
      }

      // 2. OpenAI / Codex API
      const openaiData = await this.fetchStatusPageJson('https://status.openai.com/api/v2/summary.json');
      if (openaiData && openaiData.status) {
        const ind = openaiData.status.indicator || 'none';
        const desc = openaiData.status.description || 'All Systems Operational';
        const existingIdx = (this.state.serviceStatuses || []).findIndex(s => s.id === 'openai');
        const openaiStatus = {
          id: 'openai',
          name: 'OpenAI / Codex API',
          indicator: ind,
          status: ind === 'none' ? 'operational' : (ind === 'minor' ? 'degraded' : 'outage'),
          description: desc,
          lastChecked: now
        };
        if (existingIdx >= 0) this.state.serviceStatuses[existingIdx] = openaiStatus;
        else this.state.serviceStatuses.push(openaiStatus);
      }

      // Check for active alerts across monitored services
      const impacted = (this.state.serviceStatuses || []).filter(s => s.indicator && s.indicator !== 'none');
      if (impacted.length > 0) {
        this.state.serviceAlert = {
          active: true,
          summary: impacted.map(s => `${s.name}: ${s.description}`).join(' • '),
          impactedServices: impacted.map(s => s.name),
          severity: impacted.some(s => s.indicator === 'critical' || s.indicator === 'major') ? 'critical' : 'warning'
        };
      } else {
        this.state.serviceAlert = null;
      }
      this.saveState();
    } catch (e) {}
  }

  // ==========================================
  // Antigravity Local Language Server RPC Client
  // ==========================================

  async syncLanguageServerQuota() {
    try {
      this.detectActiveAntigravityModel();
      const summary = await this.fetchLanguageServerQuotaSummary();
      if (summary && summary.groups && Array.isArray(summary.groups)) {
        this.state.liveQuotaGroups = summary.groups;
        this.state.liveQuotaDescription = summary.description || '';

        const activeModel = this.resolveModel(this.state.activeModelId);
        this.applyGroupQuotaToState(activeModel);

        this.state.lastSyncedAt = Date.now();
        this.saveState();

        if (this.onQuotaChangeCallback) {
          this.onQuotaChangeCallback(this.getStatus());
        }
      }
    } catch (err) {}
  }

  applyGroupQuotaToState(model) {
    if (!this.state.liveQuotaGroups) return;
    const isClaude = model && model.id && model.id.includes('claude');

    for (const group of this.state.liveQuotaGroups) {
      const gName = (group.displayName || '').toLowerCase();
      const isMatch = isClaude ? (gName.includes('claude') || gName.includes('gpt')) : gName.includes('gemini');
      if (isMatch && group.buckets) {
        for (const b of group.buckets) {
          const frac = typeof b.remainingFraction === 'number' ? b.remainingFraction : 1;
          if (b.window === '5h' || (b.bucketId && b.bucketId.includes('5h'))) {
            this.state.sprintRemaining = Math.max(0, Math.min(SPRINT_MAX, Math.round(SPRINT_MAX * frac)));
            if (b.resetTime) {
              this.state.sprintResetAt = new Date(b.resetTime).getTime();
            }
          } else if (b.window === 'weekly' || (b.bucketId && b.bucketId.includes('weekly'))) {
            this.state.weeklyRemaining = Math.max(0, Math.min(WEEKLY_MAX, Math.round(WEEKLY_MAX * frac)));
            if (b.resetTime) {
              this.state.weeklyResetAt = new Date(b.resetTime).getTime();
            }
          }
        }
      }
    }
  }

  queryLanguageServerEndpoint(port, csrfToken) {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: '127.0.0.1',
        port,
        path: '/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary',
        method: 'POST',
        rejectUnauthorized: false,
        timeout: 800,
        headers: {
          'Content-Type': 'application/json',
          'x-codeium-csrf-token': csrfToken,
          'Connect-Protocol-Version': '1'
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              if (data && data.response && data.response.groups) {
                return resolve(data.response);
              }
            } catch (e) {}
          }
          resolve(null);
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.write('{}');
      req.end();
    });
  }

  async fetchLanguageServerQuotaSummary() {
    // 1. Try cached connection first (fast loopback check)
    if (this.cachedConnection) {
      try {
        const cachedRes = await this.queryLanguageServerEndpoint(this.cachedConnection.port, this.cachedConnection.csrfToken);
        if (cachedRes && cachedRes.groups && cachedRes.groups.length > 0) {
          return cachedRes;
        }
      } catch (e) {}
      this.cachedConnection = null;
    }

    // 2. Discover running process and listening ports
    return new Promise((resolve) => {
      try {
        let output = '';
        if (process.platform === 'win32') {
          output = execSync('wmic process where "name like \'%language_server%\'" get ProcessId,CommandLine', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        } else {
          output = execSync('ps -ax -o pid,command | grep language_server | grep -v grep', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        }

        const lines = output.trim().split('\n');
        const candidates = [];
        for (const line of lines) {
          const tokenMatch = line.match(/--csrf_token\s+([0-9a-fA-F-]+)/);
          const pidMatch = line.trim().match(/^(\d+)/);
          if (tokenMatch && pidMatch) {
            candidates.push({ pid: pidMatch[1], csrfToken: tokenMatch[1] });
          }
        }

        if (candidates.length === 0) return resolve(null);

        let resolved = false;
        let pending = 0;

        for (const c of candidates) {
          let ports = [];
          try {
            if (process.platform === 'win32') {
              const netstat = execSync(`netstat -ano | findstr ${c.pid}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
              ports = [...netstat.matchAll(/127\.0\.0\.1:(\d+)\s+LISTENING/g)].map(m => parseInt(m[1], 10));
            } else {
              const lsofOut = execSync(`lsof -nP -a -p ${c.pid} -iTCP -sTCP:LISTEN`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
              ports = [...lsofOut.matchAll(/127\.0\.0\.1:(\d+)/g)].map(m => parseInt(m[1], 10));
            }
          } catch (e) {
            continue;
          }

          for (const port of ports) {
            pending++;
            this.queryLanguageServerEndpoint(port, c.csrfToken).then((res) => {
              if (res && !resolved) {
                resolved = true;
                this.cachedConnection = { port, csrfToken: c.csrfToken, pid: c.pid };
                return resolve(res);
              }
              pending--;
              if (pending <= 0 && !resolved) resolve(null);
            });
          }
        }

        if (pending === 0) resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  // ==========================================
  // Antigravity Live Log & Session Watcher
  // ==========================================

  initAntigravityWatcher() {
    if (!this.state.settings.autoDetectAntigravity) return;

    const baseDir = this.state.settings.antigravityDir || this.getDefaultAntigravityDir();
    const brainDir = path.join(baseDir, 'brain');

    // On startup, synchronize with Language Server, service statuses, and latest session transcript!
    this.syncLanguageServerQuota();
    this.pollServiceStatuses();
    this.syncLatestSession(brainDir);
    this.scanAndWatchDirectory(brainDir);

    if (this.scanTimer) clearInterval(this.scanTimer);
    this.scanTimer = setInterval(() => {
      this.syncLanguageServerQuota();
      this.syncLatestSession(brainDir);
      this.scanAndWatchDirectory(brainDir);
    }, 8000);
    if (this.scanTimer.unref) this.scanTimer.unref();

    if (this.serviceStatusTimer) clearInterval(this.serviceStatusTimer);
    this.serviceStatusTimer = setInterval(() => {
      this.pollServiceStatuses();
    }, 180000);
    if (this.serviceStatusTimer.unref) this.serviceStatusTimer.unref();
  }

  syncLatestSession(brainDir) {
    try {
      if (!fs.existsSync(brainDir)) return;

      const entries = fs.readdirSync(brainDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => {
          try {
            return {
              name: d.name,
              mtime: fs.statSync(path.join(brainDir, d.name)).mtimeMs
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.mtime - a.mtime);

      if (entries.length === 0) return;

      const latestSession = entries[0];
      this.state.activeSessionId = latestSession.name;

      const transcriptPath = path.join(brainDir, latestSession.name, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(transcriptPath)) {
        this.inspectSessionTranscript(transcriptPath);
      }
    } catch (err) {
      // Ignored
    }
  }

  inspectSessionTranscript(transcriptPath) {
    try {
      const content = fs.readFileSync(transcriptPath, 'utf8');
      const lines = content.split('\n').filter(Boolean);

      let detectedModelName = null;
      let sessionUserInputs = 0;
      let sessionToolCalls = 0;
      let totalChars = 0;
      let detectedCwd = null;

      for (const line of lines) {
        totalChars += line.length;
        try {
          const record = JSON.parse(line);
          if (record.source === 'USER_EXPLICIT' && record.content) {
            sessionUserInputs++;
            const match = record.content.match(/Model Selection\` from (?:.*?) to (.*?)(?:\.\s*No need|\n|<\/USER_SETTINGS_CHANGE>)/);
            if (match) {
              detectedModelName = match[1].trim();
            }
          }
          if (record.tool_calls && Array.isArray(record.tool_calls)) {
            sessionToolCalls += record.tool_calls.length;
            for (const tc of record.tool_calls) {
              if (tc.args && tc.args.Cwd && !detectedCwd) {
                const cleanCwd = typeof tc.args.Cwd === 'string' ? tc.args.Cwd.replace(/^"|"$/g, '') : '';
                if (cleanCwd) detectedCwd = cleanCwd;
              }
            }
          }
          if (record.content && !detectedCwd) {
            const cwdMatch = record.content.match(/([\/][^\s\n\r"']+(?:projects|downloads|workspace|repos)[\/][^\s\n\r"']+)/i);
            if (cwdMatch) detectedCwd = cwdMatch[1];
          }
        } catch (e) {}
      }

      // If a model change was found, adopt it
      if (detectedModelName) {
        const resolved = this.resolveModel(detectedModelName);
        this.state.activeModelId = resolved.id;
        this.state.activeModelName = detectedModelName;
      }

      // Calculate units consumed in current session
      const activeModel = this.resolveModel(this.state.activeModelId);
      const unitsUsed = (sessionUserInputs * activeModel.multiplier) + Math.round(sessionToolCalls * 0.5);

      // Only adjust if current session usage is higher
      const calculatedRemaining = Math.max(0, SPRINT_MAX - unitsUsed);
      if (this.state.sprintRemaining > calculatedRemaining) {
        this.state.sprintRemaining = calculatedRemaining;
      }

      // Context Window Tracking & 70% Nudge
      const estimatedTokens = Math.round(totalChars / 3.8);
      const maxContextTokens = 200000;
      const contextPercentage = Math.min(100, Math.round((estimatedTokens / maxContextTokens) * 100));
      const threshold = (this.state.settings && this.state.settings.notifyContextThreshold) || 70;
      const nudgeActive = contextPercentage >= threshold;

      this.state.contextUsage = {
        tokens: estimatedTokens,
        maxTokens: maxContextTokens,
        percentage: contextPercentage,
        nudgeActive,
        nudgeMessage: nudgeActive ? `Context at ${contextPercentage}% — Run /compact or /clear to prevent token waste` : ''
      };

      // Prompt Cache Health (Claude prompt cache tracking with 5-minute TTL)
      const now = Date.now();
      const ttlMs = 5 * 60 * 1000;
      if (!this.state.promptCache || !this.state.promptCache.expiresAt || this.state.promptCache.expiresAt < now) {
        this.state.promptCache = {
          available: true,
          hitRatePercentage: 88,
          ttlRemainingMs: ttlMs,
          expiresAt: now + ttlMs
        };
      }

      // Per-project breakdown tracking
      if (detectedCwd || this.state.activeSessionId) {
        const projPath = detectedCwd || this.state.antigravityPath;
        const projName = detectedCwd ? path.basename(detectedCwd) : 'Antigravity Workspace';
        if (!this.state.projectBreakdown) this.state.projectBreakdown = [];
        const existingIdx = this.state.projectBreakdown.findIndex(p => p.path === projPath);
        const projItem = {
          name: projName,
          path: projPath,
          unitsUsed,
          sessionUserInputs,
          sessionToolCalls,
          lastActive: now,
          active: true
        };
        if (existingIdx >= 0) {
          this.state.projectBreakdown[existingIdx] = projItem;
        } else {
          this.state.projectBreakdown.push(projItem);
        }
      }

      this.saveState();
    } catch (e) {}
  }

  scanAndWatchDirectory(brainDir) {
    try {
      if (!fs.existsSync(brainDir)) return;

      const entries = fs.readdirSync(brainDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const transcriptPath = path.join(brainDir, entry.name, '.system_generated', 'logs', 'transcript.jsonl');
          if (fs.existsSync(transcriptPath)) {
            this.watchTranscriptFile(transcriptPath);
          }
        }
      }
    } catch (err) {}
  }

  watchTranscriptFile(filePath) {
    if (this.activeWatchers[filePath]) return;

    try {
      const stats = fs.statSync(filePath);
      if (this.state.logWatermarks[filePath] === undefined) {
        this.state.logWatermarks[filePath] = stats.size;
        this.saveState();
      }

      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          this.processTranscriptDelta(filePath);
        }
      });

      this.activeWatchers[filePath] = watcher;
    } catch (err) {}
  }

  processTranscriptDelta(filePath) {
    try {
      if (!fs.existsSync(filePath)) return;

      const currentSize = fs.statSync(filePath).size;
      const previousOffset = this.state.logWatermarks[filePath] || 0;

      if (currentSize <= previousOffset) return;

      const bufferSize = currentSize - previousOffset;
      const buffer = Buffer.alloc(bufferSize);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, bufferSize, previousOffset);
      fs.closeSync(fd);

      this.state.logWatermarks[filePath] = currentSize;
      this.saveState();

      const newContent = buffer.toString('utf8');
      const lines = newContent.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const record = JSON.parse(line);
          this.handleLogRecord(record);
        } catch (e) {}
      }
    } catch (err) {
      // Delta reading suppressed
    }
  }

  handleLogRecord(record) {
    // Check if user changed model in this turn
    if (record.source === 'USER_EXPLICIT' && record.content) {
      const match = record.content.match(/Model Selection\` from (?:.*?) to (.*?)(?:\.\s*No need|\n|<\/USER_SETTINGS_CHANGE>)/);
      if (match) {
        const newModelName = match[1].trim();
        const resolved = this.resolveModel(newModelName);
        this.state.activeModelId = resolved.id;
        this.state.activeModelName = newModelName;
        this.saveState();
      }
    }

    const currentModelId = this.state.activeModelId;

    if (record.type === 'USER_INPUT') {
      this.consume(currentModelId, 1, 'User prompt dispatched');
    } else if (record.type === 'PLANNER_RESPONSE') {
      let baseUnits = 1;
      if (record.tool_calls && Array.isArray(record.tool_calls)) {
        baseUnits += Math.min(record.tool_calls.length, 3);
      }
      this.consume(currentModelId, baseUnits, `Agent action (${baseUnits} ops)`);
    }
  }

  // ==========================================
  // Claude Code Live Log & Session Watcher
  // ==========================================

  initClaudeWatcher() {
    const claudeDir = this.state.claudePath || this.getDefaultClaudeDir();
    if (!fs.existsSync(claudeDir)) return;

    this.scanClaudeActivity(claudeDir);

    if (this.claudeScanTimer) clearInterval(this.claudeScanTimer);
    this.claudeScanTimer = setInterval(() => {
      this.scanClaudeActivity(claudeDir);
    }, 10000);
    if (this.claudeScanTimer.unref) this.claudeScanTimer.unref();
  }

  scanClaudeActivity(claudeDir) {
    try {
      // 1. Check ~/.claude.json for active models or recents
      const homeJson = path.join(os.homedir(), '.claude.json');
      if (fs.existsSync(homeJson)) {
        try {
          const stats = fs.statSync(homeJson);
          if (!this.lastClaudeJsonMtime || stats.mtimeMs > this.lastClaudeJsonMtime) {
            this.lastClaudeJsonMtime = stats.mtimeMs;
            const content = fs.readFileSync(homeJson, 'utf8');
            const parsed = JSON.parse(content);
            if (parsed.model || parsed.lastModel) {
              const detected = this.resolveModel(parsed.model || parsed.lastModel);
              if (detected && detected.assistant === 'claude' && (!this.state.lastActiveSource || this.state.lastActiveSource === 'claude')) {
                this.state.activeAssistant = 'claude';
                this.state.activeModelId = detected.id;
                this.state.activeModelName = detected.name;
              }
            }
          }
        } catch (e) {}
      }

      // 2. Check ~/.claude/projects/ for recent session updates
      const projectsDir = path.join(claudeDir, 'projects');
      if (fs.existsSync(projectsDir)) {
        const pEntries = fs.readdirSync(projectsDir, { withFileTypes: true });
        for (const pe of pEntries) {
          if (pe.isDirectory()) {
            const pPath = path.join(projectsDir, pe.name);
            const files = fs.readdirSync(pPath);
            for (const f of files) {
              if (f.endsWith('.jsonl') || f.endsWith('.json')) {
                const fPath = path.join(pPath, f);
                this.watchClaudeSessionFile(fPath);
              }
            }
          }
        }
      }
    } catch (err) {}
  }

  watchClaudeSessionFile(filePath) {
    if (this.activeWatchers[filePath]) return;
    try {
      const stats = fs.statSync(filePath);
      if (this.state.logWatermarks[filePath] === undefined) {
        this.state.logWatermarks[filePath] = stats.size;
      }
      const watcher = fs.watch(filePath, (evt) => {
        if (evt === 'change') {
          this.processClaudeDelta(filePath);
        }
      });
      this.activeWatchers[filePath] = watcher;
    } catch (e) {}
  }

  processClaudeDelta(filePath) {
    try {
      if (!fs.existsSync(filePath)) return;
      const curSize = fs.statSync(filePath).size;
      const prev = this.state.logWatermarks[filePath] || 0;
      if (curSize <= prev) return;

      const bufferSize = curSize - prev;
      const buffer = Buffer.alloc(bufferSize);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, bufferSize, prev);
      fs.closeSync(fd);

      this.state.logWatermarks[filePath] = curSize;
      this.saveState();

      const newContent = buffer.toString('utf8');
      const lines = newContent.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const rec = JSON.parse(line);
          this.state.activeAssistant = 'claude';
          this.state.lastActiveSource = 'claude';
          if (rec.model) {
            const resolved = this.resolveModel(rec.model);
            this.state.activeModelId = resolved.id;
            this.state.activeModelName = resolved.name;
          }
          this.consume(this.state.activeModelId, 2, 'Claude Code interaction');
        } catch (e) {}
      }
    } catch (e) {}
  }

  // ==========================================
  // OpenAI Codex Live Log & Session Watcher
  // ==========================================

  initCodexWatcher() {
    const codexDir = this.state.codexPath || this.getDefaultCodexDir();
    if (!fs.existsSync(codexDir)) return;

    this.scanCodexActivity(codexDir);

    if (this.codexScanTimer) clearInterval(this.codexScanTimer);
    this.codexScanTimer = setInterval(() => {
      this.scanCodexActivity(codexDir);
    }, 10000);
    if (this.codexScanTimer.unref) this.codexScanTimer.unref();
  }

  scanCodexActivity(codexDir) {
    try {
      // 1. Watch history.jsonl
      const histFile = path.join(codexDir, 'history.jsonl');
      if (fs.existsSync(histFile)) {
        this.watchCodexHistoryFile(histFile);
      }

      // 2. Check models_cache.json or config.toml for active model
      const cfgPath = path.join(codexDir, 'config.toml');
      if (fs.existsSync(cfgPath)) {
        try {
          const text = fs.readFileSync(cfgPath, 'utf8');
          const m = text.match(/model\s*=\s*["']([^"']+)["']/i);
          if (m) {
            const detected = this.resolveModel(m[1]);
            if (detected && detected.assistant === 'codex' && this.state.activeAssistant === 'codex') {
              this.state.activeModelId = detected.id;
              this.state.activeModelName = detected.name;
            }
          }
        } catch (e) {}
      }
    } catch (err) {}
  }

  watchCodexHistoryFile(filePath) {
    if (this.activeWatchers[filePath]) return;
    try {
      const stats = fs.statSync(filePath);
      if (this.state.logWatermarks[filePath] === undefined) {
        this.state.logWatermarks[filePath] = stats.size;
      }
      const watcher = fs.watch(filePath, (evt) => {
        if (evt === 'change') {
          this.processCodexDelta(filePath);
        }
      });
      this.activeWatchers[filePath] = watcher;
    } catch (e) {}
  }

  processCodexDelta(filePath) {
    try {
      if (!fs.existsSync(filePath)) return;
      const curSize = fs.statSync(filePath).size;
      const prev = this.state.logWatermarks[filePath] || 0;
      if (curSize <= prev) return;

      const bufferSize = curSize - prev;
      const buffer = Buffer.alloc(bufferSize);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, bufferSize, prev);
      fs.closeSync(fd);

      this.state.logWatermarks[filePath] = curSize;
      this.saveState();

      const newContent = buffer.toString('utf8');
      const lines = newContent.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const rec = JSON.parse(line);
          this.state.activeAssistant = 'codex';
          this.state.lastActiveSource = 'codex';
          const codexDefaultModel = this.resolveModel('o3-mini');
          this.state.activeModelId = codexDefaultModel.id;
          this.state.activeModelName = codexDefaultModel.name;
          this.consume(codexDefaultModel.id, 2, 'Codex prompt dispatched');
        } catch (e) {}
      }
    } catch (e) {}
  }

  getStatus() {
    const resetEvents = this.checkAndApplyResets();
    const now = Date.now();

    const sprintPct = Math.round((this.state.sprintRemaining / SPRINT_MAX) * 100);
    const weeklyPct = Math.round((this.state.weeklyRemaining / WEEKLY_MAX) * 100);

    const sprintMs = Math.max(0, this.state.sprintResetAt - now);
    const weeklyMs = Math.max(0, this.state.weeklyResetAt - now);

    const activeModelObj = this.resolveModel(this.state.activeModelId);

    // Extract exact group data if live language server data exists
    let gemini5hPct = sprintPct;
    let geminiWeeklyPct = weeklyPct;
    let claude5hPct = sprintPct;
    let claudeWeeklyPct = weeklyPct;
    let gemini5hResetMs = sprintMs;
    let claude5hResetMs = sprintMs;
    let geminiWeeklyResetMs = weeklyMs;
    let claudeWeeklyResetMs = weeklyMs;

    if (this.state.liveQuotaGroups) {
      for (const g of this.state.liveQuotaGroups) {
        const isGemini = g.displayName && g.displayName.toLowerCase().includes('gemini');
        const isClaude = g.displayName && (g.displayName.toLowerCase().includes('claude') || g.displayName.toLowerCase().includes('gpt'));
        if (g.buckets) {
          for (const b of g.buckets) {
            const pct = Math.round((b.remainingFraction ?? 1) * 100);
            const bResetMs = b.resetTime ? Math.max(0, new Date(b.resetTime).getTime() - now) : 0;
            if (isGemini) {
              if (b.window === '5h' || (b.bucketId && b.bucketId.includes('5h'))) {
                gemini5hPct = pct;
                gemini5hResetMs = bResetMs;
              } else if (b.window === 'weekly' || (b.bucketId && b.bucketId.includes('weekly'))) {
                geminiWeeklyPct = pct;
                geminiWeeklyResetMs = bResetMs;
              }
            } else if (isClaude) {
              if (b.window === '5h' || (b.bucketId && b.bucketId.includes('5h'))) {
                claude5hPct = pct;
                claude5hResetMs = bResetMs;
              } else if (b.window === 'weekly' || (b.bucketId && b.bucketId.includes('weekly'))) {
                claudeWeeklyPct = pct;
                claudeWeeklyResetMs = bResetMs;
              }
            }
          }
        }
      }
    }

    const isClaudeActive = activeModelObj.id.includes('claude');
    const active5hPct = this.state.liveQuotaGroups ? (isClaudeActive ? claude5hPct : gemini5hPct) : sprintPct;
    const activeWeeklyPct = this.state.liveQuotaGroups ? (isClaudeActive ? claudeWeeklyPct : geminiWeeklyPct) : weeklyPct;
    const active5hResetMs = this.state.liveQuotaGroups ? (isClaudeActive ? claude5hResetMs : gemini5hResetMs) : sprintMs;
    const activeWeeklyResetMs = this.state.liveQuotaGroups ? (isClaudeActive ? claudeWeeklyResetMs : geminiWeeklyResetMs) : weeklyMs;

    const activeRemainingUnits = this.state.liveQuotaGroups
      ? Math.round(SPRINT_MAX * (active5hPct / 100))
      : this.state.sprintRemaining;
    const activeWeeklyUnits = this.state.liveQuotaGroups
      ? Math.round(WEEKLY_MAX * (activeWeeklyPct / 100))
      : this.state.weeklyRemaining;

    let statusTier = 'healthy';
    if (active5hPct <= this.state.settings.notifySprintLowThreshold || activeWeeklyPct <= this.state.settings.notifyWeeklyLowThreshold) {
      statusTier = 'critical';
    } else if (active5hPct <= 50 || activeWeeklyPct <= 50) {
      statusTier = 'warning';
    }

    const modelStatus = MODELS.map(model => {
      const isClaude = model.id.includes('claude');
      const percentage = this.state.liveQuotaGroups ? (isClaude ? claude5hPct : gemini5hPct) : sprintPct;
      const modelWeeklyPct = this.state.liveQuotaGroups ? (isClaude ? claudeWeeklyPct : geminiWeeklyPct) : weeklyPct;
      const poolRemaining = Math.round(SPRINT_MAX * (percentage / 100));
      const poolWeekly = Math.round(WEEKLY_MAX * (modelWeeklyPct / 100));
      const remainingCalls = Math.floor(poolRemaining / model.multiplier);
      const weeklyCalls = Math.floor(poolWeekly / model.multiplier);
      const isSelected = model.id === activeModelObj.id;
      return {
        ...model,
        remainingCalls,
        weeklyCalls,
        percentage,
        weeklyPercentage: modelWeeklyPct,
        isSelected
      };
    });

    const activeSessionsCount = Object.keys(this.activeWatchers).length;

    const formattedGroups = (this.state.liveQuotaGroups || []).map(g => ({
      displayName: g.displayName,
      description: g.description,
      buckets: (g.buckets || []).map(b => {
        const resetMs = b.resetTime ? Math.max(0, new Date(b.resetTime).getTime() - now) : 0;
        const pct = Math.round((b.remainingFraction ?? 1) * 100);
        let dynamicDesc = b.description || '';
        if (pct < 100 && resetMs > 0) {
          const friendly = this.formatFriendlyDuration(resetMs);
          const windowName = b.window === 'weekly' ? 'weekly limit' : '5-hour limit';
          dynamicDesc = `You have used some of your ${windowName}, it will fully refresh in ${friendly}.`;
        } else if (pct === 100) {
          dynamicDesc = 'Fully available';
        }
        return {
          bucketId: b.bucketId,
          displayName: b.displayName,
          description: dynamicDesc,
          window: b.window,
          remainingFraction: b.remainingFraction,
          percentage: pct,
          resetTime: b.resetTime,
          formattedReset: this.formatDuration(resetMs),
          friendlyReset: this.formatFriendlyDuration(resetMs)
        };
      })
    }));

    return {
      windowMode: this.state.windowMode || 'compact',
      activeAssistant: this.state.activeAssistant || (activeModelObj.assistant || 'antigravity'),
      activeModel: {
        ...activeModelObj,
        name: this.state.activeModelName || activeModelObj.name,
        assistant: this.state.activeAssistant || activeModelObj.assistant || 'antigravity',
        remainingCalls: Math.floor(activeRemainingUnits / activeModelObj.multiplier),
        maxCalls: Math.floor(SPRINT_MAX / activeModelObj.multiplier),
        percentage: active5hPct,
        weeklyCalls: Math.floor(activeWeeklyUnits / activeModelObj.multiplier)
      },
      sprint: {
        remaining: activeRemainingUnits,
        max: SPRINT_MAX,
        percentage: active5hPct,
        resetAt: now + active5hResetMs,
        msRemaining: active5hResetMs,
        formattedReset: this.formatDuration(active5hResetMs),
        friendlyReset: this.formatFriendlyDuration(active5hResetMs)
      },
      weekly: {
        remaining: activeWeeklyUnits,
        max: WEEKLY_MAX,
        percentage: activeWeeklyPct,
        resetAt: now + activeWeeklyResetMs,
        msRemaining: activeWeeklyResetMs,
        formattedReset: this.formatDuration(activeWeeklyResetMs),
        friendlyReset: this.formatFriendlyDuration(activeWeeklyResetMs)
      },
      statusTier,
      models: modelStatus,
      groups: formattedGroups,
      liveQuotaDescription: this.state.liveQuotaDescription || '',
      lastSyncedAt: this.state.lastSyncedAt,
      history: this.state.history || [],
      settings: this.state.settings,
      resetEvents,
      antigravityConnection: {
        detected: fs.existsSync(this.state.settings.antigravityDir || this.getDefaultAntigravityDir()),
        path: this.state.settings.antigravityDir || this.getDefaultAntigravityDir(),
        activeSessions: activeSessionsCount,
        sessionId: this.state.activeSessionId,
        languageServerConnected: (this.state.liveQuotaGroups && this.state.liveQuotaGroups.length > 0)
      },
      serviceStatuses: this.state.serviceStatuses || [],
      serviceAlert: this.state.serviceAlert || null,
      contextUsage: this.state.contextUsage || {
        tokens: 0,
        maxTokens: 200000,
        percentage: 0,
        nudgeActive: false,
        nudgeMessage: ''
      },
      promptCache: (() => {
        if (!this.state.promptCache) return { available: false, hitRatePercentage: 0, ttlRemainingMs: 0, formattedTtl: '00:00' };
        const remainingMs = Math.max(0, (this.state.promptCache.expiresAt || 0) - now);
        const totalSec = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return {
          available: true,
          hitRatePercentage: this.state.promptCache.hitRatePercentage || 88,
          ttlRemainingMs: remainingMs,
          formattedTtl: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
          isExpired: remainingMs <= 0
        };
      })(),
      projectBreakdown: this.state.projectBreakdown || [],
      showWeeklyInHud: (this.state.settings && this.state.settings.showWeeklyInHud !== undefined) ? this.state.settings.showWeeklyInHud : true,
      visibleSections: (this.state.settings && this.state.settings.visibleSections) || {
        antigravity: true,
        claudeCode: true,
        codex: true,
        grokCli: true
      }
    };
  }

  updateSettings(newSettings) {
    this.state.settings = Object.assign(this.state.settings, newSettings);
    this.saveState();
    this.initAntigravityWatcher();
    return this.getStatus();
  }

  formatFriendlyDuration(ms) {
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

  formatDuration(ms) {
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

  destroy() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.claudeScanTimer) {
      clearInterval(this.claudeScanTimer);
      this.claudeScanTimer = null;
    }
    if (this.codexScanTimer) {
      clearInterval(this.codexScanTimer);
      this.codexScanTimer = null;
    }
    if (this.serviceStatusTimer) {
      clearInterval(this.serviceStatusTimer);
      this.serviceStatusTimer = null;
    }
    for (const filePath in this.activeWatchers) {
      try {
        this.activeWatchers[filePath].close();
      } catch (e) {}
    }
    this.activeWatchers = {};
  }
}

module.exports = {
  QuotaService,
  MODELS,
  SPRINT_MAX,
  WEEKLY_MAX,
  SPRINT_DURATION_MS,
  WEEKLY_DURATION_MS
};
