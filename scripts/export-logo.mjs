/**
 * One-off: generate MERITRA logo PNGs at multiple sizes from an SVG that mirrors
 * the favicon design (gold M on dark ink with a thin gold border, Georgia serif).
 *
 *   node scripts/export-logo.mjs
 *
 * Outputs land in ./logo-out/.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("logo-out");
await fs.mkdir(OUT, { recursive: true });

const BG = "#11100e";
const GOLD = "#b89b45";
const TXT = "#d8c38c";

// Build a vector SVG so it scales cleanly. Border width and font size scale
// with the canvas the same way the favicon does (border = size/32, font = size*18/32).
function svgFor(size) {
  const border = Math.max(1, Math.round(size / 32));
  const fontSize = Math.round(size * (18 / 32));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" fill="${BG}"/>
  <rect x="${border / 2}" y="${border / 2}" width="${size - border}" height="${size - border}"
        fill="none" stroke="${GOLD}" stroke-width="${border}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-weight="500"
        font-size="${fontSize}" fill="${TXT}">M</text>
</svg>`;
}

const sizes = [32, 64, 128, 256, 512, 1024, 2048];

// Save the master SVG too — usable directly in vector contexts.
await fs.writeFile(path.join(OUT, "meritra-logo.svg"), svgFor(512));

for (const size of sizes) {
  const svg = svgFor(size);
  const buf = await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const outPath = path.join(OUT, `meritra-logo-${size}.png`);
  await fs.writeFile(outPath, buf);
  console.log(`  ${size.toString().padStart(4)}px  ${buf.length.toString().padStart(7)} bytes  ${outPath}`);
}

console.log("\nDone. Files in:", OUT);
