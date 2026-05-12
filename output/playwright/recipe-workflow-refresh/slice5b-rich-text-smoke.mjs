import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("output/playwright/recipe-workflow-refresh");
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function login(page) {
  await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle" });
  await page.fill("#username_or_email", "alice");
  await page.fill("#password", "Password123!");
  await Promise.all([
    page.waitForURL("**/", { timeout: 10000 }).catch(() => page.waitForLoadState("networkidle")),
    page.click("#login-page-submit"),
  ]);
}

async function smoke(viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await login(page);
  await page.goto("http://127.0.0.1:3000/recipes/add", { waitUntil: "networkidle" });
  if (await page.locator("#add-recipe-manual-choice").count()) {
    await page.click("#add-recipe-manual-choice");
  }

  await page.waitForSelector("#add-recipe-details-description-rich-text-source-tab", { timeout: 10000 });
  await page.fill(
    "#add-recipe-details-description-input",
    "## Sauce notes\n\nUse [bad](javascript:alert(1)) and **fresh herbs**.",
  );
  await page.click("#add-recipe-details-description-rich-text-preview-tab");
  await page.waitForSelector("#add-recipe-details-description-rich-text-preview-panel", { timeout: 10000 });
  const addPreviewText = await page.locator("#add-recipe-details-description-rich-text-preview-panel").innerText();
  if (!addPreviewText.includes("Sauce notes") || !addPreviewText.includes("fresh herbs")) {
    throw new Error(`Add Recipe preview missing expected text at ${label}: ${addPreviewText}`);
  }
  if (addPreviewText.includes("javascript:")) {
    throw new Error(`Add Recipe preview exposed unsafe URL at ${label}`);
  }

  await page.fill("#add-recipe-details-steps-input", "- Prep onions\n- Simmer sauce");
  await page.click("#add-recipe-details-steps-rich-text-preview-tab");
  await page.waitForSelector("#add-recipe-details-steps-rich-text-preview-content", { timeout: 10000 });
  await page.screenshot({ path: path.join(outputDir, `slice5b-add-rich-text-${label}.png`), fullPage: true });

  await page.goto("http://127.0.0.1:3000/recipes/42/edit", { waitUntil: "networkidle" });
  await page.waitForSelector("#edit-recipe-description-rich-text-source-tab", { timeout: 10000 });
  await page.fill("#edit-recipe-description-input", "## Edit preview\n\nKeep **family notes** visible.");
  await page.click("#edit-recipe-description-rich-text-preview-tab");
  await page.waitForSelector("#edit-recipe-description-rich-text-preview-content", { timeout: 10000 });
  const editPreviewText = await page.locator("#edit-recipe-description-rich-text-preview-panel").innerText();
  if (!editPreviewText.includes("Edit preview") || !editPreviewText.includes("family notes")) {
    throw new Error(`Edit preview missing expected text at ${label}: ${editPreviewText}`);
  }

  await page.fill("#edit-recipe-steps-input", "1. Warm tortillas\n2. Serve");
  await page.click("#edit-recipe-steps-rich-text-preview-tab");
  await page.waitForSelector("#edit-recipe-steps-rich-text-preview-content", { timeout: 10000 });
  await page.screenshot({ path: path.join(outputDir, `slice5b-edit-rich-text-${label}.png`), fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) {
    throw new Error(`Horizontal overflow detected at ${label}`);
  }

  await context.close();
  results.push({ label, addPreview: true, editPreview: true, overflow: false });
}

try {
  await smoke({ width: 1440, height: 1000 }, "1440");
  await smoke({ width: 390, height: 900 }, "390");
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
