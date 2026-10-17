import "dotenv/config";
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { resolve, sep, extname } from "node:path";
const port = Number(process.env.MEDIA_PORT || 3002);
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const extension = extname(pathname), types: Record<string, string> = { ".mp4": "video/mp4", ".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/mp2t", ".vtt": "text/vtt" };
  if (!types[extension] || !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(pathname) || !["GET", "HEAD"].includes(req.method || "")) { res.writeHead(404); res.end(); return; }
  const root = resolve(process.cwd(), ".data/media"), file = resolve(root, "." + pathname);
  if (!file.startsWith(root + sep)) { res.writeHead(404); res.end(); return; }
  let size: number; try { size = statSync(file).size; } catch { res.writeHead(503); res.end("Run media:setup first."); return; }
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
  const start = range ? Number(range[1]) : 0, end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end || start >= size) { res.writeHead(416, { "Content-Range": `bytes */${size}` }); res.end(); return; }
  res.writeHead(range ? 206 : 200, { "Content-Type": types[extension], "Accept-Ranges": "bytes", "Content-Length": end - start + 1, ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}) });
  if (req.method === "HEAD") res.end(); else createReadStream(file, { start, end }).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Licensed development media listening on http://localhost:${port}`));
