import "dotenv/config";
import { db } from "../src/lib/db";
import { runPrivacyMaintenance } from "../src/lib/privacy-maintenance";
try {
 if (process.argv.includes("--apply")) console.log(await runPrivacyMaintenance());
 else {
  const now = new Date();
  console.log({ mode: "dry run; pass --apply to process up to 500 records per category", expiredTokens: await db.authToken.count({ where: { expiresAt: { lte: now } } }), expiredTickets: await db.realtimeTicket.count({ where: { expiresAt: { lte: now } } }), deletedMessageBodies: await db.chatMessage.count({ where: { deleted: true, body: { not: "" } } }), floatingReactionsOlderThan24Hours: await db.reaction.count({ where: { messageId: null, createdAt: { lt: new Date(Date.now() - 86400000) } } }) });
 }
} finally { await db.$disconnect(); }
