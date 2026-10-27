import { PrismaClient, type Prisma } from "@prisma/client";
const globalDb = globalThis as unknown as { db?: PrismaClient };
function options(): Prisma.PrismaClientOptions {
  if (!process.env.DATABASE_URL) return {};
  const url = new URL(process.env.DATABASE_URL);
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", process.env.DATABASE_POOL_SIZE || "10");
  return { datasourceUrl: url.toString() };
}
export const db = globalDb.db ?? new PrismaClient(options());
if (process.env.NODE_ENV !== "production") globalDb.db = db;
