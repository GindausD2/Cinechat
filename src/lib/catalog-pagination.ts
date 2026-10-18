import { z } from "zod";
import { AppError } from "./security";

const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.string().min(1).max(80) });
export function catalogCursor(movie: { createdAt: Date; id: string }) {
  return Buffer.from(JSON.stringify({ createdAt: movie.createdAt.toISOString(), id: movie.id })).toString("base64url");
}
export function readCatalogCursor(value?: string) {
  if (!value) return null;
  try {
    if (value.length > 512 || !/^[\w-]+$/.test(value)) throw new Error();
    const data = cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return { ...data, createdAt: new Date(data.createdAt) };
  } catch { throw new AppError(400, "The movie page cursor is invalid. Start a new search."); }
}
