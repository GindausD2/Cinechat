/** Public seats follow the same lease window as distributed viewer presence. */
export const PUBLIC_SEAT_LEASE_MS = 45000;
export function seatLeaseCutoff(now = Date.now()) { return new Date(now - PUBLIC_SEAT_LEASE_MS); }
export function hasPublicSeat(lastSeenAt: Date, now = Date.now()) { return lastSeenAt > seatLeaseCutoff(now); }
