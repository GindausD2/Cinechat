import { auth } from "@/auth";
import { db } from "./db";
import { AppError } from "./security";
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, include: { profile: true, subscription: true } });
  if (!user || user.suspended || user.authVersion !== session.user.authVersion) return null;
  return user;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError(401, "Please sign in to continue.");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AppError(403, "Administrator access required.");
  return user;
}
