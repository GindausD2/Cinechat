import type { RoomEvent } from "./events";

/** This bounds delivery work, never authoritative room data (which lives in PG).
 * Overflow replaces pending notifications with a fresh authorized DB snapshot.
 * Ephemeral reactions may be dropped; private history is recovered from storage.
 */
export class RoomDeliveryQueue {
  private pending = new Map<string, RoomEvent[]>();
  private running = new Set<string>();
  private idleWaiters: (() => void)[] = [];
  constructor(
    private deliver: (event: RoomEvent) => Promise<void>,
    private recover: (roomId: string) => void,
    private limits = { concurrent: 4, rooms: 128, perRoom: 32 }
  ) {}

  enqueue(event: RoomEvent) {
    let queue = this.pending.get(event.roomId);
    if (!queue) {
      if (this.pending.size >= this.limits.rooms) { this.recover(event.roomId); return; }
      queue = []; this.pending.set(event.roomId, queue);
    }
    if (queue.length >= this.limits.perRoom) queue.splice(0, queue.length, event.type === "ended" ? event : { roomId: event.roomId, type: "refresh" });
    // A pending refresh reads all committed changes. Keep lifecycle events so
    // ended/removed viewers are informed promptly, even during a reaction burst.
    else if (event.type === "ended" || event.type === "removed" || !queue.some(item => item.type === "refresh")) queue.push(event);
    this.pump();
  }

  get pendingCount() { return [...this.pending.values()].reduce((count, queue) => count + queue.length, 0); }
  get activeCount() { return this.running.size; }
  whenIdle() { return this.pending.size === 0 ? Promise.resolve() : new Promise<void>(resolve => this.idleWaiters.push(resolve)); }

  private pump() {
    for (const roomId of this.pending.keys()) {
      if (this.running.size >= this.limits.concurrent) break;
      if (this.running.has(roomId)) continue;
      this.running.add(roomId);
      void this.drain(roomId);
    }
  }

  private async drain(roomId: string) {
    const queue = this.pending.get(roomId)!;
    try { while (queue.length) await this.deliver(queue.shift()!); }
    catch { this.recover(roomId); }
    finally {
      this.pending.delete(roomId); this.running.delete(roomId); this.pump();
      if (!this.pending.size) for (const resolve of this.idleWaiters.splice(0)) resolve();
    }
  }
}
