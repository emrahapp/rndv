/**
 * Render the Bossaat logo (green circle + black checkmark, link.com style)
 * to a transparent-background PNG at multiple sizes.
 *
 * Run with: node scripts/render-logo.mjs
 */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "logo");
mkdirSync(outDir, { recursive: true });

// The exact same shape as src/app/icon.tsx — viewBox 0 0 24 24 checkmark
// (polyline 6 11 → 10 15 → 18 7) drawn at 64% of canvas inside a #00d66f
// circle, transparent outside the circle.
function buildSvg(size) {
  const checkSize = size * 0.64;
  const checkOffset = (size - checkSize) / 2;
  const scale = checkSize / 24;
  const strokeWidth = 3 * scale; // matches strokeWidth=3 in icon.tsx

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#00d66f"/>
  <g transform="translate(${checkOffset} ${checkOffset}) scale(${scale})">
    <polyline points="6 11 10 15 18 7"
      fill="none"
      stroke="#0a0a0a"
      stroke-width="${3}"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
      style="stroke-width:${strokeWidth}px"/>
  </g>
</svg>`;
}

const SIZES = [256, 512, 1024];

for (const size of SIZES) {
  const svg = buildSvg(size);
  const outPath = join(outDir, `bossaat-logo-${size}.png`);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ wrote ${outPath} (${size}x${size})`);
}

// Also drop the master SVG for designers who want to scale infinitely.
writeFileSync(join(outDir, "bossaat-logo.svg"), buildSvg(512));
console.log(`✓ wrote ${join(outDir, "bossaat-logo.svg")}`);
