import { afterEach, describe, expect, it, vi } from "vitest";
import { THEATER_LIMITS } from "@/lib/theater-limits";
import { createRoomSchema, reactionSchema } from "@/lib/validation";
afterEach(() => vi.useRealTimers());
describe("room limits and creation input", () => {
  it("has the same operational bounds for every account", () => {
    expect(THEATER_LIMITS.publicCapacity).toBe(1000); expect(THEATER_LIMITS.privateCapacity).toBe(50); expect(THEATER_LIMITS.privateRooms).toBe(20);
  });
  it("rejects empty titles, short access codes and excessive capacity", () => {
    const input = { title: "A good movie night", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 8 };
    expect(createRoomSchema.safeParse(input).success).toBe(true);
    expect(createRoomSchema.safeParse({ ...input, visibility: "PUBLIC", capacity: 1000, theme: "blue" }).success).toBe(true);
    expect(createRoomSchema.safeParse({ ...input, capacity: 51 }).success).toBe(false);
    expect(createRoomSchema.safeParse({ ...input, accessCode: "123" }).success).toBe(false);
    expect(createRoomSchema.safeParse({ ...input, capacity: 1001 }).success).toBe(false);
    expect(createRoomSchema.safeParse({ ...input, title: " " }).success).toBe(false);
  });
  it("accepts the seven supported emojis and rejects arbitrary reaction content", () => {
    for (const emoji of ["❤️", "😂", "😮", "😢", "👏", "🔥", "👍"]) expect(reactionSchema.safeParse({ emoji }).success).toBe(true);
    for (const emoji of ["🎬", "hello", "<script>", ""]) expect(reactionSchema.safeParse({ emoji }).success).toBe(false);
    expect(reactionSchema.safeParse({ emoji: "❤️", messageId: "" }).success).toBe(false);
    expect(reactionSchema.safeParse({ emoji: "❤️", messageId: "x".repeat(129) }).success).toBe(false);
  });
});
