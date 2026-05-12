import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve("output/playwright/recipe-workflow-refresh");
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.fill("#username_or_email", "alice");
  await page.fill("#password", "Password123!");
  await Promise.all([
    page.waitForURL(`${baseUrl}/`, { timeout: 10000 }).catch(() => page.waitForLoadState("networkidle")),
    page.click("#login-page-submit"),
  ]);
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) {
    throw new Error(`Horizontal overflow detected at ${label}`);
  }
}

async function assertVisible(page, selector, label) {
  await page.waitForSelector(selector, { timeout: 10000 });
  const visible = await page.locator(selector).first().isVisible();
  if (!visible) {
    throw new Error(`Expected ${selector} to be visible at ${label}`);
  }
}

async function smokeLanding(page, label) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await assertVisible(page, "#home-page-top-header", `${label} landing top bar`);
  await assertVisible(page, "#home-left-navigation", `${label} landing left navigation`);
  await assertVisible(page, "#home-featured-carousel", `${label} featured carousel`);
  await assertVisible(page, "[id^='home-featured-carousel-image-']", `${label} featured image`);

  const titleLink = page.locator("a[id^='home-visibility-tabs-link-'], a[id^='home-public-recipes-link-']").first();
  await titleLink.waitFor({ state: "visible", timeout: 10000 });
  const titleHref = await titleLink.getAttribute("href");
  if (!titleHref?.startsWith("/recipes/")) {
    throw new Error(`Expected recipe title/copy link to route to recipe detail at ${label}, got ${titleHref}`);
  }

  await page.locator("[id^='home-featured-carousel-image-']").first().click();
  await assertVisible(page, "#recipe-media-carousel", `${label} featured modal`);
  await page.click("#recipe-media-carousel-next");
  await page.click("#recipe-media-carousel-prev");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Escape");
  await page.waitForSelector("#recipe-media-carousel", { state: "detached", timeout: 10000 });

  await page.locator("[id^='home-recipe-carousel-image-button-']").first().click();
  await assertVisible(page, "#recipe-media-carousel", `${label} card image modal`);
  await page.click("#recipe-media-carousel-close");
  await page.waitForSelector("#recipe-media-carousel", { state: "detached", timeout: 10000 });

  await assertNoOverflow(page, `${label} landing`);
  await page.screenshot({ path: path.join(outputDir, `slice10-landing-${label}.png`), fullPage: true });
}

async function smokeAddRecipe(page, label) {
  await page.goto(`${baseUrl}/recipes/add`, { waitUntil: "networkidle" });
  await assertVisible(page, "#add-recipe-workflow", `${label} add workflow`);
  await page.click("#add-recipe-manual-choice");
  await assertVisible(page, "#add-recipe-details-form", `${label} add details form`);
  await assertVisible(page, "#add-recipe-details-description-rich-text-source-tab", `${label} description source tab`);
  await assertVisible(page, "#add-recipe-details-steps-rich-text-source-tab", `${label} steps source tab`);
  await assertVisible(page, "#add-recipe-details-media-section", `${label} media section`);
  await assertNoOverflow(page, `${label} add manual`);
  await page.screenshot({ path: path.join(outputDir, `slice10-add-manual-${label}.png`), fullPage: true });

  await page.goto(`${baseUrl}/recipes/add`, { waitUntil: "networkidle" });
  await page.click("#add-recipe-import-choice");
  await assertVisible(page, "#add-recipe-import-source-screen", `${label} add import screen`);
  await assertVisible(page, "#add-recipe-import-mode-tabs", `${label} import tabs`);
  await page.fill("#recipe-import-textarea", "just a title without usable ingredients or steps");
  await page.click("#recipe-import-parse-btn");
  await assertVisible(page, "#add-recipe-import-error", `${label} add import error`);

  await page.fill(
    "#recipe-import-textarea",
    [
      "Lemon Pasta",
      "Description: Bright and quick dinner.",
      "",
      "Ingredients:",
      "- 12 oz spaghetti",
      "- 1 tbsp olive oil",
      "",
      "Steps:",
      "1. Boil pasta.",
      "2. Toss everything together.",
    ].join("\n"),
  );
  await page.click("#recipe-import-parse-btn");
  await assertVisible(page, "#add-recipe-details-form", `${label} imported details form`);
  await page.waitForFunction(() => {
    const input = document.querySelector("#add-recipe-details-title-input");
    return input instanceof HTMLInputElement && input.value.length > 0;
  }, { timeout: 10000 });
  const importedTitle = await page.locator("#add-recipe-details-title-input").inputValue();
  if (!importedTitle.toLowerCase().includes("lemon")) {
    throw new Error(`Expected imported details to hydrate title at ${label}, got ${importedTitle}`);
  }
  await assertNoOverflow(page, `${label} add import`);
  await page.screenshot({ path: path.join(outputDir, `slice10-add-import-${label}.png`), fullPage: true });
}

