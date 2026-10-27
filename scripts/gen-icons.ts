// Generates the PWA icons from one SVG. Run: npm run gen:icons
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.join(process.cwd(), "public", "icons");
mkdirSync(out, { recursive: true });

const green = "#1f6a43";
const cream = "#fbf8f1";

// lens + leaf; `pad` shrinks the art so maskable icons survive the circle crop
const svg = (pad: number, round: boolean) => {
  const s = 512;
  const k = (s - pad * 2) / 48;
  const g = `translate(${pad} ${pad}) scale(${k})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${round ? 112 : 0}" fill="${green}"/>
  <g transform="${g}">
    <circle cx="22" cy="22" r="11" fill="none" stroke="${cream}" stroke-width="3.5"/>
    <path d="M30 30l8 8" stroke="${cream}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M17 26c0-6 4-10 10-10 0 6-4 10-10 10z" fill="${cream}"/>
  </g>
</svg>`;
};

async function main() {
  const any = svg(40, true);
  const mask = svg(96, false);
  writeFileSync(path.join(out, "icon.svg"), any);
  writeFileSync(path.join(out, "maskable.svg"), mask);
  const jobs: [string, string, number][] = [
    ["icon-192.png", any, 192],
    ["icon-512.png", any, 512],
    ["maskable-192.png", mask, 192],
    ["maskable-512.png", mask, 512],
    ["apple-touch-icon.png", svg(56, false), 180],
  ];
  for (const [name, src, size] of jobs) {
    await sharp(Buffer.from(src)).resize(size, size).png().toFile(path.join(out, name));
    console.log("wrote", name);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
