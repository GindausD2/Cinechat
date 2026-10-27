import { personProfile } from "@/lib/people";
import { regionForRequest, AppError } from "@/lib/security";
import { api } from "@/lib/api";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return api(async () => { const person = await personProfile(slug, regionForRequest(request.headers)); if (!person) throw new AppError(404, "Profile not found."); return { person }; })(request);
}
