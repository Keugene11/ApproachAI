import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Build an SVG with a custom geometric W drawn as a single stroked path.
// Maskable variants leave more padding so Android's adaptive icon crop
// doesn't clip the mark.
function createSvg(size, maskable = false) {
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const pad = maskable ? 0.30 : 0.18;
  const strokeWidth = Math.round(size * (maskable ? 0.11 : 0.14));

  const span = 1 - 2 * pad;
  const x1 = size * pad;                       // top-left start
  const x2 = size * (pad + span * 0.25);       // bottom-left peak
  const x3 = size * 0.5;                       // middle top
  const x4 = size * (pad + span * 0.75);       // bottom-right peak
  const x5 = size * (1 - pad);                 // top-right end

  const yTop = size * (pad + 0.08);
  const yBottom = size * (1 - pad - 0.08);
  // Middle peak rises 45% of the way back up from the V-bottoms toward the
  // top. Tuned to look proportional at both big and small sizes.
  const yMid = yTop + (yBottom - yTop) * 0.45;

  const d = `M ${x1} ${yTop} L ${x2} ${yBottom} L ${x3} ${yMid} L ${x4} ${yBottom} L ${x5} ${yTop}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1a1a1a" rx="${radius}"/>
  <path d="${d}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
}

const variants = [
  { name: "icon-192", size: 192, maskable: false },
  { name: "icon-512", size: 512, maskable: false },
  { name: "icon-maskable-192", size: 192, maskable: true },
  { name: "icon-maskable-512", size: 512, maskable: true },
];

for (const v of variants) {
  const svg = createSvg(v.size, v.maskable);
  writeFileSync(`public/icons/${v.name}.svg`, svg);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icons/${v.name}.png`);
  console.log(`Generated ${v.name}.svg and ${v.name}.png`);
}

console.log("Done — all icons generated.");
