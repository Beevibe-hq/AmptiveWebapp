#!/usr/bin/env node
// Inlines the Inter 800 font as a base64 constant into og-image.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fontPath = path.join(root, 'netlify/functions/fonts/inter-800.woff2');
const targetPath = path.join(root, 'netlify/functions/og-image.js');

const b64 = fs.readFileSync(fontPath).toString('base64');
let src = fs.readFileSync(targetPath, 'utf8');

// Replace the empty constant with the real base64 data
src = src.replace(
  "const INTER_800_B64 = '';",
  `const INTER_800_B64 = '${b64}';`
);

fs.writeFileSync(targetPath, src);
console.log('✅ Font inlined. og-image.js is now', (src.length / 1024).toFixed(1), 'KB');
