import { AppError } from "./security";
export function requiredSecret(name: "AUTH_SECRET" | "REALTIME_SECRET") {
  const value = process.env[name];
  if (!value || value.length < 32 || value.startsWith("replace-with")) throw new AppError(503, `${name} must be configured with a random secret of at least 32 characters.`);
  return value;
}
