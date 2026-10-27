// Production-mode browser tests use a real SMTP transport connected to this
// loopback-only receiver. It never forwards mail and accepts test addresses only.
import { SMTPServer } from "smtp-server";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const smtp = new SMTPServer({
  secure: false,
  hideSTARTTLS: true,
  disabledCommands: ["AUTH"],
  size: 1024 * 1024,
  onRcptTo(address, _session, callback) {
    callback(/@example\.(com|test)$/i.test(address.address) ? undefined : new Error("Only test email addresses are accepted."));
  },
  onData(stream, session, callback) {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", callback);
    stream.on("end", () => {
      void (async () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        const split = raw.search(/\r?\n\r?\n/);
        const headers = raw.slice(0, split).replace(/\r?\n[ \t]+/g, " ");
        let text = raw.slice(split).replace(/^\r?\n\r?\n/, "");
        const encoding = headers.match(/^Content-Transfer-Encoding:\s*(.*)$/im)?.[1]?.trim().toLowerCase();
        if (encoding === "base64") text = Buffer.from(text.replace(/\s/g,""),"base64").toString("utf8");
        if (encoding === "quoted-printable") text = text.replace(/=\r?\n/g,"").replace(/=([0-9a-f]{2})/gi,(_,hex:string) => String.fromCharCode(parseInt(hex,16)));
        const subject = headers.match(/^Subject:\s*(.*)$/im)?.[1]?.trim() || "";
        const directory = join(process.cwd(),".data/outbox");
        await mkdir(directory,{recursive:true,mode:0o700});
        for (const recipient of session.envelope.rcptTo) {
          await writeFile(join(directory,`${Date.now()}-${randomUUID()}.json`),JSON.stringify({to:recipient.address,subject,text,transport:"test-smtp"}),{mode:0o600});
        }
      })().then(() => callback()).catch(error => callback(error));
    });
  }
});
const health = createServer((request,response) => {
  if (request.url !== "/health") { response.writeHead(404).end(); return; }
  response.writeHead(200,{"Content-Type":"application/json"}).end(JSON.stringify({status:"ok",service:"test-smtp"}));
});
smtp.listen(2525,"127.0.0.1",() => {
  health.listen(2526,"127.0.0.1",() => console.log("Loopback-only CineChat SMTP test receiver ready."));
});
smtp.on("error",error => { console.error(error.message); process.exitCode=1; });
