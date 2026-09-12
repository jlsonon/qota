const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// 1. Create scalable SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#141721"/>
      <stop offset="100%" stop-color="#08090d"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#00f0ff" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background Card -->
  <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#bgGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

  <!-- Orbital Rings (Antigravity theme) -->
  <circle cx="64" cy="64" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" stroke-dasharray="4 4"/>
  <circle cx="64" cy="64" r="30" fill="none" stroke="url(#glowGrad)" stroke-width="3" stroke-linecap="round" stroke-dasharray="140 50"/>

  <!-- Center Levitation Diamond / Spark -->
  <g filter="url(#shadow)">
    <path d="M64 34 L78 64 L64 94 L50 64 Z" fill="url(#glowGrad)"/>
    <circle cx="64" cy="64" r="5" fill="#ffffff"/>
  </g>

  <!-- Small Satellite nodes -->
  <circle cx="94" cy="50" r="3.5" fill="#00f0ff"/>
  <circle cx="34" cy="78" r="2.5" fill="#ec4899"/>
</svg>`;

fs.writeFileSync(path.join(ASSETS_DIR, 'icon.svg'), svgIcon, 'utf8');

// macOS Template Tray Icon (monochrome / alpha template)
const trayMacSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="22" height="22">
  <circle cx="11" cy="11" r="8" fill="none" stroke="#000000" stroke-width="2" stroke-dasharray="36 14"/>
  <path d="M11 5 L14.5 11 L11 17 L7.5 11 Z" fill="#000000"/>
  <circle cx="11" cy="11" r="1.5" fill="#ffffff"/>
</svg>`;
fs.writeFileSync(path.join(ASSETS_DIR, 'tray-template.svg'), trayMacSvg, 'utf8');

// Color Tray Icon for Windows / general
const trayColorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <circle cx="12" cy="12" r="9" fill="none" stroke="#00f0ff" stroke-width="2.2" stroke-dasharray="42 16"/>
  <path d="M12 5.5 L16 12 L12 18.5 L8 12 Z" fill="#8b5cf6"/>
  <circle cx="12" cy="12" r="2" fill="#ffffff"/>
</svg>`;
fs.writeFileSync(path.join(ASSETS_DIR, 'tray-color.svg'), trayColorSvg, 'utf8');

// Function to generate raw RGBA PNG file using zlib (no external dependencies required!)
function createPng(width, height, rgbaBuffer, outputPath) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // color type RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlineLength = width * 4 + 1;
  const rawScanlines = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    rawScanlines[y * scanlineLength] = 0; // Filter none
    rgbaBuffer.copy(
      rawScanlines,
      y * scanlineLength + 1,
      y * width * 4,
      (y + 1) * width * 4
    );
  }

  const compressedData = zlib.deflateSync(rawScanlines);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, png);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(12 + length);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crc = crc32(buffer.subarray(4, 8 + length));
  buffer.writeUInt32BE(crc, 8 + length);
  return buffer;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Generate 32x32 tray icon PNG
const traySize = 32;
const trayBuf = Buffer.alloc(traySize * traySize * 4);
const center = traySize / 2;
const radius = 12;

for (let y = 0; y < traySize; y++) {
  for (let x = 0; x < traySize; x++) {
    const idx = (y * traySize + x) * 4;
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ring
    if (dist >= radius - 2 && dist <= radius + 1) {
      trayBuf[idx] = 0;     // R
      trayBuf[idx + 1] = 240; // G
      trayBuf[idx + 2] = 255; // B
      trayBuf[idx + 3] = 255; // A
    } else if (Math.abs(dx) + Math.abs(dy) <= 6) {
      // Center diamond
      trayBuf[idx] = 139;   // R
      trayBuf[idx + 1] = 92;  // G
      trayBuf[idx + 2] = 246; // B
      trayBuf[idx + 3] = 255; // A
    } else {
      trayBuf[idx + 3] = 0; // transparent
    }
  }
}
createPng(traySize, traySize, trayBuf, path.join(ASSETS_DIR, 'tray-icon.png'));

// Generate 128x128 app icon PNG
const appSize = 128;
const appBuf = Buffer.alloc(appSize * appSize * 4);
const appCenter = appSize / 2;

for (let y = 0; y < appSize; y++) {
  for (let x = 0; x < appSize; x++) {
    const idx = (y * appSize + x) * 4;
    const dx = x - appCenter;
    const dy = y - appCenter;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Rounded app background
    const cornerRadius = 26;
    const inBox = Math.abs(dx) <= 56 && Math.abs(dy) <= 56;
    const inCorner = Math.abs(dx) > 56 - cornerRadius && Math.abs(dy) > 56 - cornerRadius;
    const cornerDist = Math.sqrt(Math.pow(Math.abs(dx) - (56 - cornerRadius), 2) + Math.pow(Math.abs(dy) - (56 - cornerRadius), 2));

    if (inBox && (!inCorner || cornerDist <= cornerRadius)) {
      // Background gradient
      appBuf[idx] = 16 + Math.round((y / appSize) * 8);
      appBuf[idx + 1] = 18 + Math.round((y / appSize) * 8);
      appBuf[idx + 2] = 28 + Math.round((y / appSize) * 12);
      appBuf[idx + 3] = 255;

      // Glow circle
      if (dist >= 32 && dist <= 38) {
        appBuf[idx] = 0;
        appBuf[idx + 1] = 240;
        appBuf[idx + 2] = 255;
        appBuf[idx + 3] = 255;
      }

      // Diamond center
      if (Math.abs(dx) + Math.abs(dy) <= 18) {
        appBuf[idx] = 139;
        appBuf[idx + 1] = 92;
        appBuf[idx + 2] = 246;
        appBuf[idx + 3] = 255;
      }
      if (dist <= 4) {
        appBuf[idx] = 255;
        appBuf[idx + 1] = 255;
        appBuf[idx + 2] = 255;
        appBuf[idx + 3] = 255;
      }
    } else {
      appBuf[idx + 3] = 0;
    }
  }
}
createPng(appSize, appSize, appBuf, path.join(ASSETS_DIR, 'icon.png'));

console.log('[OK] Generated icon.svg, tray-template.svg, tray-color.svg, tray-icon.png, and icon.png in assets/');
