import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { accountViaApi } from "./helpers";
const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(() => db.$disconnect());
type Ack = { ok: boolean; status?: number; data?: { version: number } };
function emit(socket: Socket, event: string, data: unknown): Promise<Ack> { return new Promise((resolve, reject) => socket.timeout(7000).emit(event, data, (error: Error | null, ack: Ack) => error ? reject(error) : resolve(ack))); }

test("public screening controls require a current administrator role and discovery distinguishes all states", async ({ browser }) => {
  const contexts = await Promise.all([1,2].map(() => browser.newContext({ reducedMotion: "reduce" })));
  const [admin, viewer] = await Promise.all(contexts.map(c => c.newPage())), suffix = Date.now().toString(36); const ids: string[] = []; let movieId = ""; let socket: Socket | undefined;
  try {
    const adminId = await accountViaApi(admin, `policyh_${suffix}`, { screeningAdmin: true }), viewerId = await accountViaApi(viewer, `policyv_${suffix}`);
    const body = { title: `Administrator public premiere ${suffix}`, movieId: "big-buck-bunny", visibility: "PUBLIC", capacity: 8 };
    expect((await viewer.request.post("/api/rooms", { headers, data: body })).status()).toBe(403);
    await viewer.goto("/cinemas/new"); await expect(viewer.getByRole("button", { name: /Public Theater Watch with everyone/ })).toBeDisabled();
    const created = await admin.request.post("/api/rooms", { headers, data: body }); expect(created.ok()).toBe(true); const id = (await created.json()).id; ids.push(id);
    expect((await viewer.request.post(`/api/rooms/${id}`, { headers, data: { action: "join" } })).ok()).toBe(true);
    const ticket = (await (await viewer.request.post("/api/realtime-ticket", { headers })).json()).ticket;
    socket = io("http://localhost:3003", { auth: { ticket }, transports: ["websocket"], extraHeaders: { Origin: headers.origin }, reconnection: false });
    await new Promise<void>((resolve,reject) => { socket!.once("connect", resolve); socket!.once("connect_error", reject); });
    expect((await emit(socket, "join", { roomId: id })).ok).toBe(true);
    expect((await emit(socket, "playback", { action: "play", expectedVersion: 0 })).status).toBe(403);
    expect((await viewer.request.post(`/api/rooms/${id}`, { headers, data: { action: "end" } })).status()).toBe(403);
    await db.user.update({ where: { id: adminId }, data: { role: "USER" } });
    expect((await (await admin.request.get(`/api/rooms/${id}`)).json()).canManage).toBe(false);
    expect((await admin.request.post(`/api/rooms/${id}`, { headers, data: { action: "end" } })).status()).toBe(403);
    // A different current administrator can operate the public screening after
    // joining. Host IDs and stale connection claims cannot grant permissions.
    await db.user.update({ where: { id: viewerId }, data: { role: "ADMIN" } });
    expect((await emit(socket, "playback", { action: "play", position: 10, expectedVersion: 0 })).ok).toBe(true);
    expect((await emit(socket, "playback", { action: "seek", position: 0, expectedVersion: 0 })).status).toBe(409);
    expect(await db.moderationAction.count({ where: { targetId: id, actorId: viewerId, action: "screening:play" } })).toBe(1);
    await db.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    const upcoming = await admin.request.post("/api/rooms", { headers, data: { ...body, title: `Scheduled local-time screening ${suffix}`, scheduledAt: new Date(Date.now()+600000).toISOString() } }); expect(upcoming.ok()).toBe(true); const upcomingId = (await upcoming.json()).id; ids.push(upcomingId);
    const original = await db.movie.findUniqueOrThrow({ where: { id: "big-buck-bunny" }, include: { sources: true } }); const { sources, ...metadata } = original; const { id: _sourceId, movieId: _sourceMovieId, ...source } = sources[0]; void _sourceId; void _sourceMovieId;
    movieId = `policy-${suffix}`; await db.movie.create({ data: { ...metadata, id: movieId, title: "Regional unavailable fixture", sources: { create: source } } });
    const unavailable = await admin.request.post("/api/rooms", { headers, data: { ...body, movieId, title: `Rights unavailable screening ${suffix}` } }); expect(unavailable.ok()).toBe(true); const unavailableId = (await unavailable.json()).id; ids.push(unavailableId);
    await db.mediaSource.updateMany({ where: { movieId }, data: { enabled: false } });
    const listings = (await (await viewer.request.get("/api/rooms?type=public")).json()).rooms;
    expect(listings.find((r: { id: string }) => r.id === id).status).toBe("Live");
    expect(listings.find((r: { id: string }) => r.id === upcomingId).status).toBe("Upcoming");
    expect(listings.find((r: { id: string }) => r.id === unavailableId).status).toBe("Unavailable");
    expect(JSON.stringify(listings)).not.toContain(source.url);
    await viewer.goto("/cinemas?type=public"); await expect(viewer.locator(`a[href='/cinemas/${id}']`).getByText("Join Theater", { exact: true })).toBeVisible();
    await expect(viewer.locator(`a[href='/cinemas/${upcomingId}']`).getByText("Take a seat", { exact: true })).toBeVisible();
    await expect(viewer.getByRole("article", { name: `Rights unavailable screening ${suffix} · Unavailable` })).toBeVisible();
    expect((await viewer.request.post(`/api/rooms/${unavailableId}`, { headers, data: { action: "join" } })).status()).toBe(451);
    expect((await admin.request.post(`/api/rooms/${upcomingId}`, { headers, data: { action: "end" } })).ok()).toBe(true);
    expect((await viewer.request.post(`/api/rooms/${upcomingId}`, { headers, data: { action: "join" } })).status()).toBe(404);
    await viewer.goto("/cinemas?type=public&ended=true"); const ended = viewer.getByRole("article", { name: `Scheduled local-time screening ${suffix} · Ended` }); await expect(ended).toBeVisible(); await expect(ended.getByRole("link")).toHaveCount(0);
    await viewer.goto(`/cinemas/${id}`); await expect(viewer.getByText("Live & synchronized")).toBeVisible();
    await viewer.getByRole("button", { name: "Hide reactions", exact: true }).click(); await expect(viewer.getByRole("log", { name: "Live cinema reactions" })).toHaveCount(0);
    expect((await emit(socket, "reaction", { emoji: "👏" })).ok).toBe(true); await expect(viewer.locator(".floating-reaction")).toHaveCount(0);
    await viewer.getByRole("button", { name: "Show reactions", exact: true }).click(); await expect(viewer.getByRole("log", { name: "Live cinema reactions" })).toBeVisible();
  } finally { socket?.close(); for (const id of ids) await admin.request.post(`/api/rooms/${id}`, { headers, data: { action: "end" } }); await db.cinemaRoom.deleteMany({ where: { id: { in: ids } } }); if (movieId) await db.movie.delete({ where: { id: movieId } }); await Promise.all(contexts.map(c => c.close())); }
});
