import { createHash, randomBytes } from "node:crypto";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export function ageAt(birthDate: Date | null, now = new Date()) {
  if (!birthDate) return 0;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (now.getUTCMonth() < birthDate.getUTCMonth() || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())) age--;
  return age;
}
export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireOrigin(request: Request) {
  const expected = new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin;
  if (request.headers.get("origin") !== expected) throw new AppError(403, "Invalid request origin.");
}
export function regionForRequest() {
  // Single launch-region deployment. Set from trusted infrastructure, never a client header.
  return (process.env.REGION_DEFAULT || "US").toUpperCase();
}
