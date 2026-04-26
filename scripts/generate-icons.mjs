import sharp from "sharp";
import { mkdirSync, writeFileSync, existsSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Simple text-based W on a dark rounded background.
// - maskable/transparent variants shrink the glyph so Android's adaptive
//   icon crop doesn't clip it.
// - transparent variants skip the background fill entirely — used for
//   Android's adaptive icon foreground layer.
function createSvg(size, { maskable = false, transparent = false } = {}) {
  const loose = maskable || transparent;
  const radius = loose ? 0 : Math.round(size * 0.18);
  const fontSize = Math.round(size * (loose ? 0.38 : 0.42));

  const bg = transparent
    ? ""
    : `<rect width="${size}" height="${size}" fill="#1a1a1a" rx="${radius}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  <text x="${size / 2}" y="${size / 2}" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">W</text>
</svg>`;
}

// ===== PWA icons =====
const pwaVariants = [
  { name: "icon-192", size: 192, maskable: false },
  { name: "icon-512", size: 512, maskable: false },
  { name: "icon-maskable-192", size: 192, maskable: true },
  { name: "icon-maskable-512", size: 512, maskable: true },
];

for (const v of pwaVariants) {
  const svg = createSvg(v.size, { maskable: v.maskable });
  writeFileSync(`public/icons/${v.name}.svg`, svg);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icons/${v.name}.png`);
  console.log(`Generated public/icons/${v.name}.{svg,png}`);
}

// ===== Android launcher icons =====
// These get baked into the APK at build time — the WebView-hosted JS code
// auto-updates on wingmate.live, but the launcher icon on the home screen
// only changes after a reinstall.
if (existsSync("android/app/src/main/res")) {
  const densities = [
    { dir: "mdpi", legacy: 48, foreground: 108 },
    { dir: "hdpi", legacy: 72, foreground: 162 },
    { dir: "xhdpi", legacy: 96, foreground: 216 },
    { dir: "xxhdpi", legacy: 144, foreground: 324 },
    { dir: "xxxhdpi", legacy: 192, foreground: 432 },
  ];

  for (const d of densities) {
    const resDir = `android/app/src/main/res/mipmap-${d.dir}`;
    mkdirSync(resDir, { recursive: true });

    // Legacy square icon (pre-adaptive devices + fallback).
    const legacySvg = createSvg(d.legacy, { maskable: false });
    await sharp(Buffer.from(legacySvg)).png().toFile(`${resDir}/ic_launcher.png`);
    await sharp(Buffer.from(legacySvg)).png().toFile(`${resDir}/ic_launcher_round.png`);

    // Adaptive foreground: transparent bg, W with extra padding so the
    // parallax crop zone doesn't eat into the mark. The background color
    // comes from the ic_launcher_background color resource.
    const fgSvg = createSvg(d.foreground, { transparent: true });
    await sharp(Buffer.from(fgSvg)).png().toFile(`${resDir}/ic_launcher_foreground.png`);

    console.log(`Generated mipmap-${d.dir} launcher icons`);
  }
}

console.log("Done.");
