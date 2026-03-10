/**
 * Apex — Icon & iOS Splash Screen Generator
 * Generates all required PNG assets from the Apex SVG logo.
 * Run: node scripts/generate-assets.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// ── The Apex logo SVG (1024×1024 canvas) ──────────────────────
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="200" fill="#08080F"/>
  <defs>
    <linearGradient id="g" x1="30%" y1="90%" x2="70%" y2="0%">
      <stop offset="0%" stop-color="#0A84FF"/>
      <stop offset="100%" stop-color="#5E5CE6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="48%" r="40%">
      <stop offset="0%" stop-color="rgba(10,132,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(10,132,255,0)"/>
    </radialGradient>
  </defs>
  <ellipse cx="512" cy="560" rx="380" ry="260" fill="url(#glow)"/>
  <path d="M512 175 L860 775 H676 L512 450 L348 775 H164 Z" fill="url(#g)"/>
</svg>`;

// ── Splash screen: dark bg + centred Apex logo ─────────────────
function splashSvg(w, h, logoSize = 200) {
  const cx = w / 2;
  const cy = h / 2;
  const half = logoSize / 2;
  const r = logoSize * 0.195; // corner radius proportional to logo size
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#060608"/>
  <defs>
    <linearGradient id="g" x1="30%" y1="90%" x2="70%" y2="0%">
      <stop offset="0%" stop-color="#0A84FF"/>
      <stop offset="100%" stop-color="#5E5CE6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="48%" r="40%">
      <stop offset="0%" stop-color="rgba(10,132,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(10,132,255,0)"/>
    </radialGradient>
  </defs>
  <!-- logo background tile -->
  <rect x="${cx - half}" y="${cy - half}" width="${logoSize}" height="${logoSize}" rx="${r}" fill="#08080F"/>
  <!-- glow -->
  <ellipse cx="${cx}" cy="${cy + logoSize * 0.047}" rx="${logoSize * 0.37}" ry="${logoSize * 0.254}" fill="url(#glow)"/>
  <!-- A peak -->
  <path d="M${cx} ${cy - half * 0.83}
           L${cx + half * 0.83} ${cy + half * 0.75}
           H${cx + half * 0.45}
           L${cx} ${cy - half * 0.105}
           L${cx - half * 0.45} ${cy + half * 0.75}
           H${cx - half * 0.83} Z" fill="url(#g)"/>
</svg>`;
}

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function svgToPng(svgString, outputPath, width, height) {
  await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toFile(outputPath);
  console.log(`  ✓ ${path.relative(root, outputPath)} (${width}×${height})`);
}

async function main() {
  // ── App icons ────────────────────────────────────────────────
  console.log('\n📱 Generating app icons...');
  const iconsDir = path.join(root, 'public', 'icons');
  await ensureDir(iconsDir);

  await svgToPng(logoSvg, path.join(iconsDir, 'icon-192.png'), 192, 192);
  await svgToPng(logoSvg, path.join(iconsDir, 'icon-512.png'), 512, 512);
  await svgToPng(logoSvg, path.join(iconsDir, 'apple-touch-icon.png'), 180, 180);

  // ── iOS Splash Screens ───────────────────────────────────────
  // Sizes: https://developer.apple.com/design/human-interface-guidelines/layout
  console.log('\n🍎 Generating iOS splash screens...');
  const splashDir = path.join(root, 'public', 'splash');
  await ensureDir(splashDir);

  const splashes = [
    // iPhone SE (3rd gen) 375×667 @2x
    { w: 750,  h: 1334, name: 'splash-750x1334.png',   logo: 160 },
    // iPhone 14 / 13 / 12  390×844 @3x
    { w: 1170, h: 2532, name: 'splash-1170x2532.png',  logo: 220 },
    // iPhone 14 Plus / 13 Pro Max  428×926 @3x
    { w: 1284, h: 2778, name: 'splash-1284x2778.png',  logo: 240 },
    // iPhone 15 / 14 Pro  393×852 @3x
    { w: 1179, h: 2556, name: 'splash-1179x2556.png',  logo: 220 },
    // iPhone 15 Pro Max / 14 Pro Max  430×932 @3x
    { w: 1290, h: 2796, name: 'splash-1290x2796.png',  logo: 240 },
    // iPad (10th gen) 820×1180 @2x
    { w: 1640, h: 2360, name: 'splash-1640x2360.png',  logo: 280 },
    // iPad Pro 11" 834×1194 @2x
    { w: 1668, h: 2388, name: 'splash-1668x2388.png',  logo: 280 },
    // iPad Pro 12.9" 1024×1366 @2x
    { w: 2048, h: 2732, name: 'splash-2048x2732.png',  logo: 320 },
  ];

  for (const { w, h, name, logo } of splashes) {
    await svgToPng(splashSvg(w, h, logo), path.join(splashDir, name), w, h);
  }

  console.log('\n✅ All assets generated successfully!\n');
}

main().catch(err => { console.error(err); process.exit(1); });
