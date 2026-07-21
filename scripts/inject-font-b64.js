import fs from 'fs';
import path from 'path';

const fontPath = path.join(process.cwd(), 'netlify', 'functions', 'fonts', 'inter-800.ttf');
const fontB64 = fs.readFileSync(fontPath).toString('base64');
const ogPath = path.join(process.cwd(), 'netlify', 'functions', 'og-image.js');

let src = fs.readFileSync(ogPath, 'utf8');

src = src.replace(
  "const INTER_FONT_B64 = '';",
  `const INTER_FONT_B64 = '${fontB64}';`
);

fs.writeFileSync(ogPath, src);
console.log('✅ Base64 font string safely injected! New size:', (src.length / 1024).toFixed(1), 'KB');
