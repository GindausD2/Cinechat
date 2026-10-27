import type { Role, Visibility } from "@prisma/client";

/** Public timelines belong to platform moderators; private ones to their host. */
export function canManageTheater(
  room: { visibility: Visibility; hostId: string },
  user: { id: string; role: Role }
) {
  return room.visibility === "PUBLIC" ? user.role === "ADMIN" : room.hostId === user.id;
}

export type ScreeningStatus = "Upcoming" | "Live" | "Ended" | "Unavailable";
export function screeningStatus(room: { endedAt: Date | null; scheduledAt: Date | null }, available: boolean, now = new Date()): ScreeningStatus {
  if (room.endedAt) return "Ended";
  if (!available) return "Unavailable";
  return room.scheduledAt && room.scheduledAt > now ? "Upcoming" : "Live";
}
