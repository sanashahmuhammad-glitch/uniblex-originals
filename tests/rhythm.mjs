import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
try {
  await page.goto("http://127.0.0.1:4173/play.html?g=pulse-path&embed=1", { waitUntil: "networkidle" });
  await page.locator(".primary-button").click();
  await page.locator(".overlay h2").waitFor({ timeout: 6000 });
  assert.match(await page.locator(".overlay").innerText(), /Another round/);
  await page.locator(".overlay .primary-button").click();
  assert.equal(await page.locator(".overlay").count(), 0);
  console.log("PASS rhythm obstacle collision and restart");
} finally { await browser.close(); }
