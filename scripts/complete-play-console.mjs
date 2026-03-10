import puppeteer from "puppeteer";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = (process.env.LOCALAPPDATA || "C:\\Users\\Daniel\\AppData\\Local") + "\\Google\\Chrome\\User Data";

async function main() {
  console.log("Launching Chrome with your existing session...\n");

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_PATH,
    userDataDir: USER_DATA_DIR,
    args: ["--no-first-run", "--disable-blink-features=AutomationControlled"],
    defaultViewport: null,
    protocolTimeout: 120000,
  });

  const page = (await browser.pages())[0] || await browser.newPage();
  page.setDefaultTimeout(60000);

  // Go to Play Console
  console.log("Opening Play Console...");
  await page.goto("https://play.google.com/console", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 5000));

  const url = page.url();
  console.log("URL:", url);

  const devIdMatch = url.match(/developers\/(\d+)/);
  if (!devIdMatch) {
    await page.screenshot({ path: "scripts/play-store-assets/debug-page.png" });
    console.log("Not on developer dashboard. Screenshot saved. URL:", url);
    browser.disconnect();
    return;
  }

  const devId = devIdMatch[1];
  console.log("Developer ID:", devId);

  // Find app ID
  await page.goto(`https://play.google.com/console/u/0/developers/${devId}/app-list`, { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 3000));

  const appId = await page.$$eval("a", links => {
    for (const l of links) {
      const m = l.href.match(/\/app\/(\d+)/);
      if (m) return m[1];
    }
    return null;
  });

  if (!appId) {
    await page.screenshot({ path: "scripts/play-store-assets/debug-applist.png" });
    console.log("Could not find app ID. Screenshot saved.");
    browser.disconnect();
    return;
  }
  console.log("App ID:", appId);

  // =====================
  // CONTENT RATING
  // =====================
  console.log("\n=== CONTENT RATING ===");
  await page.goto(
    `https://play.google.com/console/u/0/developers/${devId}/app/${appId}/content-rating`,
    { waitUntil: "networkidle2" }
  );
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: "scripts/play-store-assets/rating-1.png" });
  console.log("  Screenshot: rating-1.png");

  // Click any "Start" button
  await clickButtonContaining(page, "start");
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: "scripts/play-store-assets/rating-2.png" });
  console.log("  Screenshot: rating-2.png");

  // Fill email if there's an input
  await fillFirstEmptyInput(page, "support@wingmate.app");

  // Loop through questionnaire pages
  for (let step = 0; step < 20; step++) {
    await new Promise(r => setTimeout(r, 2000));
    const acted1 = await clickNoOptions(page);
    const acted2 = await clickButtonContaining(page, "next") ||
                   await clickButtonContaining(page, "save") ||
                   await clickButtonContaining(page, "submit");
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `scripts/play-store-assets/rating-step-${step}.png` });
    console.log(`  Step ${step} done`);
    if (!acted1 && !acted2) break;
  }

  // =====================
  // TARGET AUDIENCE
  // =====================
  console.log("\n=== TARGET AUDIENCE ===");
  await page.goto(
    `https://play.google.com/console/u/0/developers/${devId}/app/${appId}/target-audience`,
    { waitUntil: "networkidle2" }
  );
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: "scripts/play-store-assets/audience-1.png" });
  console.log("  Screenshot: audience-1.png");

  // Click the "18" option
  await clickElementContainingText(page, "18");
  await new Promise(r => setTimeout(r, 1000));

  // Save
  await clickButtonContaining(page, "save") || await clickButtonContaining(page, "next");
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: "scripts/play-store-assets/audience-2.png" });
  console.log("  Screenshot: audience-2.png");

  // =====================
  // APP CATEGORY
  // =====================
  console.log("\n=== APP CATEGORY ===");
  await page.goto(
    `https://play.google.com/console/u/0/developers/${devId}/app/${appId}/app-content`,
    { waitUntil: "networkidle2" }
  );
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: "scripts/play-store-assets/app-content.png" });
  console.log("  Screenshot: app-content.png");

  console.log("\n=== DONE ===");
  console.log("Check screenshots in scripts/play-store-assets/");
  console.log("Browser left open for verification. Close it when done.");
  browser.disconnect();
}

// --- Helpers ---

async function clickButtonContaining(page, text) {
  try {
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const btnText = await btn.evaluate(el => el.textContent.trim().toLowerCase());
      const disabled = await btn.evaluate(el => el.disabled || el.getAttribute("aria-disabled") === "true");
      if (!disabled && btnText.includes(text.toLowerCase())) {
        console.log(`  Clicking button: "${btnText.substring(0, 40)}"`);
        await btn.click();
        return true;
      }
    }
  } catch {}
  return false;
}

async function clickNoOptions(page) {
  let clicked = false;
  try {
    const targets = await page.$$eval(
      'label, [role="radio"], [role="option"], [role="checkbox"]',
      els => els.filter(el => {
        const t = el.textContent.trim().toLowerCase();
        return t === "no" || t.startsWith("no,") || t.startsWith("no ") ||
          t.includes("none of the above") || t.includes("none of these");
      }).map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim().substring(0, 60), x: r.x + r.width/2, y: r.y + r.height/2 };
      })
    );
    for (const t of targets) {
      if (t.x > 0 && t.y > 0) {
        await page.mouse.click(t.x, t.y);
        console.log(`  Clicked: "${t.text}"`);
        clicked = true;
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch {}
  return clicked;
}

async function clickElementContainingText(page, text) {
  try {
    const targets = await page.$$eval(
      'label, [role="radio"], [role="checkbox"], [role="option"]',
      (els, searchText) => els.filter(el => el.textContent.includes(searchText)).map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim().substring(0, 60), x: r.x + r.width/2, y: r.y + r.height/2 };
      }),
      text
    );
    for (const t of targets) {
      if (t.x > 0 && t.y > 0) {
        await page.mouse.click(t.x, t.y);
        console.log(`  Selected: "${t.text}"`);
        await new Promise(r => setTimeout(r, 500));
        return true;
      }
    }
  } catch {}
  return false;
}

async function fillFirstEmptyInput(page, value) {
  try {
    const inputs = await page.$$("input");
    for (const input of inputs) {
      const v = await input.evaluate(el => el.value);
      const type = await input.evaluate(el => el.type);
      if (!v && (type === "text" || type === "email")) {
        await input.click({ clickCount: 3 });
        await input.type(value);
        console.log(`  Filled input: ${value}`);
        return true;
      }
    }
  } catch {}
  return false;
}

main().catch(e => { console.error(e); process.exit(1); });
