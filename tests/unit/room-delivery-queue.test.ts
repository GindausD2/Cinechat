import { describe, expect, it } from "vitest";
import { RoomDeliveryQueue } from "../../src/lib/room-delivery-queue";
import type { RoomEvent } from "../../src/lib/events";

describe("bounded room delivery", () => {
  it("preserves per-room order and caps concurrent delivery across rooms", async () => {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; }), delivered: string[] = [];
    const queue = new RoomDeliveryQueue(async event => { if (event.data === "first") await held; delivered.push(String(event.data)); }, () => {}, { concurrent: 1, rooms: 2, perRoom: 4 });
    queue.enqueue({ roomId: "one", type: "reaction", data: "first" });
    queue.enqueue({ roomId: "one", type: "reaction", data: "second" });
    queue.enqueue({ roomId: "two", type: "reaction", data: "third" });
    expect(queue.activeCount).toBe(1); expect(delivered).toEqual([]);
    release(); await queue.whenIdle(); expect(delivered).toEqual(["first", "second", "third"]);
  });
  it("collapses overload into an authoritative refresh instead of unbounded private-message work", async () => {
    let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; }); const delivered: RoomEvent[] = [], recovered: string[] = [];
    const queue = new RoomDeliveryQueue(async event => { if (!delivered.length) { delivered.push(event); await held; } else delivered.push(event); }, roomId => recovered.push(roomId), { concurrent: 1, rooms: 1, perRoom: 3 });
    queue.enqueue({ roomId: "one", type: "message", data: "initial" });
    for (let n = 0; n < 100; n++) queue.enqueue({ roomId: "one", type: "message", data: n });
    queue.enqueue({ roomId: "two", type: "refresh" });
    expect(queue.pendingCount).toBeLessThanOrEqual(3); expect(recovered).toEqual(["two"]);
    release(); await queue.whenIdle(); expect(delivered.map(event => event.type)).toEqual(["message", "refresh"]);
  });
  it("recovers and releases a failed delivery slot", async () => {
    const recovered: string[] = [];
    const queue = new RoomDeliveryQueue(async () => { throw new Error("database unavailable"); }, room => recovered.push(room));
    queue.enqueue({ roomId: "one", type: "refresh" }); await queue.whenIdle();
    expect(recovered).toEqual(["one"]); expect(queue.pendingCount).toBe(0); expect(queue.activeCount).toBe(0);
  });
});
