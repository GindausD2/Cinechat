import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, requireOrigin } from "./security";
import { RateLimitError } from "./redis";
export function api(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) requireOrigin(request);
      if (Number(request.headers.get("content-length") || 0) > 16384) throw new AppError(413, "Request too large.");
      const result = await handler(request);
      if (result instanceof Response) return result;
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
      if (error instanceof RateLimitError) return Response.json({ error: error.message }, { status: 429, headers: { "Retry-After": "60" } });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "That value is already in use." }, { status: 409 });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return Response.json({ error: "Not found." }, { status: 404 });
      console.error("CineChat request failed", error instanceof Error ? error.name : "UnknownError");
      return Response.json({ error: "Service temporarily unavailable. Try again shortly." }, { status: 503 });
    }
  };
}
export async function jsonBody(request: Request) {
  const text = await request.text();
  if (text.length > 16384) throw new AppError(413, "Request too large.");
  try { return JSON.parse(text) as unknown; } catch { throw new AppError(400, "Invalid JSON."); }
}
