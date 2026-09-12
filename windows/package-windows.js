const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(__dirname, 'Qota-Windows-Portable');

console.log('==> Assembling Qota Windows Portable Distribution at:', outDir);

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy core files
const files = ['main.js', 'preload.js', 'package.json'];
for (const f of files) {
  fs.copyFileSync(path.join(rootDir, f), path.join(outDir, f));
}

// Copy directories
copyRecursive(path.join(rootDir, 'src'), path.join(outDir, 'src'));
copyRecursive(path.join(rootDir, 'assets'), path.join(outDir, 'assets'));

// Copy Windows scripts
fs.copyFileSync(path.join(__dirname, 'launch-qota.vbs'), path.join(outDir, 'launch-qota.vbs'));
fs.copyFileSync(path.join(__dirname, 'run-portable.bat'), path.join(outDir, 'run-portable.bat'));
fs.copyFileSync(path.join(__dirname, 'install.bat'), path.join(outDir, 'install.bat'));
fs.copyFileSync(path.join(__dirname, 'install.ps1'), path.join(outDir, 'install.ps1'));

console.log('==> Successfully assembled Qota-Windows-Portable.');
