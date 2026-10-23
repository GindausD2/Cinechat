import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { isUnder18, POLICY_VERSION } from "@/lib/privacy";
import { safeReturnPath } from "@/lib/return-path";
import { SettingsForm } from "@/components/settings-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = safeReturnPath((await searchParams).returnTo);
  const user = await currentUser(); if (!user) redirect("/login");
  const movies = await db.movie.findMany({ select: { id: true, title: true } });
  const protectedAccount = isUnder18(user.profile?.birthDate || null);
  const accepted = await db.policyAcceptance.findUnique({ where: { userId_version: { userId: user.id, version: POLICY_VERSION } } });
  return <section className="page-container"><div className="page-heading"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h1>Account settings.</h1><p className="muted">Your identity, your privacy, your cinema.</p></div></div><SettingsForm returnTo={returnTo} hasPassword={Boolean(user.passwordHash)} hasPolicyAcceptance={Boolean(accepted)} email={user.email} image={user.image} movies={movies} profile={{ username: user.profile?.username || "", biography: user.profile?.biography || "", publicProfile: !protectedAccount && (user.profile?.publicProfile ?? true), showActivity: !protectedAccount && (user.profile?.showActivity ?? false), allowFriendRequests: !protectedAccount && (user.profile?.allowFriendRequests ?? true), favoriteMovieIds: user.profile?.favoriteMovieIds || [], protectedAccount, hasBirthDate: Boolean(user.profile?.birthDate) }} /></section>;
}
