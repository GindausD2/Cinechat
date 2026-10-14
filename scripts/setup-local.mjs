import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) { console.log("Existing .env preserved. Configure it using .env.example."); process.exit(0); }
const password = randomBytes(24).toString("hex");
let source = readFileSync(".env.example", "utf8")
  .replaceAll("local-development-only", password)
  .replace("replace-with-at-least-32-random-characters", randomBytes(48).toString("hex"))
  .replace("replace-with-a-different-32-character-random-secret", randomBytes(48).toString("hex"))
  .replace("ALLOW_LOCAL_MEDIA=false", "ALLOW_LOCAL_MEDIA=true");
writeFileSync(".env", source, { mode: 0o600 });
console.log("Local .env created with unique database, auth and real-time secrets. No secrets were printed.");
