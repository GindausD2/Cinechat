import { db } from "./db";
import { redisConnection } from "./redis";
// Bounded batches: no user/account/room/message history is mass-deleted.
export async function runPrivacyMaintenance(now = new Date()) {
 const expiredTokens = await db.authToken.findMany({ where: { expiresAt: { lte: now } }, select: { id: true }, take: 500 });
 const tokens = await db.authToken.deleteMany({ where: { id: { in: expiredTokens.map(v => v.id) }, expiresAt: { lte: now } } });
 const expiredTickets = await db.realtimeTicket.findMany({ where: { expiresAt: { lte: now } }, select: { tokenHash: true }, take: 500 });
 const tickets = await db.realtimeTicket.deleteMany({ where: { tokenHash: { in: expiredTickets.map(v => v.tokenHash) }, expiresAt: { lte: now } } });
 const expiredSessions = await db.session.findMany({ where: { expires: { lte: now } }, select: { id: true }, take: 500 });
 const sessions = await db.session.deleteMany({ where: { id: { in: expiredSessions.map(v => v.id) }, expires: { lte: now } } });
 const expiredVerifications = await db.verificationToken.findMany({ where: { expires: { lte: now } }, select: { token: true }, take: 500 });
 const verifications = await db.verificationToken.deleteMany({ where: { token: { in: expiredVerifications.map(v => v.token) }, expires: { lte: now } } });
 const oldFloating = await db.reaction.findMany({ where: { messageId: null, createdAt: { lt: new Date(now.getTime() - 86400000) } }, select: { id: true }, take: 500 });
 const reactions = await db.reaction.deleteMany({ where: { id: { in: oldFloating.map(v => v.id) }, messageId: null } });
 const deletedMessages = await db.chatMessage.findMany({ where: { deleted: true, body: { not: "" } }, select: { id: true }, take: 500 });
 const messages = await db.chatMessage.updateMany({ where: { id: { in: deletedMessages.map(v => v.id) }, deleted: true }, data: { body: "" } });
 const tokenAccounts = await db.account.findMany({ where: { provider: "google", OR: [{ access_token: { not: null } }, { refresh_token: { not: null } }, { id_token: { not: null } }] }, select: { id: true }, take: 500 });
 const accounts = await db.account.updateMany({ where: { id: { in: tokenAccounts.map(v => v.id) }, provider: "google" }, data: { access_token: null, refresh_token: null, id_token: null, scope: null, token_type: null, expires_at: null, session_state: null } });
 return { expiredTokens: tokens.count, expiredTickets: tickets.count, expiredSessions: sessions.count, expiredVerifications: verifications.count, oldFloatingReactions: reactions.count, redactedDeletedMessages: messages.count, minimizedGoogleLinks: accounts.count };
}
export async function privacyMaintenanceTick() {
 const redis = redisConnection();
 if (await redis.set("cinechat:privacy-maintenance", "running", "EX", 3600, "NX") !== "OK") return;
 try { await runPrivacyMaintenance(); } catch (error) { await redis.del("cinechat:privacy-maintenance"); throw error; }
}
