import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve("output/playwright/family-pages-rebrand");
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function login(page, username = "alice") {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.fill("#username_or_email", username);
  await page.fill("#password", "Password123!");
  await Promise.all([
    page.waitForURL(`${baseUrl}/`, { timeout: 10000 }).catch(() => page.waitForLoadState("networkidle")),
    page.click("#login-page-submit"),
  ]);
}

async function assertVisible(page, selector, label) {
  await page.waitForSelector(selector, { timeout: 10000 });
  const visible = await page.locator(selector).first().isVisible();
  if (!visible) {
    throw new Error(`Expected ${selector} to be visible at ${label}`);
  }
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) {
    throw new Error(`Horizontal overflow detected at ${label}`);
  }
}

async function assertNoDuplicateIds(page, label) {
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id).filter(Boolean);
    return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  });

  if (duplicates.length > 0) {
    throw new Error(`Duplicate IDs at ${label}: ${duplicates.join(", ")}`);
  }
}

async function apiJson(page, route) {
  const response = await page.evaluate(async (pathName) => {
    const res = await fetch(pathName, { cache: "no-store" });
    return { body: await res.json(), ok: res.ok, status: res.status };
  }, route);

  if (!response.ok) {
    throw new Error(`API ${route} failed with ${response.status}: ${JSON.stringify(response.body)}`);
  }

  return response.body;
}

async function getFamilies(page) {
  const body = await apiJson(page, "/api/families");
  return body.families ?? [];
}

async function screenshot(page, filename) {
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
}

async function smokeHomeNavigation(page, label) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await assertVisible(page, "#home-left-navigation", `${label} home navigation`);
  await page.click("#home-left-navigation-toggle-btn");
  await assertVisible(page, "#home-left-navigation-drawer", `${label} home drawer`);

  const familyCreateHref = await page.locator("#home-left-navigation-family-create-link").getAttribute("href");
  const familiesMoreHref = await page.locator("#home-left-navigation-families-more-link").getAttribute("href");
  if (familyCreateHref !== "/account/families/new") {
    throw new Error(`Expected family create href to be /account/families/new, got ${familyCreateHref}`);
  }
  if (familiesMoreHref !== "/account/families") {
    throw new Error(`Expected families more href to be /account/families, got ${familiesMoreHref}`);
  }

  const editLink = page.locator("a[id^='home-left-navigation-family-edit-link-']").first();
  await editLink.waitFor({ state: "visible", timeout: 10000 });
  const editHref = await editLink.getAttribute("href");
  if (!editHref?.startsWith("/account/families/") || !editHref.endsWith("/edit")) {
    throw new Error(`Expected family edit href to point at /account/families/[id]/edit, got ${editHref}`);
  }

  await assertNoOverflow(page, `${label} home navigation`);
  await assertNoDuplicateIds(page, `${label} home navigation`);
  await screenshot(page, `family-home-navigation-${label}.png`);
}

async function smokeCreateFamily(page, label) {
  const familyName = `QA Family ${label} ${Date.now()}`;

  await page.goto(`${baseUrl}/account/families/new`, { waitUntil: "networkidle" });
  await assertVisible(page, "#create-family-workflow", `${label} create workflow`);
  await page.click("#create-family-start-continue-btn");
  await assertVisible(page, "#create-family-details-screen", `${label} create details`);
  await page.fill("#create-family-details-name-input", familyName);
  await page.fill("#create-family-details-description-input", `Automated Slice 8 smoke family for ${label}.`);
  await page.click("#create-family-workflow-next-btn");
  await assertVisible(page, "#create-family-invites-screen", `${label} create invites`);
  await page.click("#create-family-invites-single-use-btn");
  await page.click("#create-family-invites-tab-username");
  await page.fill("#create-family-invites-username-input", "bob");
  await page.click("#create-family-invites-username-stage-btn");
  await assertVisible(page, "#create-family-invites-staged-list", `${label} staged invites`);
  await page.click("#create-family-workflow-next-btn");
  await assertVisible(page, "#create-family-review-screen", `${label} create review`);
  await page.click("#create-family-review-submit-btn");
  await assertVisible(page, "#create-family-submit-success", `${label} create success`);
  await assertVisible(page, "[id^='create-family-review-generated-invite-input-']", `${label} generated invite URL`);

  const families = await getFamilies(page);
  const createdFamily = families.find((family) => family.name === familyName);
  if (!createdFamily) {
    throw new Error(`Created family ${familyName} was not returned by /api/families`);
  }

  await assertNoOverflow(page, `${label} create family`);
  await assertNoDuplicateIds(page, `${label} create family`);
  await screenshot(page, `family-create-${label}.png`);

  return createdFamily;
}

