import { test, Page } from "@playwright/test";
import { installMocks } from "./fixtures/demo-mocks";

/**
 * iPhone screenshots for App Store Connect.
 * iPhone 6.7" Display spec: 1290 x 2796 (portrait) — ASC API doesn't
 * have an enum for 6.9" yet; 6.7" is the largest accepted slot and
 * Apple expects exactly these dimensions.
 * Captured at viewport 645x1398 with deviceScaleFactor 2.
 * Writes to screenshots/ios-iphone/.
 */

const VW = 645;
const VH = 1398;

test.use({
  viewport: { width: VW, height: VH },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
  defaultBrowserType: "chromium",
});

async function snap(page: Page, name: string) {
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `screenshots/ios-iphone/${name}.png`,
    clip: { x: 0, y: 0, width: VW, height: VH },
  });
}

test("01 — onboarding welcome", async ({ page }) => {
  await installMocks(page, { signedIn: false });
  await page.goto("/onboarding");
  await page.waitForSelector("text=Overcome approach anxiety", { timeout: 15_000 });
  await snap(page, "01_welcome");
});

test("02 — today tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=checkin");
  await page.waitForSelector("text=/streak/i", { timeout: 15_000 });
  await snap(page, "02_today");
});

test("03 — plan tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=plan");
  await page.waitForSelector("text=Your Plan", { timeout: 15_000 });
  await page.waitForSelector("text=/conversation/i", { timeout: 10_000 });
  await snap(page, "03_plan");
});

test("04 — coach tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=coach");
  await page.waitForSelector("text=/what.s going on|keeping you from|tell me/i", { timeout: 15_000 });
  await page.waitForTimeout(1200);
  await snap(page, "04_coach");
});

test("05 — community tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=community");
  await page.waitForSelector("text=/Been using Wingmate/i", { timeout: 15_000 });
  await snap(page, "05_community");
});

test("06 — plans pricing", async ({ page }) => {
  await installMocks(page);
  await page.goto("/plans");
  await page.waitForSelector("text=Pro Yearly", { timeout: 15_000 });
  await snap(page, "06_plans");
});