async function smokeCompatibilityRoutes(page, label) {
  await page.goto(`${baseUrl}/recipes/new`, { waitUntil: "networkidle" });
  await assertVisible(page, "#new-recipe-form", `${label} new route`);
  await assertVisible(page, "#new-recipe-description-rich-text-source-tab", `${label} new rich text`);
  await assertNoOverflow(page, `${label} recipes new`);
  await page.screenshot({ path: path.join(outputDir, `slice10-recipes-new-${label}.png`), fullPage: true });

  await page.goto(`${baseUrl}/recipes/import`, { waitUntil: "networkidle" });
  await assertVisible(page, "#recipe-import-main", `${label} import route`);
  await assertVisible(page, "#recipe-import-mode-tabs", `${label} import mode tabs`);
  await assertNoOverflow(page, `${label} recipes import`);
  await page.screenshot({ path: path.join(outputDir, `slice10-recipes-import-${label}.png`), fullPage: true });
}

async function smokeRecipeDetailAndEdit(page, label) {
  await page.goto(`${baseUrl}/recipes/42`, { waitUntil: "networkidle" });
  await assertVisible(page, "#recipe-detail-main", `${label} recipe detail`);
  await assertVisible(page, "#recipe-detail-gallery-open-carousel", `${label} recipe detail gallery trigger`);
  await page.click("#recipe-detail-gallery-open-carousel");
  await assertVisible(page, "#recipe-media-carousel", `${label} recipe detail carousel`);
  await page.click("#recipe-media-carousel-close");
  await page.waitForSelector("#recipe-media-carousel", { state: "detached", timeout: 10000 });
  await assertNoOverflow(page, `${label} recipe detail`);
  await page.screenshot({ path: path.join(outputDir, `slice10-recipe-detail-${label}.png`), fullPage: true });

  await page.goto(`${baseUrl}/recipes/42/edit`, { waitUntil: "networkidle" });
  await assertVisible(page, "#edit-recipe-form", `${label} edit route`);
  await assertVisible(page, "#edit-recipe-media-section", `${label} edit media section`);
  await assertVisible(page, "#edit-recipe-description-rich-text-source-tab", `${label} edit description source tab`);
  await assertVisible(page, "#edit-recipe-submit", `${label} save changes button`);
  await assertNoOverflow(page, `${label} recipe edit`);
  await page.screenshot({ path: path.join(outputDir, `slice10-recipe-edit-${label}.png`), fullPage: true });
}

async function smoke(viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await login(page);

  await smokeLanding(page, label);
  await smokeAddRecipe(page, label);
  await smokeCompatibilityRoutes(page, label);
  await smokeRecipeDetailAndEdit(page, label);

  await context.close();
  results.push({
    label,
    landing: true,
    addRecipe: true,
    compatibilityRoutes: true,
    recipeDetail: true,
    editFlow: true,
    overflow: false,
  });
}

try {
  await smoke({ width: 1440, height: 1000 }, "1440");
  await smoke({ width: 390, height: 900 }, "390");
  const resultPath = path.join(outputDir, "slice10-final-smoke.json");
  await fs.writeFile(resultPath, JSON.stringify({ baseUrl, results }, null, 2));
  console.log(JSON.stringify({ baseUrl, results }, null, 2));
} finally {
  await browser.close();
}
