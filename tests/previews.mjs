import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { games } from "../games.js";

await fs.mkdir("previews", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const game of games.filter((item) => !process.env.QA_GAME || item.id === process.env.QA_GAME)) {
  const viewport = game.aspect === "9/16" ? { width: 450, height: 800 } : game.aspect === "1/1" ? { width: 640, height: 640 } : { width: 960, height: 540 };
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  try {
    await page.goto(`http://127.0.0.1:4173/play.html?g=${game.id}&embed=1`, { waitUntil: "networkidle" });
    await page.locator(".primary-button").click();
    await page.evaluate(({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.style.cssText = "position:fixed;left:-2000px;top:0;opacity:0;pointer-events:none";
      document.body.append(canvas);
      const recorder = new MediaRecorder(canvas.captureStream(8), { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 550000 });
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.start();
      window.previewRecorder = { canvas, recorder, chunks };
    }, viewport);
    for (let frame = 0; frame < 10; frame++) {
      if (game.mode === "blocks" && frame === 3) {
        await page.locator("[data-piece='0']").click();
        await page.locator(".board [data-index='0']").click();
      } else if (game.mode === "tactics" && frame === 3) {
        await page.locator(".board [data-index='30']").click();
        await page.locator(".board .legal").first().click();
      } else if (game.mode === "memory" && [3, 6].includes(frame)) {
        await page.locator(".memory-card.face-down").first().click();
      } else if (game.mode === "slide" && [3, 6].includes(frame)) {
        await page.locator(".slide-tile.legal").first().click();
      } else if (game.mode === "merge" && [3, 6].includes(frame)) {
        await page.keyboard.press(frame === 3 ? "ArrowLeft" : "ArrowDown");
      } else if (game.mode === "snake" && frame === 4) await page.keyboard.press("ArrowDown");
      else if (["flap", "runner", "rhythm", "platform"].includes(game.mode) && frame % 3 === 0) await page.keyboard.press("Space");
      if (game.mode === "platform" && frame === 1) await page.keyboard.down("ArrowRight");
      const png = await page.locator(".game-stage").screenshot({ type: "png" });
      await page.evaluate(async (base64) => {
        const image = new Image(); image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const { canvas } = window.previewRecorder;
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      }, png.toString("base64"));
      await page.waitForTimeout(230);
    }
    const data = await page.evaluate(async () => {
      const { recorder, chunks } = window.previewRecorder;
      const finished = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.stop(); await finished;
      const blob = new Blob(chunks, { type: "video/webm" });
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
    const video = Buffer.from(data, "base64");
    if (video.length < 1000) throw new Error("Recorded video is empty");
    await fs.writeFile(`previews/${game.id}.webm`, video);
    console.log(`CAPTURED ${game.id} ${Math.round(video.length / 1024)} KB`);
  } finally { await page.close(); }
}
await browser.close();
