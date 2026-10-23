import { db } from "./db";
import { POLICY_VERSION } from "./privacy";
import { AppError } from "./security";
export async function hasPolicyAcceptance(userId: string) {
 return Boolean(await db.policyAcceptance.findUnique({ where: { userId_version: { userId, version: POLICY_VERSION } }, select: { id: true } }));
}
export async function requirePolicyAcceptance(userId: string) {
 if (!await hasPolicyAcceptance(userId)) throw new AppError(403, "Review the Terms and Privacy Policy in account settings before starting or joining a theater.");
}
