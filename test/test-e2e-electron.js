const { spawn } = require('child_process');
const path = require('path');

console.log('Running Electron E2E Renderer & DOM Verification test...');

const electronBinary = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');
const mainPath = path.join(__dirname, '..', 'main.js');

const env = Object.assign({}, process.env, { ELECTRON_E2E_TEST: 'true' });
const child = spawn(electronBinary, [mainPath], { env, stdio: ['inherit', 'pipe', 'pipe'] });

let output = '';
child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  output += text;
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  output += text;
});

const timeout = setTimeout(() => {
  console.error('[FAIL] E2E test timed out after 10s');
  child.kill('SIGINT');
  process.exit(1);
}, 10000);

child.on('exit', (code, signal) => {
  clearTimeout(timeout);
  if (code === 0 && output.includes('ALL E2E DOM & IPC CHECKS PASSED')) {
    console.log('\n[PASSED] End-to-End Test completed successfully.');
    process.exit(0);
  } else {
    console.error(`\n[FAIL] E2E test exited with code: ${code}, signal: ${signal}`);
    process.exit(code || 1);
  }
});
