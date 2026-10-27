"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { GlassButton } from "./glass";
type Notification = { id: string; title: string; href: string; readAt: string | null; createdAt: string };
export function NotificationPanel({ initial }: { initial: Notification[] }) {
  const [items, setItems] = useState(initial), [error, setError] = useState("");
  useEffect(() => { const timer = setInterval(() => { void fetch("/api/notifications").then(async r => { if (r.ok) setItems((await r.json()).notifications); }).catch(() => {}); }, 30000); return () => clearInterval(timer); }, []);
  async function read(id?: string) { try { const response = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (!response.ok) throw new Error("Unable to mark notifications read."); setItems(old => old.map(v => !id || id === v.id ? { ...v, readAt: new Date().toISOString() } : v)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update."); } }
  return <><div className="button-row mb-6"><GlassButton onClick={() => read()}><CheckCheck size={16} />Mark all as read</GlassButton></div>{error && <p role="alert" className="error-message">{error}</p>}{items.length ? <div className="glass-card notifications-list">{items.map(n => <Link href={n.href} key={n.id} className={`list-row notification ${n.readAt ? "read" : ""}`} onClick={() => void read(n.id)}><Bell size={17} /><div><p>{n.title}</p><small className="muted">{new Date(n.createdAt).toLocaleString()}</small></div>{!n.readAt && <span className="live-dot" />}</Link>)}</div> : <div className="empty-state"><Bell size={30} className="mx-auto mb-4" /><h2>A quiet moment.</h2><p>Invitations, friend requests and screening reminders will appear here.</p></div>}</>;
}
