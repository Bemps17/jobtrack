/**
 * Génère favicon.ico, icônes Next (app/) et variantes PNG (public/icons/)
 * à partir de public/icons/job1.png — lancer : npm run icons:generate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public/icons/job1.png");
const outPublic = path.join(root, "public/icons");
const appDir = path.join(root, "src/app");

if (!fs.existsSync(src)) {
  console.error("Source manquante :", src);
  process.exit(1);
}

async function main() {
  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((s) =>
      sharp(src).resize(s, s, { fit: "cover" }).png().toBuffer()
    )
  );
  const ico = await toIco(icoBuffers);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);

  /** Icônes reconnues par Next.js (metadata automatique). */
  await sharp(src)
    .resize(32, 32, { fit: "cover" })
    .png()
    .toFile(path.join(appDir, "icon.png"));
  await sharp(src)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(path.join(appDir, "apple-icon.png"));

  /** Variantes nommées pour manifeste / liens explicites. */
  const variants = [
    ["job1-16.png", 16],
    ["job1-32.png", 32],
    ["job1-48.png", 48],
    ["job1-180.png", 180],
    ["job1-192.png", 192],
    ["job1-256.png", 256],
    ["job1-512.png", 512],
  ];
  for (const [name, size] of variants) {
    await sharp(src)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(outPublic, name));
  }

  console.log("OK — favicon.ico, icon.png, apple-icon.png, variantes PNG générés depuis job1.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
