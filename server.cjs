const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".jpg": "image/jpeg", ".webm": "video/webm" };

http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  let file;
  try { file = path.resolve(root, "." + decodeURIComponent(pathname === "/" ? "/index.html" : pathname)); }
  catch { response.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
}).listen(4173, "127.0.0.1", () => console.log("UNIBLEX Arcade listening on http://127.0.0.1:4173"));
