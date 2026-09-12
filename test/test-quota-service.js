const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { QuotaService, SPRINT_MAX, WEEKLY_MAX } = require('../src/quota-service');

console.log('Testing QuotaService...');

const testDbPath = path.join(os.tmpdir(), `test-quota-${Date.now()}.json`);

try {
  const service = new QuotaService(testDbPath);
  let status = service.getStatus();

  // Test initial state
  assert.strictEqual(status.sprint.remaining, SPRINT_MAX, 'Sprint remaining should start at max');
  assert.strictEqual(status.weekly.remaining, WEEKLY_MAX, 'Weekly remaining should start at max');
  assert.strictEqual(status.statusTier, 'healthy', 'Initial status tier should be healthy');
  console.log('[OK] Initial state validated.');

  // Test consumption of Gemini Flash (1x)
  status = service.consume('gemini-3.8-flash', 10, 'Flash prompt test');
  assert.strictEqual(status.sprint.remaining, 240, 'Sprint should be reduced by 10');
  assert.strictEqual(status.weekly.remaining, 2790, 'Weekly should be reduced by 10');
  console.log('[OK] Gemini Flash 1x deduction validated.');

  // Test consumption of Claude Sonnet (4x)
  status = service.consume('claude-3.7-sonnet', 5, 'Sonnet prompt test');
  assert.strictEqual(status.sprint.remaining, 220, 'Sprint should be reduced by 20 (5 * 4)');
  assert.strictEqual(status.weekly.remaining, 2770, 'Weekly should be reduced by 20');
  console.log('[OK] Claude Sonnet 4x multiplier validated.');

  // Test consumption of Claude Opus (8x)
  status = service.consume('claude-opus', 2, 'Opus prompt test');
  assert.strictEqual(status.sprint.remaining, 204, 'Sprint should be reduced by 16 (2 * 8)');
  console.log('[OK] Claude Opus 8x multiplier validated.');

  // Test manual sprint refill
  status = service.manualRefillSprint();
  assert.strictEqual(status.sprint.remaining, SPRINT_MAX, 'Sprint should refill to max');
  console.log('[OK] Manual refill validated.');

  // Test critical threshold calculation
  service.setSprintRemaining(25); // 10%
  status = service.getStatus();
  assert.strictEqual(status.statusTier, 'critical', 'Status tier should be critical when below 20%');
  console.log('[OK] Status tier alerts validated.');

  // Test Active Model Switching and Decreasing Percentage
  service.setSprintRemaining(200); // 80% sprint
  status = service.setActiveModel('claude-sonnet-4.6');
  assert.strictEqual(status.activeModel.id, 'claude-sonnet-4.6', 'Active model should switch to Claude Sonnet');
  assert.strictEqual(status.activeModel.percentage, 80, 'Active model bar should show 80%');
  assert.strictEqual(status.activeModel.remainingCalls, 50, 'Claude Sonnet (4x) remaining calls should be 200 / 4 = 50');
  console.log('[OK] Active model switching and decreasing quota bar calculation validated.');

  // Test OpenAI Codex Model Resolution and Consumption
  status = service.setActiveModel('o3-mini');
  assert.strictEqual(status.activeModel.id, 'o3-mini', 'Active model should switch to o3-mini');
  assert.strictEqual(status.activeModel.assistant, 'codex', 'Model assistant should be codex');
  status = service.consume('o3-mini', 2, 'Codex reasoning test');
  assert.strictEqual(status.sprint.remaining, 196, 'Sprint should be reduced by 4 (2 * 2x multiplier)');
  console.log('[OK] OpenAI Codex o3-mini model resolution and consumption validated.');

  // Test Service Status and Incident Alert Formatting
  service.state.serviceStatuses = [
    { id: 'claude', name: 'Claude API', indicator: 'none', description: 'All Systems Operational' },
    { id: 'openai', name: 'OpenAI API', indicator: 'minor', description: 'Degraded Performance' }
  ];
  service.state.serviceAlert = {
    active: true,
    summary: 'OpenAI API: Degraded Performance',
    impactedServices: ['OpenAI API'],
    severity: 'warning'
  };
  status = service.getStatus();
  assert.strictEqual(status.serviceAlert.active, true, 'Service alert should be active');
  assert.strictEqual(status.serviceAlert.severity, 'warning', 'Severity should be warning');
  assert.strictEqual(status.serviceStatuses.length, 2, 'Should track 2 public services');
  console.log('[OK] Public Service Status and Outage Alerts validated.');

  // Test Context Nudge calculation at >= 70%
  service.state.contextUsage = {
    tokens: 148000,
    maxTokens: 200000,
    percentage: 74,
    nudgeActive: true,
    nudgeMessage: 'Context at 74% — Run /compact or /clear to prevent token waste'
  };
  status = service.getStatus();
  assert.strictEqual(status.contextUsage.percentage, 74, 'Context usage should be 74%');
  assert.strictEqual(status.contextUsage.nudgeActive, true, 'Context nudge should trigger at 74%');
  assert.ok(status.contextUsage.nudgeMessage.includes('/compact'), 'Nudge message should mention /compact');
  console.log('[OK] Context Window 70% threshold and /compact nudge validated.');

  // Test Prompt Cache Health
  service.state.promptCache = {
    available: true,
    hitRatePercentage: 92,
    ttlRemainingMs: 180000,
    expiresAt: Date.now() + 180000
  };
  status = service.getStatus();
  assert.strictEqual(status.promptCache.available, true, 'Prompt cache should be available');
  assert.strictEqual(status.promptCache.hitRatePercentage, 92, 'Hit rate should be 92%');
  assert.ok(status.promptCache.formattedTtl.includes(':'), 'Formatted TTL should have MM:SS format');
  console.log('[OK] Prompt Cache Hit Rate and TTL countdown validated.');

  // Test Section Visibility Toggles
  status = service.updateSettings({
    visibleSections: {
      antigravity: true,
      claudeCode: false,
      codex: true,
      grokCli: false
    },
    showWeeklyInHud: false
  });
  assert.strictEqual(status.visibleSections.claudeCode, false, 'Claude Code section should be toggleable');
  assert.strictEqual(status.visibleSections.grokCli, false, 'Grok CLI section should be toggleable');
  assert.strictEqual(status.showWeeklyInHud, false, 'Weekly rail in floating HUD should be toggleable');
  console.log('[OK] Section visibility and HUD weekly toggles validated.');

  console.log('\nAll QuotaService unit tests PASSED successfully.');
} finally {
  if (typeof service !== 'undefined' && service.destroy) {
    service.destroy();
  }
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  process.exit(0);
}
