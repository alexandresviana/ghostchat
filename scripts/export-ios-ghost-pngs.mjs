/**
 * PNGs para `Logo.imageset` e `AppIcon.appiconset`:
 * - Logo (in-app): `public/ghost-logo.svg` → PNG com alpha (sem quadrado de fundo).
 * - App Icon: `scripts/ghost-reference.png` se existir, senão fallback SVG composto.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refPath = path.join(__dirname, "ghost-reference.png");
const fallbackSvgPath = path.join(__dirname, "ghost-avatar-ios.svg");
/** SVG quadrado 120×120; fundo transparente no catálogo iOS. */
const logoSvgPath = path.join(__dirname, "..", "public", "ghost-logo.svg");

const ASSETS = path.join(__dirname, "..", "ios", "GhostChatIOS", "Assets.xcassets");
const logoDir = path.join(ASSETS, "Logo.imageset");
const appIconDir = path.join(ASSETS, "AppIcon.appiconset");

/** Alinha com GhostTheme.background (#0d0d1a) — igual ao tema iOS/Web. */
const THEME_BG = { r: 13, g: 13, b: 26, alpha: 1 };

async function logoPng(px) {
  const svgSource = fs.existsSync(logoSvgPath) ? logoSvgPath : fallbackSvgPath;
  const svgBuffer = fs.readFileSync(svgSource);
  return sharp(svgBuffer)
    .resize(px, px, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildMasterIcon1024() {
  if (fs.existsSync(refPath)) {
    const inner = await sharp(refPath)
      .resize(880, 880, {
        fit: "contain",
        background: THEME_BG,
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();
    return sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: THEME_BG,
      },
    })
      .composite([{ input: inner, gravity: "centre" }])
      .png()
      .toBuffer();
  }

  const iconSvg =
    fs.existsSync(fallbackSvgPath) ? fallbackSvgPath : logoSvgPath;
  const svgBuffer = fs.readFileSync(iconSvg);
  const ghostLayer = await sharp(svgBuffer)
    .resize(700, 700, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: THEME_BG,
    },
  })
    .composite([{ input: ghostLayer, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function main() {
  const logoSrc = fs.existsSync(logoSvgPath) ? "public/ghost-logo.svg" : "scripts/ghost-avatar-ios.svg";
  const iconSrc = fs.existsSync(refPath)
    ? "scripts/ghost-reference.png"
    : fs.existsSync(fallbackSvgPath)
      ? "scripts/ghost-avatar-ios.svg"
      : "public/ghost-logo.svg";
  console.log("logo source:", logoSrc, "| app icon source:", iconSrc);

  for (const [name, px] of [
    ["logo-120.png", 120],
    ["logo-240.png", 240],
    ["logo-360.png", 360],
  ]) {
    const buf = await logoPng(px);
    await fs.promises.writeFile(path.join(logoDir, name), buf);
    console.log("wrote Logo.imageset/" + name);
  }

  const icon1024 = await buildMasterIcon1024();
  await fs.promises.writeFile(path.join(appIconDir, "AppIcon-1024.png"), icon1024);
  console.log("wrote AppIcon.appiconset/AppIcon-1024.png");

  const from1024 = [
    ["iphone-notification-20@2x.png", 40],
    ["iphone-notification-20@3x.png", 60],
    ["iphone-settings-29@2x.png", 58],
    ["iphone-settings-29@3x.png", 87],
    ["iphone-spotlight-40@2x.png", 80],
    ["iphone-spotlight-40@3x.png", 120],
    ["iphone-app-60@2x.png", 120],
    ["iphone-app-60@3x.png", 180],
    ["ipad-notification-20.png", 20],
    ["ipad-notification-20@2x.png", 40],
    ["ipad-settings-29.png", 29],
    ["ipad-settings-29@2x.png", 58],
    ["ipad-spotlight-40.png", 40],
    ["ipad-spotlight-40@2x.png", 80],
    ["ipad-app-76.png", 76],
    ["ipad-app-76@2x.png", 152],
    ["ipad-pro-app-83.5@2x.png", 167],
  ];

  for (const [filename, dim] of from1024) {
    await sharp(icon1024).resize(dim, dim).png().toFile(path.join(appIconDir, filename));
    console.log("wrote AppIcon.appiconset/" + filename);
  }

  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
