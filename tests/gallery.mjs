import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator(".game-card").count(), 12);
  for (const image of await page.locator(".card-art img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
  }
  assert.equal(await page.locator(".card-art img").evaluateAll((images) => images.filter((image) => !image.complete || !image.naturalWidth).length), 0, "all original covers must load");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "gallery must fit viewport");
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `qa/gallery-${width}.png`, fullPage: true });
  console.log(`PASS gallery ${width}px`);
  await page.close();
}
await browser.close();
