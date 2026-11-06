import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { games } from "../games.js";

const base = "http://127.0.0.1:4173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const screenshots = path.resolve("qa/screenshots");
await fs.mkdir(screenshots, { recursive: true });
const failures = [];

for (const game of games) {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1120, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`${base}/play.html?g=${game.id}`, { waitUntil: "networkidle" });
    try {
      assert.equal(response.status(), 200);
      await page.locator(".primary-button").click();
      await page.waitForTimeout(game.mode === "memory" ? 100 : 900);
      assert.equal(await page.locator(".overlay").count(), 0, "game should start without a blocking overlay");
      assert.equal(await page.locator(".game-stage canvas, .game-stage .board").count(), 1, "gameplay surface must be present");
      const metrics = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth - innerWidth, stage: document.querySelector(".game-stage").getBoundingClientRect().toJSON() }));
      assert.ok(metrics.scroll <= 1, `horizontal overflow: ${metrics.scroll}`);
      assert.ok(metrics.stage.width > 250 && metrics.stage.height > 150, "gameplay surface must fit screen");
      if (game.mode === "blocks") {
        await page.locator("[data-piece='0']").click();
        await page.locator(".board [data-index='0']").click();
        assert.notEqual(await page.locator("#hud").innerText(), "Score 0", "block must place");
      } else if (game.mode === "merge") {
        await page.keyboard.press("ArrowLeft");
        assert.equal(await page.locator(".tile-merge").count(), 16);
      } else if (game.mode === "memory") {
        await page.locator(".memory-card").first().click();
        assert.equal(await page.locator(".memory-card.face-down").count(), game.mode === "memory" ? 11 : 0);
      } else if (game.mode === "slide") {
        await page.locator(".slide-tile.legal").first().click();
        assert.match(await page.locator("#hud").innerText(), /Moves\s*1/);
      } else if (game.mode === "tactics") {
        await page.locator(".board [data-index='30']").click();
        assert.ok(await page.locator(".board .legal").count() > 0, "guard should have legal moves");
      } else if (game.mode === "runner") assert.match(await page.locator("#hud").innerText(), /Distance\s*[1-9]/);
      if (errors.length) throw new Error(errors.join(" | "));
      await page.locator(".game-stage").screenshot({ path: path.join(screenshots, `${game.id}-${mobile ? "mobile" : "desktop"}.png`) });
      console.log(`PASS ${game.id} ${mobile ? "mobile" : "desktop"}`);
    } catch (error) {
      failures.push(`${game.id} ${mobile ? "mobile" : "desktop"}: ${error.message}`);
      console.error(`FAIL ${failures.at(-1)}`);
    } finally { await context.close(); }
  }
}
await browser.close();
if (failures.length) process.exitCode = 1;
