import { afterEach, describe, expect, it, vi } from "vitest";
import type { Subscription } from "@prisma/client";
import { planLimits } from "@/lib/rooms";
import { createRoomSchema, reactionSchema } from "@/lib/validation";
afterEach(() => vi.useRealTimers());
describe("room limits and creation input", () => {
  it("enforces free, active Pro and expired plan capacities", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-14"));
    expect(planLimits(null).capacity).toBe(8);
    const plan = { plan: "PRO", status: "active", currentPeriodEnd: new Date("2026-11-14") } as Subscription;
    expect(planLimits(plan).capacity).toBe(50);
    expect(planLimits({ ...plan, status: "canceled" }).pro).toBe(false);
    expect(planLimits({ ...plan, currentPeriodEnd: new Date("2026-01-01") }).pro).toBe(false);
  });
  it("rejects empty titles, short access codes and excessive capacity", () => {
    const input = { title: "A good movie night", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 8 };
    expect(createRoomSchema.safeParse(input).success).toBe(true);
    expect(createRoomSchema.safeParse({ ...input, accessCode: "123" }).success).toBe(false);
    expect(createRoomSchema.safeParse({ ...input, capacity: 1000 }).success).toBe(false);
    expect(createRoomSchema.safeParse({ ...input, title: " " }).success).toBe(false);
  });
  it("accepts the seven supported emojis and rejects arbitrary reaction content", () => {
    for (const emoji of ["❤️", "😂", "😮", "😢", "👏", "🔥", "👍"]) expect(reactionSchema.safeParse({ emoji }).success).toBe(true);
    for (const emoji of ["🎬", "hello", "<script>", ""]) expect(reactionSchema.safeParse({ emoji }).success).toBe(false);
    expect(reactionSchema.safeParse({ emoji: "❤️", messageId: "" }).success).toBe(false);
    expect(reactionSchema.safeParse({ emoji: "❤️", messageId: "x".repeat(129) }).success).toBe(false);
  });
});
