/**
 * Post-build pre-rendering script for SEO.
 *
 * Serves the built dist/ directory, uses Playwright to render each route,
 * and writes the fully rendered HTML to the appropriate location.
 * This makes page content visible to crawlers that don't execute JavaScript.
 *
 * Pre-renders: /, /privacy, /terms
 */

import { preview } from "vite";
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");

const routes = [
  { path: "/", output: "index.html" },
  { path: "/privacy", output: "privacy/index.html" },
  { path: "/terms", output: "terms/index.html" },
];

async function prerender() {
  // Start Vite preview server
  const server = await preview({
    preview: { port: 4173, strictPort: true },
    build: { outDir: "dist" },
  });

  const baseUrl = "http://localhost:4173";

  try {
    const browser = await chromium.launch({ headless: true });

    for (const route of routes) {
      const page = await browser.newPage();

      // Navigate and wait for React to fully render
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle" });
      await page.waitForSelector("h1", { timeout: 10000 });

      // Small delay to ensure animations/transitions settle
      await page.waitForTimeout(500);

      // Get the rendered HTML
      const html = await page.content();

      // Ensure output directory exists
      const outputPath = resolve(distDir, route.output);
      mkdirSync(dirname(outputPath), { recursive: true });

      // Write pre-rendered HTML
      writeFileSync(outputPath, html, "utf-8");
      console.log(`Pre-rendered ${route.path} → dist/${route.output}`);

      await page.close();
    }

    await browser.close();
  } finally {
    server.httpServer.close();
  }
}

prerender().catch((err) => {
  console.error("Pre-rendering failed:", err);
  process.exit(1);
});
