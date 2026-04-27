import { test, expect } from "@playwright/test";

// iPad Air viewport. Local dev server on :3000.
test.use({
  baseURL: "http://localhost:3000",
  viewport: { width: 820, height: 1180 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

async function clickNext(page) {
  await page.locator("button:has-text('Next')").first().click();
}

async function getRect(page, selector: string) {
  return await page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

test("audit_back_button_drift", async ({ page }) => {
  await page.goto("/onboarding");
  await page.waitForSelector("text=approach anxiety");
  await page.waitForTimeout(800);

  // Land on status step
  await page.locator("button:has-text('Get started')").or(page.locator("button:has-text('Next')")).first().click();
  await page.waitForSelector("text=current status");
  await page.waitForTimeout(700);

  const statusBack = await getRect(page, 'button[aria-label="Back"]');
  const statusBar = await getRect(page, '[aria-label="Back"] + div');
  await page.screenshot({ path: "screenshots/debug/ipad_status.png", fullPage: false });

  await page.locator("text=Student").first().click();
  await clickNext(page);
  await page.waitForSelector("text=conversations do you start");
  await page.waitForTimeout(700);

  const approachesBack = await getRect(page, 'button[aria-label="Back"]');
  const approachesBar = await getRect(page, '[aria-label="Back"] + div');
  await page.screenshot({ path: "screenshots/debug/ipad_approaches.png", fullPage: false });

  console.log("STATUS back:", JSON.stringify(statusBack));
  console.log("APPROACHES back:", JSON.stringify(approachesBack));
  console.log("STATUS bar :", JSON.stringify(statusBar));
  console.log("APPROACHES bar:", JSON.stringify(approachesBar));

  // The back button should be at the same Y on both steps.
  expect(Math.abs(statusBack.y - approachesBack.y)).toBeLessThan(1);
  expect(Math.abs(statusBack.x - approachesBack.x)).toBeLessThan(1);
});

test("audit_button_widths", async ({ page }) => {
  await page.goto("/onboarding");
  await page.waitForSelector("text=approach anxiety");
  await page.waitForTimeout(800);

  // Click through to location
  await page.locator("button:has-text('Get started')").or(page.locator("button:has-text('Next')")).first().click();
  await page.waitForSelector("text=current status");
  await page.locator("text=Student").first().click();
  await clickNext(page);
  await page.locator("text=0–2").first().click();
  await clickNext(page);
  await page.locator("text=TikTok").first().click();
  await clickNext(page);
  await page.locator("button:has-text('No')").first().click();
  await clickNext(page);
  await clickNext(page); // pitch
  await page.waitForSelector("text=Where do you live");
  await page.waitForTimeout(700);

  const locationOption = await getRect(page, "button:has-text('Big city')");
  const locationMain = await getRect(page, "main");
  await page.screenshot({ path: "screenshots/debug/ipad_location.png", fullPage: false });

  console.log("LOCATION main:", JSON.stringify(locationMain));
  console.log("LOCATION option:", JSON.stringify(locationOption));

  await page.locator("text=Big city").first().click();
  await clickNext(page);
  await page.waitForSelector("text=When were you born");
  await page.waitForTimeout(500);

  // Click Jan, 1, 2001 by selecting first available wheel value
  // Just press Next assuming defaults work
  const nextBtn = page.locator("button:has-text('Next')");
  if (await nextBtn.isEnabled()) await nextBtn.click();
  else {
    // tap on month "Jan"
    await page.locator("text=Jan").first().click();
    await clickNext(page);
  }

  await page.waitForSelector("text=What is your goal");
  await page.waitForTimeout(700);

  const goalOption = await getRect(page, "button:has-text('Get a girlfriend')");
  const goalMain = await getRect(page, "main");
  await page.screenshot({ path: "screenshots/debug/ipad_goal.png", fullPage: false });

  console.log("GOAL main:", JSON.stringify(goalMain));
  console.log("GOAL option:", JSON.stringify(goalOption));
});

test("audit_today_no_session", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "screenshots/debug/ipad_today.png", fullPage: false });
});
