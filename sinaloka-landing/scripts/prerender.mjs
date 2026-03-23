/**
 * Post-build pre-rendering script for SEO.
 *
 * Serves the built dist/ directory, uses Playwright to render the landing page,
 * and overwrites dist/index.html with the fully rendered HTML.
 * This makes the page content visible to crawlers that don't execute JavaScript.
 *
 * Only pre-renders "/" — the /register/:slug route stays CSR (dynamic, not SEO-relevant).
 */

import { preview } from "vite";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");

async function prerender() {
  // Start Vite preview server
  const server = await preview({
    preview: { port: 4173, strictPort: true },
    build: { outDir: "dist" },
  });

  const url = "http://localhost:4173/";

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate and wait for React to fully render
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("main", { timeout: 10000 });

    // Small delay to ensure animations/transitions settle
    await page.waitForTimeout(500);

    // Get the rendered HTML
    const html = await page.content();

    // Write pre-rendered HTML to dist/index.html
    const outputPath = resolve(distDir, "index.html");
    writeFileSync(outputPath, html, "utf-8");

    console.log("Pre-rendered / → dist/index.html");

    await browser.close();
  } finally {
    server.httpServer.close();
  }
}

prerender().catch((err) => {
  console.error("Pre-rendering failed:", err);
  process.exit(1);
});
