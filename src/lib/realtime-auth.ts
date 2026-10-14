import { createHmac, timingSafeEqual } from "node:crypto";
import { randomToken } from "./security";
import { requiredSecret } from "./env";
function secret() { return requiredSecret("REALTIME_SECRET"); }
export function realtimeTicket() { const nonce = randomToken(); return `${nonce}.${createHmac("sha256", secret()).update(nonce).digest("base64url")}`; }
export function verifyRealtimeTicket(token: string) {
  if (token.length > 150) return false;
  const [nonce, signature, extra] = token.split(".");
  if (!nonce || !signature || extra) return false;
  const expected = createHmac("sha256", secret()).update(nonce).digest();
  const actual = Buffer.from(signature, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