async function smokeEditFamily(page, label, familyId) {
  await page.goto(`${baseUrl}/account/families/${familyId}/edit`, { waitUntil: "networkidle" });
  await assertVisible(page, "#edit-family-admin-workflow", `${label} admin edit workflow`);
  await page.click("#edit-family-start-continue-btn");
  await assertVisible(page, "#edit-family-details-screen", `${label} admin edit details`);
  await page.click("#edit-family-workflow-next-btn");
  await assertVisible(page, "#edit-family-invites-screen", `${label} admin edit invites`);
  await page.click("#edit-family-invites-single-use-btn");
  await assertVisible(page, "[id^='edit-family-generated-invite-input-link-']", `${label} edit generated invite URL`);
  await page.click("#edit-family-invites-tab-username");
  await assertVisible(page, "#edit-family-invites-username-input", `${label} edit username invite tab`);
  await page.click("#edit-family-workflow-next-btn");
  await assertVisible(page, "#edit-family-review-screen", `${label} admin edit review`);

  await assertNoOverflow(page, `${label} edit family admin`);
  await assertNoDuplicateIds(page, `${label} edit family admin`);
  await screenshot(page, `family-edit-admin-${label}.png`);
}

async function smokeMemberView(page, label) {
  const bobFamilies = await getFamilies(page);
  const memberFamily = bobFamilies.find((family) => family.role === "member");
  if (!memberFamily) {
    throw new Error("Bob does not have a seeded member family for the read-only View check");
  }

  await page.goto(`${baseUrl}/account/families/${memberFamily.id}/edit`, { waitUntil: "networkidle" });
  await assertVisible(page, "#edit-family-member-view-workflow", `${label} member view workflow`);
  await assertVisible(page, "#edit-family-read-only-details", `${label} member read-only details`);
  await page.click("#edit-family-member-view-step-invites");
  await assertVisible(page, "#edit-family-read-only-invites", `${label} member read-only invites`);

  const adminOnlySaveCount = await page.locator("#edit-family-review-save-btn").count();
  if (adminOnlySaveCount > 0) {
    throw new Error("Read-only member view exposed the admin save control");
  }

  await assertNoOverflow(page, `${label} member view`);
  await assertNoDuplicateIds(page, `${label} member view`);
  await screenshot(page, `family-view-member-${label}.png`);
}

