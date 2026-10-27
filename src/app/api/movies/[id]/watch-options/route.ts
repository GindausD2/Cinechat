import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { regionForRequest } from "@/lib/security";
import { watchOptions } from "@/lib/watch-options";
import { requirePolicyAcceptance } from "@/lib/policy-acceptance";
import { rateLimit } from "@/lib/redis";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return api(async () => { const user = await requireUser(); await requirePolicyAcceptance(user.id); await rateLimit(`watch-options:${user.id}`, 90, 60); return watchOptions(id, user, regionForRequest(request.headers)); })(request);
}
