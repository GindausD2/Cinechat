import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/settings-form";
export default async function Page() {
  const user = await currentUser(); if (!user) redirect("/login");
  const movies = await db.movie.findMany({ select: { id: true, title: true } });
  return <section className="page-container"><div className="page-heading"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h1>Account settings.</h1><p className="muted">Your identity, your privacy, your cinema.</p></div></div><SettingsForm email={user.email} image={user.image} movies={movies} profile={{ username: user.profile?.username || "", biography: user.profile?.biography || "", publicProfile: user.profile?.publicProfile ?? true, showActivity: user.profile?.showActivity ?? false, allowFriendRequests: user.profile?.allowFriendRequests ?? true, favoriteMovieIds: user.profile?.favoriteMovieIds || [], hasBirthDate: Boolean(user.profile?.birthDate) }} /></section>;
}
