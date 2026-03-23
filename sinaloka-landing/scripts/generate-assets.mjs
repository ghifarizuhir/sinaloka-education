/**
 * Generates OG image (1200x630) and favicon variants (PNG 32x32, 180x180)
 * using Playwright to render HTML templates and take screenshots.
 */

import { chromium } from "playwright";
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

const fontPath = resolve(publicDir, "fonts/plus-jakarta-sans-latin.woff2");
const fontBase64 = readFileSync(fontPath).toString("base64");

const faviconSvg = readFileSync(resolve(publicDir, "favicon.svg"), "utf-8");
const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(faviconSvg).toString("base64")}`;

async function generateOgImage(browser) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });

  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {
    font-family: "Plus Jakarta Sans";
    font-weight: 400 800;
    src: url("data:font/woff2;base64,${fontBase64}") format("woff2");
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    background: linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #14b8a6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  /* Dot pattern overlay */
  .dots {
    position: absolute; inset: 0;
    background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0);
    background-size: 28px 28px;
  }
  /* Content */
  .content {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 0 80px;
  }
  .logo-row {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 40px;
  }
  .logo-row img { width: 64px; height: 64px; }
  .logo-row span {
    font-size: 42px; font-weight: 800; color: white;
    letter-spacing: -0.02em;
  }
  h1 {
    font-size: 52px; font-weight: 800; color: white;
    line-height: 1.15; letter-spacing: -0.02em;
    margin-bottom: 20px;
  }
  h1 em {
    font-style: normal;
    color: #fbbf24;
  }
  p {
    font-size: 22px; color: rgba(255,255,255,0.8);
    line-height: 1.5; max-width: 700px;
  }
  .badge {
    margin-top: 32px;
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 100px;
    padding: 10px 24px;
    font-size: 16px; font-weight: 600; color: white;
  }
  /* Decorative shapes */
  .shape1 {
    position: absolute; top: -60px; right: -60px;
    width: 280px; height: 280px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .shape2 {
    position: absolute; bottom: -80px; left: -40px;
    width: 220px; height: 220px; border-radius: 50%;
    background: rgba(255,255,255,0.04);
  }
</style>
</head>
<body>
  <div class="dots"></div>
  <div class="shape1"></div>
  <div class="shape2"></div>
  <div class="content">
    <div class="logo-row">
      <img src="${logoDataUri}" alt="">
      <span>Sinaloka</span>
    </div>
    <h1>Platform Manajemen Bimbel<br><em>#1 di Indonesia</em></h1>
    <p>Kelola siswa, tutor, jadwal, dan pembayaran dari satu tempat.</p>
    <div class="badge">🎁 Gratis 2 bulan — tanpa kontrak</div>
  </div>
</body>
</html>`;

  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(200);

  const buffer = await page.screenshot({ type: "png" });
  writeFileSync(resolve(publicDir, "og-image.png"), buffer);
  console.log("Generated og-image.png (1200x630)");

  await page.close();
}

async function generateFavicons(browser) {
  // 32x32 favicon
  for (const [size, name] of [[32, "favicon-32x32.png"], [180, "apple-touch-icon.png"], [192, "icon-192x192.png"], [512, "icon-512x512.png"]]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: size, height: size });

    const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; }
  body { width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; background: transparent; }
  img { width: ${size}px; height: ${size}px; }
</style>
</head>
<body>
  <img src="${logoDataUri}" alt="">
</body>
</html>`;

    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(100);

    const buffer = await page.screenshot({ type: "png" });
    writeFileSync(resolve(publicDir, name), buffer);
    console.log(`Generated ${name} (${size}x${size})`);

    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  await generateOgImage(browser);
  await generateFavicons(browser);

  await browser.close();
}

main().catch((err) => {
  console.error("Asset generation failed:", err);
  process.exit(1);
});
