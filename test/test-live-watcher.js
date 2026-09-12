const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { QuotaService } = require('../src/quota-service');

console.log('Testing Antigravity Live Transcript Watcher...');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-live-test-'));
const testDbPath = path.join(tempDir, 'state.json');

// Mock Antigravity brain directory structure
const conversationId = 'test-convo-123';
const brainDir = path.join(tempDir, 'brain');
const convoDir = path.join(brainDir, conversationId, '.system_generated', 'logs');
fs.mkdirSync(convoDir, { recursive: true });

const transcriptPath = path.join(convoDir, 'transcript.jsonl');
fs.writeFileSync(transcriptPath, ''); // start empty

let service;
try {
  service = new QuotaService(testDbPath);
  
  // Point watcher to test directory
  service.updateSettings({
    antigravityDir: tempDir,
    autoDetectAntigravity: true
  });

  const initialStatus = service.getStatus();
  assert.strictEqual(initialStatus.sprint.remaining, 250, 'Sprint starts at 250');
  console.log('[OK] Initialized with mock Antigravity directory');

  // Simulate Antigravity writing a USER_INPUT event
  const userEvent = JSON.stringify({
    step_index: 1,
    type: 'USER_INPUT',
    source: 'USER_EXPLICIT',
    created_at: new Date().toISOString(),
    content: 'Review my codebase'
  }) + '\n';

  fs.appendFileSync(transcriptPath, userEvent);

  // Trigger delta read directly
  service.processTranscriptDelta(transcriptPath);

  let updatedStatus = service.getStatus();
  assert.strictEqual(updatedStatus.sprint.remaining, 249, 'User input should consume 1 unit');
  console.log('[OK] Live USER_INPUT event detected and deducted.');

  // Set active model to Claude Sonnet (4x)
  service.setActiveModel('claude-sonnet-4.6');

  // Simulate Antigravity writing a PLANNER_RESPONSE event with 2 tool calls
  const agentEvent = JSON.stringify({
    step_index: 2,
    type: 'PLANNER_RESPONSE',
    source: 'MODEL',
    created_at: new Date().toISOString(),
    content: 'Using Claude Sonnet 4.6',
    tool_calls: [
      { name: 'view_file' },
      { name: 'run_command' }
    ]
  }) + '\n';

  fs.appendFileSync(transcriptPath, agentEvent);
  service.processTranscriptDelta(transcriptPath);

  updatedStatus = service.getStatus();
  // Claude Sonnet is 4x multiplier. Base units = 1 (response) + 2 (tool calls) = 3 units.
  // Total cost = 3 * 4 = 12 units.
  // 249 - 12 = 237.
  assert.strictEqual(updatedStatus.sprint.remaining, 237, 'Sonnet response with 2 tool calls should deduct 12 units');
  console.log('[OK] Live PLANNER_RESPONSE with Claude Sonnet multiplier and tool calls detected and deducted.');

  console.log('\nAll Live Watcher tests PASSED successfully.');
} finally {
  service.destroy();
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(0);
}
