import "dotenv/config";
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
const port = Number(process.env.MEDIA_PORT || 3002);
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.url !== "/big-buck-bunny.mp4" || !["GET", "HEAD"].includes(req.method || "")) { res.writeHead(404); res.end(); return; }
  const file = join(process.cwd(), ".data/media/big-buck-bunny.mp4");
  let size: number; try { size = statSync(file).size; } catch { res.writeHead(503); res.end("Run media:setup first."); return; }
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
  const start = range ? Number(range[1]) : 0, end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end || start >= size) { res.writeHead(416, { "Content-Range": `bytes */${size}` }); res.end(); return; }
  res.writeHead(range ? 206 : 200, { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Content-Length": end - start + 1, ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}) });
  if (req.method === "HEAD") res.end(); else createReadStream(file, { start, end }).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Licensed development media listening on http://localhost:${port}`));
