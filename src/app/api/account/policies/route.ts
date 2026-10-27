import { api, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { policyAcknowledgementSchema } from "@/lib/validation";
import { POLICY_VERSION } from "@/lib/privacy";
export const POST = api(async request => {
 const user = await requireUser(); await rateLimit(`policies:${user.id}`, 10, 60);
 policyAcknowledgementSchema.parse(await jsonBody(request));
 await db.policyAcceptance.upsert({ where: { userId_version: { userId: user.id, version: POLICY_VERSION } }, create: { userId: user.id, version: POLICY_VERSION }, update: {} });
 return { acknowledged: true, version: POLICY_VERSION };
});