async function smokeManageFamilies(page, label, familyId) {
  await page.goto(`${baseUrl}/account/families`, { waitUntil: "networkidle" });
  await assertVisible(page, "#manage-families-workspace-section", `${label} manage workspace`);
  await page.click(`#manage-families-list-item-select-btn-${familyId}`);
  await assertVisible(page, "#manage-families-selected-workspace", `${label} selected family workspace`);

  const expectedFocus = label === "390" ? "manage-families-selected-summary" : "manage-family-selected-heading";
  await page.waitForFunction((id) => document.activeElement?.id === id, expectedFocus, { timeout: 10000 });

  await page.click("#manage-families-selected-tab-members");
  await assertVisible(page, `[id^='manage-families-members-panel-${familyId}']`, `${label} manage members`);
  await page.click("#manage-families-selected-tab-invites");
  await assertVisible(page, `#manage-families-invites-panel-${familyId}`, `${label} manage invites`);
  await assertVisible(page, `#manage-families-direct-invites-panel-${familyId}`, `${label} manage direct invites`);
  await page.click(`#manage-families-invites-create-btn-${familyId}`);
  await assertVisible(page, `#manage-families-invites-latest-url-input-${familyId}`, `${label} manage generated invite`);
  await page.click("#manage-families-selected-tab-safety");
  await assertVisible(page, `#manage-families-safety-panel-${familyId}`, `${label} manage safety`);
  await page.click("#manage-families-top-tab-pending-invites");
  await page.waitForSelector("#manage-families-pending-invites-panel, #manage-families-pending-invites-empty", {
    timeout: 10000,
  });

  await assertNoOverflow(page, `${label} manage families`);
  await assertNoDuplicateIds(page, `${label} manage families`);
  await screenshot(page, `family-manage-${label}.png`);
}

async function smokeRecipeVisibility(page, label) {
  await page.goto(`${baseUrl}/recipes/add`, { waitUntil: "networkidle" });
  if (await page.locator("#add-recipe-manual-choice").count()) {
    await page.click("#add-recipe-manual-choice");
  }
  await assertVisible(page, "#add-recipe-details-sharing-family-input", `${label} add recipe family visibility radio`);
  await page.click("#add-recipe-details-sharing-family-input");
  await assertVisible(page, "#add-recipe-details-sharing-families-list", `${label} add recipe family list`);
  await assertVisible(page, "input[id^='add-recipe-details-sharing-family-input-']", `${label} add recipe family checkbox`);

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.click("#home-left-navigation-toggle-btn");
  const recipeEditHref = await page.locator("a[id^='home-left-navigation-recipe-edit-link-']").first().getAttribute("href");
  if (!recipeEditHref) {
    throw new Error("No owned recipe edit link was available for recipe visibility regression");
  }

  await page.goto(`${baseUrl}${recipeEditHref}`, { waitUntil: "networkidle" });
  await assertVisible(page, "#edit-recipe-sharing-family-input", `${label} edit recipe family visibility radio`);
  await page.click("#edit-recipe-sharing-family-input");
  await assertVisible(page, "#edit-recipe-sharing-families-list", `${label} edit recipe family list`);
  await assertVisible(page, "input[id^='edit-recipe-sharing-family-input-']", `${label} edit recipe family checkbox`);

  await assertNoOverflow(page, `${label} recipe visibility`);
  await screenshot(page, `family-recipe-visibility-${label}.png`);
}

async function smoke(viewport, label) {
  const aliceContext = await browser.newContext({ viewport });
  const alicePage = await aliceContext.newPage();
  await login(alicePage, "alice");

  await smokeHomeNavigation(alicePage, label);
  const createdFamily = await smokeCreateFamily(alicePage, label);
  await smokeEditFamily(alicePage, label, createdFamily.id);
  await smokeManageFamilies(alicePage, label, createdFamily.id);
  await smokeRecipeVisibility(alicePage, label);
  await aliceContext.close();

  const bobContext = await browser.newContext({ viewport });
  const bobPage = await bobContext.newPage();
  await login(bobPage, "bob");
  await smokeMemberView(bobPage, label);
  await bobContext.close();

  results.push({
    createdFamilyId: createdFamily.id,
    label,
    createFamily: true,
    editFamilyAdmin: true,
    manageFamilies: true,
    memberView: true,
    navigation: true,
    recipeVisibility: true,
  });
}

try {
  await smoke({ width: 1440, height: 1000 }, "1440");
  await smoke({ width: 390, height: 900 }, "390");
  const resultPath = path.join(outputDir, "family-pages-smoke.json");
  await fs.writeFile(resultPath, JSON.stringify({ baseUrl, results }, null, 2));
  console.log(JSON.stringify({ baseUrl, results }, null, 2));
} finally {
  await browser.close();
}
