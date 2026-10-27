import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { NotificationPanel } from "@/components/notifications";
export default async function Page() { const user = await currentUser(); if (!user) redirect("/login"); const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }); return <section className="page-container max-w-4xl"><div className="page-heading"><div><span className="eyebrow">FROM YOUR CINEMA CIRCLE</span><h1>You’re in the loop.</h1><p className="muted">The next good night could be one notification away.</p></div></div><NotificationPanel initial={notifications.map(v => ({ id: v.id, title: v.title, href: v.href, readAt: v.readAt?.toISOString() || null, createdAt: v.createdAt.toISOString() }))} /></section>; }
