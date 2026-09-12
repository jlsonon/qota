const { spawn } = require('child_process');
const path = require('path');

console.log('Running Electron smoke test...');

const electronBinary = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');
const mainPath = path.join(__dirname, '..', 'main.js');

// Run electron with --smoke-test flag
const env = Object.assign({}, process.env, { ELECTRON_SMOKE_TEST: 'true' });
const child = spawn(electronBinary, [mainPath], { env, stdio: 'inherit' });

const timeout = setTimeout(() => {
  console.log('Electron process stayed alive as expected. Terminating test cleanly.');
  child.kill('SIGINT');
  process.exit(0);
}, 3000);

child.on('error', (err) => {
  console.error('Smoke test process error:', err);
  clearTimeout(timeout);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearTimeout(timeout);
  console.log(`Electron exited with code ${code}, signal ${signal}`);
  if (code === 0 || signal === 'SIGINT') {
    process.exit(0);
  } else {
    process.exit(code || 1);
  }
});
