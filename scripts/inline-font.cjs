#!/usr/bin/env node
// Inlines the Inter 800 TTF font as base64 constant into og-image.js and preview-og.cjs
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ttfPath = path.join(root, 'netlify/functions/fonts/inter-800.ttf');
const targetOgPath = path.join(root, 'netlify/functions/og-image.js');
const targetPreviewPath = path.join(root, 'preview-og.cjs');

const ttfBuffer = fs.readFileSync(ttfPath);
const ttfB64 = ttfBuffer.toString('base64');
console.log('TTF file size:', (ttfBuffer.length / 1024).toFixed(1), 'KB (base64:', (ttfB64.length / 1024).toFixed(1), 'KB)');

// Update og-image.js
let ogSrc = fs.readFileSync(targetOgPath, 'utf8');

const newOgHeader = `// Inter 800 TTF font embedded as base64 (TrueType format for Sharp/librsvg compatibility)
const INTER_800_TTF_B64 = '${ttfB64}';
function getInterFontBase64() { return INTER_800_TTF_B64; }`;

// Replace top section up to function escapeXml
ogSrc = ogSrc.replace(/^[\s\S]*?function escapeXml/m, newOgHeader + '\n\nfunction escapeXml');

// Update src: url in ogSrc
ogSrc = ogSrc.replace(
  /src: url\(['"].*?['"]\).*?;/g,
  "src: url('data:font/ttf;charset=utf-8;base64,${fontBase64}') format('truetype');"
);

fs.writeFileSync(targetOgPath, ogSrc);
console.log('✅ og-image.js updated, size:', (ogSrc.length / 1024).toFixed(1), 'KB');
