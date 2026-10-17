import { db } from "./db";
import { sourceAllowed } from "./media";
import { publishRoomEvent } from "./events";
import { playbackSnapshot } from "./playback";
/** Optimistic version predicate makes premiere start idempotent across workers. */
export async function startDueScreenings(now = new Date()) {
  const due = await db.cinemaRoom.findMany({ where: { visibility: "PUBLIC", scheduledAt: { lte: now }, endedAt: null, playbackVersion: 0, playing: false }, include: { movie: { include: { sources: true } } }, take: 100 });
  let started = 0;
  for (const room of due) {
    const elapsed = (now.getTime() - room.scheduledAt!.getTime()) / 1000;
    const finished = elapsed >= room.movie.durationSeconds;
    if (!finished && !room.movie.sources.some(source => sourceAllowed(source, source.regions[0] || process.env.REGION_DEFAULT || "US", now))) continue;
    const changed = await db.cinemaRoom.updateMany({ where: { id: room.id, endedAt: null, playbackVersion: 0, playing: false }, data: { playing: !finished, position: finished ? room.movie.durationSeconds : 0, playbackUpdatedAt: room.scheduledAt!, playbackVersion: 1, ...(finished ? { endedAt: now } : {}) } });
    if (!changed.count) continue; started++;
    if (finished) await publishRoomEvent({ roomId: room.id, type: "ended" });
    else await publishRoomEvent({ roomId: room.id, type: "playback", data: playbackSnapshot({ ...room, playing: true, position: 0, playbackUpdatedAt: room.scheduledAt!, playbackVersion: 1 }, room.movie.durationSeconds) });
  }
  return started;
}

/** End public screenings on the server even when no host browser remains. */
export async function finishDueScreenings(now = new Date()) {
  const ended = await db.$queryRaw<{ id: string }[]>`
    UPDATE "CinemaRoom" AS room
    SET "endedAt" = ${now}, playing = false, position = movie."durationSeconds",
        "playbackUpdatedAt" = ${now}, "playbackVersion" = room."playbackVersion" + 1
    FROM "Movie" AS movie
    WHERE room."movieId" = movie.id AND room.visibility = 'PUBLIC' AND room."endedAt" IS NULL
      AND (room.position >= movie."durationSeconds" OR
        (room.playing AND room.position + EXTRACT(EPOCH FROM (${now} - room."playbackUpdatedAt")) >= movie."durationSeconds"))
    RETURNING room.id
  `;
  await Promise.all(ended.map(room => publishRoomEvent({ roomId: room.id, type: "ended" })));
  return ended.length;
}
