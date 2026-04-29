/**
 * Rasterize brand shield (fixed dark bg) for Google Search favicon requirements
 * (square >=48px, classic .ico).
 *
 * Dev deps (install before running): `pnpm add -D sharp to-ico`
 * Then: `pnpm gen:favicon`
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const toIco = require("to-ico");

const SVG = `<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect fill="#0a0a0a" width="180" height="180" rx="32"/>
  <path stroke="#ffffff" fill="none" stroke-width="5" d="M90 28L142 53V95C142 123 120 147 90 156C60 147 38 123 38 95V53Z"/>
  <path stroke="#ffffff" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" d="M58 70H86L58 106H86"/>
  <path stroke="#ffffff" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" d="M98 70V106M98 88L116 70M98 88L116 106"/>
</svg>`;

async function main() {
  const root = path.join(__dirname, "..");
  const buf = Buffer.from(SVG);

  const png16 = await sharp(buf).resize(16, 16).png().toBuffer();
  const png32 = await sharp(buf).resize(32, 32).png().toBuffer();
  const png48 = await sharp(buf).resize(48, 48).png().toBuffer();
  const icoBuf = await toIco([png16, png32, png48]);

  fs.writeFileSync(path.join(root, "app", "favicon.ico"), icoBuf);
  fs.writeFileSync(
    path.join(root, "public", "apple-touch-icon.png"),
    await sharp(buf).resize(180, 180).png().toBuffer(),
  );

  console.log("Wrote app/favicon.ico, public/apple-touch-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
