"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Users, Send, MessageSquare, X, Link2, LogOut, Flag, Lock, Radio, Shield, Check, MicOff, Trash2 } from "lucide-react";
import { backdropFor, filmAttribution } from "@/lib/artwork";
import type { roomSnapshot } from "@/lib/rooms";
import { CinemaPlayer, type ClientPlayback } from "./cinema-player";
import { GlassButton, GlassChatPanel, GlassModal } from "./glass";
import { ReminderButton } from "./reminder-button";
import { Avatar } from "./avatar";
import { TheaterReactions } from "./theater-reactions";
import { REACTION_LIFETIME_MS, THEATER_REACTIONS } from "@/lib/reactions";
import { ScreeningTime } from "./screening-time";
type RoomData = Awaited<ReturnType<typeof roomSnapshot>>;
type Message = RoomData["messages"][number];
type Ack = { ok: boolean; data?: unknown; error?: string; status?: number };
type Reaction = { id: string; emoji: string; userId?: string; messageId: string | null; expiresAt: number };
export function RoomClient({ initial, viewerId, autoInvite = false }: { initial: RoomData; viewerId: string; autoInvite?: boolean }) {
  const [room, setRoom] = useState(initial), [connected, setConnected] = useState(false), [messages, setMessages] = useState(initial.visibility === "PRIVATE" ? initial.messages : []), [text, setText] = useState(""), [error, setError] = useState(""), [chatOpen, setChatOpen] = useState(true), [tab, setTab] = useState("chat"), [inviteOpen, setInviteOpen] = useState(false), [viewersOpen, setViewersOpen] = useState(false), [invite, setInvite] = useState(""), [inviteId, setInviteId] = useState(""), [copied, setCopied] = useState(false), [online, setOnline] = useState<string[]>([]), [reactions, setReactions] = useState<Reaction[]>([]), [report, setReport] = useState<string | null | false>(false), [removed, setRemoved] = useState(""), [clockOffset, setClockOffset] = useState(0);
  const socket = useRef<Socket | null>(null), playback = useRef(initial.playback), end = useRef<HTMLDivElement>(null); const router = useRouter(); const host = room.canManage;
  const deletedMessages = useRef(new Set<string>()), pendingMessage = useRef<{ body: string; nonce: string } | null>(null);
  const [sending, setSending] = useState(false);
  const privateTheater = room.visibility === "PRIVATE";
  const [viewerCount, setViewerCount] = useState(0), [participantsDirty, setParticipantsDirty] = useState(true);
  const [inviteUses, setInviteUses] = useState(Math.max(1, initial.capacity - 1)), [expiryHours, setExpiryHours] = useState(24), [inviteExpiry, setInviteExpiry] = useState("");
  const [inviteRecords, setInviteRecords] = useState<{ id: string; expiresAt: string; uses: number; maxUses: number; revoked: boolean }[]>([]);
  const updatePlayback = (next: ClientPlayback) => { if (next.version < playback.current.version) return; playback.current = next; setRoom(old => ({ ...old, playback: next })); };
  useEffect(() => {
    if (removed) return;
    let disposed = false, connecting = false, ticketExpiresAt = 0, retryDelay = 5000;
    let connection: Socket | null = null, retry: ReturnType<typeof setTimeout> | undefined;
    async function connect() {
      if (disposed || connecting || !navigator.onLine) return;
      if (connection && ticketExpiresAt > Date.now() + 60000) { connection.connect(); return; }
      connecting = true;
      try {
        connection?.disconnect();
        const response = await fetch("/api/realtime-ticket", { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (disposed) return;
        ticketExpiresAt = new Date(data.expiresAt).getTime(); retryDelay = 5000;
        connection = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", { auth: { ticket: data.ticket }, transports: ["websocket"], reconnectionDelay: 1000, reconnectionDelayMax: 5000 }); socket.current = connection;
        connection.on("connect", () => { connection?.emit("join", { roomId: initial.id }, (ack: Ack) => {
          setConnected(ack.ok); setError(ack.ok ? "" : ack.error || "Unable to join.");
          if (!ack.ok && [401,403,404,409,451].includes(ack.status || 0)) { setRemoved(ack.error || "This screening is unavailable."); connection?.disconnect(); }
          if (ack.ok) { const started = Date.now(); connection?.emit("clock", {}, (reply: Ack) => { if (reply.ok && reply.data) setClockOffset((reply.data as { serverTime: number }).serverTime - (started + Date.now()) / 2); }); }
        }); });
        connection.on("disconnect", () => setConnected(false)); connection.on("connect_error", () => { setConnected(false); setError("Reconnecting to your cinema…"); });
        connection.on("state", (data: RoomData) => { if (data.playback.version < playback.current.version) data = { ...data, playback: playback.current }; else playback.current = data.playback; setRoom(data); setMessages(data.visibility === "PRIVATE" ? data.messages.filter(message => !deletedMessages.current.has(message.id)) : []); });
        connection.on("playback", updatePlayback);
        connection.on("presence", (data: { count: number; ids: string[] } | string[]) => { setOnline(Array.isArray(data) ? data : data.ids); setViewerCount(Array.isArray(data) ? data.length : data.count); });
        connection.on("participants-changed", () => setParticipantsDirty(true));
        if (initial.visibility === "PRIVATE") {
          connection.on("message", (message: Message) => { if (!deletedMessages.current.has(message.id)) setMessages(old => old.some(m => m.id === message.id) ? old : [...old.slice(-99), message]); });
          connection.on("message-delete", ({ id }: { id: string }) => {
            deletedMessages.current.add(id); if (deletedMessages.current.size > 1000) deletedMessages.current.delete(deletedMessages.current.values().next().value!);
            setMessages(old => old.filter(message => message.id !== id));
          });
        }
        connection.on("reaction", (reaction: Reaction) => {
          if (!THEATER_REACTIONS.some(emoji => emoji === reaction.emoji) || (initial.visibility === "PUBLIC" && reaction.messageId)) return;
          const now = Date.now();
          setReactions(old => old.some(r => r.id === reaction.id) ? old : [...old.filter(r => r.messageId || r.expiresAt > now).slice(-49), { ...reaction, expiresAt: now + REACTION_LIFETIME_MS }]);
        });
        connection.on("removed", ({ reason }: { reason: string }) => { setRemoved(reason); connection?.disconnect(); });
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : "Unable to connect.");
          retry = setTimeout(() => { void connect(); }, retryDelay); retryDelay = Math.min(retryDelay * 2, 120000);
        }
      } finally { connecting = false; }
    }
    const offline = () => { connection?.disconnect(); setConnected(false); setError("Your connection is offline. Rejoining when it returns…"); };
    const online = () => { clearTimeout(retry); void connect(); };
    window.addEventListener("offline", offline); window.addEventListener("online", online);
    void connect();
    const sync = setInterval(() => { if (!connection?.connected) return; const started = Date.now(); connection?.emit("clock", {}, (ack: Ack) => { if (ack.ok && ack.data) setClockOffset((ack.data as { serverTime: number }).serverTime - (started + Date.now()) / 2); }); }, 10000);
    const renew = setInterval(() => { ticketExpiresAt = 0; void connect(); }, 2700000);
    return () => { disposed = true; clearTimeout(retry); clearInterval(sync); clearInterval(renew); window.removeEventListener("offline", offline); window.removeEventListener("online", online); connection?.disconnect(); socket.current = null; };
    // A room owns one connection; all live state arrives through socket events.
  }, [initial.id, initial.visibility, removed]);
  useEffect(() => {
    if (!viewersOpen || !participantsDirty) return;
    const controller = new AbortController();
    void fetch(`/api/rooms/${initial.id}`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setRoom(old => ({ ...old, participants: data.participants })); setParticipantsDirty(false);
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load viewers."); });
    return () => controller.abort();
  }, [viewersOpen, participantsDirty, initial.id]);
  useEffect(() => {
    if (!autoInvite || !host) return;
    const controller = new AbortController();
    void fetch(`/api/rooms/${initial.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "invite" }), signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setInvite(data.url); setInviteId(data.id); setInviteExpiry(data.expiresAt); setInviteUses(data.maxUses); setInviteOpen(true);
      router.replace(`/cinemas/${initial.id}`, { scroll: false });
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to create invitation."); });
    return () => controller.abort();
  }, [autoInvite, host, initial.id, router]);
  useEffect(() => {
    if (!inviteOpen || !host) return;
    const controller = new AbortController();
    void fetch(`/api/rooms/${initial.id}/invitations`, { signal: controller.signal }).then(async response => {
      if (response.ok) setInviteRecords((await response.json()).invitations);
    }).catch(() => {});
    return () => controller.abort();
  }, [inviteOpen, inviteId, initial.id, host]);
  useEffect(() => {
    const nextExpiry = Math.min(...reactions.filter(r => !r.messageId).map(r => r.expiresAt));
    if (!Number.isFinite(nextExpiry)) return;
    const timeout = setTimeout(() => setReactions(old => old.filter(r => r.messageId || r.expiresAt > Date.now())), Math.max(0, nextExpiry - Date.now()));
    return () => clearTimeout(timeout);
  }, [reactions]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); }, [messages]);
  async function emit(name: string, data: unknown) {
    if (!socket.current?.connected) throw new Error("Please wait for the cinema connection.");
    return new Promise<unknown>((resolve, reject) => { socket.current!.timeout(8000).emit(name, data, (timeout: Error | null, ack: Ack) => { if (timeout) reject(new Error("The cinema did not respond. Try again.")); else if (!ack.ok) reject(new Error(ack.error)); else resolve(ack.data); }); });
  }
  async function roomAction(body: unknown) { const response = await fetch(`/api/rooms/${room.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }
  async function doControl(action: "play" | "pause" | "seek", position?: number) { try { const state = await emit("playback", { action, position, expectedVersion: playback.current.version }) as ClientPlayback; updatePlayback(state); return true; } catch (e) { setError(e instanceof Error ? e.message : "Playback failed."); return false; } }
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending || !text.trim()) return; setSending(true);
    if (pendingMessage.current?.body !== text) pendingMessage.current = { body: text, nonce: crypto.randomUUID() };
    try { await emit("message", { body: text, clientNonce: pendingMessage.current.nonce }); setText(current => current === text ? "" : current); pendingMessage.current = null; setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Message not sent."); } finally { setSending(false); }
  }
  async function removeMessage(messageId: string) { try { await emit("message-delete", { messageId }); setMessages(old => old.filter(message => message.id !== messageId)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete message."); } }
  async function react(emoji: string, messageId?: string) { try { await emit("reaction", { emoji, messageId }); } catch (e) { setError(e instanceof Error ? e.message : "Reaction not sent."); } }
  async function makeInvite() { try { const data = await roomAction({ action: "invite", maxUses: inviteUses, expiryHours }); setInvite(data.url); setInviteId(data.id); setInviteExpiry(data.expiresAt); setInviteOpen(true); setCopied(false); } catch (e) { setError(e instanceof Error ? e.message : "Invitation failed."); } }
  async function moderate(targetId: string, command: string) { try { await roomAction({ action: "moderate", targetId, command }); } catch (e) { setError(e instanceof Error ? e.message : "Moderation failed."); } }
  async function block(targetId: string) { try { const r = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "block", targetId }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setMessages(old => old.filter(m => m.userId !== targetId)); setRoom(old => ({ ...old, participants: old.participants.filter(p => p.id !== targetId) })); } catch (e) { setError(e instanceof Error ? e.message : "Unable to block."); } }
  async function reportSubmit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); try { const data = Object.fromEntries(new FormData(event.currentTarget)); const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: room.id, messageId: report || undefined, ...data }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setReport(false); setError("Report submitted for review."); } catch (e) { setError(e instanceof Error ? e.message : "Report failed."); } }
  if (removed) return <div className="empty-state"><h1>Intermission.</h1><p>{removed}</p><Link href="/cinemas" className="button button-primary">Back to cinemas</Link></div>;
  const participantList = <div className="participants">
    {!privateTheater && <p className="muted">Viewer identities are shown only when public activity is shared, or to screening moderators.</p>}
    {room.participants.map(p => <div className="participant" key={p.id}>
      <Avatar name={p.name} image={p.image} />
      <div><Link href={`/profile/${p.name}`}><strong>{p.name}</strong></Link>
        <small>{p.role === "HOST" ? "Host" : online.includes(p.id) ? "Watching now" : "Seat reserved"}{p.mutedUntil && <MicOff size={10} className="inline ml-1" />}</small>
      </div>
      {p.id !== viewerId && <div className="participant-actions">
        {host && <><button onClick={() => moderate(p.id, p.mutedUntil ? "unmute" : "mute")}>{p.mutedUntil ? "Unmute" : "Mute"}{privateTheater ? "" : " reactions"}</button><button onClick={() => moderate(p.id, "remove")}>Remove</button></>}
        <button onClick={() => block(p.id)}>Block</button>
      </div>}
    </div>)}
  </div>;
  return <div className={`cinema-client theater-${privateTheater ? "private" : "public"} theme-${room.theme}`}>
    <div className="cinema-heading">
      <div>
        <div className="cinema-status"><span className="pill">{privateTheater ? <Lock size={11} /> : <Radio size={11} />}{privateTheater ? "PRIVATE THEATER" : "PUBLIC THEATER"}</span><span className={connected ? "connection-good" : "muted"}>{connected ? room.scheduledAt && new Date(room.scheduledAt).getTime() > room.playback.serverTime ? "● Connected · Starts soon" : "● Live & synchronized" : "○ Connecting…"}</span></div>
        <h1>{room.title}</h1>
        <p>{room.movie.title} <span>·</span> <span className="viewer-count" data-testid="live-viewer-count">{viewerCount} watching</span> <span>·</span> {room.capacity} seats</p>
      </div>
      <div className="button-row">
        {privateTheater && host && <GlassButton variant="primary" onClick={makeInvite}><Link2 size={15} />Invite Friends</GlassButton>}
        {privateTheater && <GlassButton onClick={() => setChatOpen(!chatOpen)} aria-label={chatOpen ? "Collapse chat" : "Open chat"} aria-expanded={chatOpen}><MessageSquare size={15} /></GlassButton>}
        {(!privateTheater || !chatOpen) && <GlassButton onClick={() => setViewersOpen(true)} aria-label="Viewers" aria-haspopup="dialog"><Users size={15} />Viewers</GlassButton>}
        <GlassButton onClick={() => {
          // Leaving the screen must work even if the API or connection is down.
          socket.current?.disconnect(); setRemoved("You left this theater.");
          void fetch(`/api/rooms/${room.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "leave" }), keepalive: true }).catch(() => {});
          if (navigator.onLine) router.push("/cinemas");
        }}><LogOut size={15} />Leave</GlassButton>
      </div>
    </div>
    {room.scheduledAt && <div className="glass-card mb-6"><p className="muted">Scheduled for <ScreeningTime value={new Date(room.scheduledAt).toISOString()} /></p><ReminderButton roomId={room.id} /></div>}
    {error && <p role="status" className="error-message cinema-notice">{error}</p>}
    <div className={`cinema-layout ${privateTheater && chatOpen ? "" : "chat-collapsed"}`}>
      <div>
        <CinemaPlayer media={room.media} playback={room.playback} canControl={host && connected} publicTheater={!privateTheater} onControl={doControl} movieId={room.movie.id} clockOffset={clockOffset} poster={backdropFor(room.movie)}>
          <TheaterReactions connected={connected} reactions={reactions.filter(r => !r.messageId)} onReaction={react} />
        </CinemaPlayer>
        <div className="cinema-film-info">
          <div><span className="eyebrow">NOW SHOWING</span><h2>{room.movie.title}</h2><p className="muted">{room.movie.year} · {Math.round(room.movie.durationSeconds / 60)} min · {room.movie.genres.join(" / ")}</p><p className="muted">{room.movie.synopsis}</p>{room.description && <p className="muted mt-3">{room.description}</p>}</div>
          <div className="button-row">
            <GlassButton aria-label="Report room" onClick={() => setReport(null)}><Flag size={14} />Report</GlassButton>
            {host && <GlassButton variant="danger" onClick={async () => { try { await roomAction({ action: "end" }); router.push("/cinemas"); } catch (e) { setError(e instanceof Error ? e.message : "Unable to end."); } }}>End screening</GlassButton>}
          </div>
        </div>
        <p className="rights-note"><small>{filmAttribution(room.media.attribution)} <a href={room.media.rightsUrl} target="_blank" rel="noreferrer">{room.media.license}</a></small></p>
      </div>
      {privateTheater && chatOpen && <GlassChatPanel>
        <div className="chat-header"><div><h2>Screening chat</h2><span><span className="live-dot" /> {viewerCount} here with you</span></div><button className="icon-button" aria-label="Close chat" onClick={() => setChatOpen(false)}><X size={17} /></button></div>
        <div className="chat-tabs"><button className={tab === "chat" ? "active" : ""} aria-pressed={tab === "chat"} onClick={() => setTab("chat")}>Chat</button><button className={tab === "people" ? "active" : ""} aria-pressed={tab === "people"} onClick={() => setTab("people")}><Users size={12} />People ({room.participants.length})</button></div>
        {tab === "chat" ? <>
          <div className="chat-messages">
            {!messages.length && <div className="chat-welcome"><MessageSquare size={23} /><h3>Your guests. Your conversation.</h3><p>Chat is shared with authorized members. Administrators may review reported content.</p></div>}
            {messages.map(m => <article className="chat-message" key={m.id}>
              <Avatar name={m.name} image={m.image} />
              <div>
                <div className="message-top"><strong>{m.name}</strong>{m.userId === room.hostId && <Shield size={10} />}<time>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>{(m.userId === viewerId || host) && <button aria-label={`Delete message by ${m.name}`} onClick={() => removeMessage(m.id)} disabled={!connected}><Trash2 size={12} /></button>}<button aria-label={`Report message by ${m.name}`} onClick={() => setReport(m.id)}><Flag size={10} /></button></div>
                <p>{m.body}</p><button className="message-react" aria-label={`Like message by ${m.name}`} onClick={() => react("❤️", m.id)}>♡{reactions.filter(r => r.messageId === m.id).length || ""}</button>
              </div>
            </article>)}
            <div ref={end} />
          </div>
          <form className="chat-compose" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Share a thought…" aria-label="Chat message" disabled={!connected} /><button aria-label="Send message" disabled={!text.trim() || !connected || sending}><Send size={16} /></button></form>
          <p className="chat-guideline">Members can read and copy messages. Avoid personal details. <Link href="/legal/safety">Safety & reporting</Link></p>
        </> : participantList}
      </GlassChatPanel>}
    </div>
    <GlassModal open={viewersOpen} onClose={() => setViewersOpen(false)} title="Theater viewers">
      <p className="muted">{viewerCount} watching · {room.capacity} seats{host ? ". Manage participants below." : "."}</p>{viewersOpen && participantList}
    </GlassModal>
    {privateTheater && <GlassModal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Save someone a seat.">
      <p className="muted">Share this link with your invited friends. Share any theater password separately.</p><div className="invitation-options"><label>Guest limit<input type="number" min="1" max={room.capacity} value={inviteUses} onChange={event => setInviteUses(Number(event.target.value))} /></label><label>Invitation expiry<select value={expiryHours} onChange={event => setExpiryHours(Number(event.target.value))}><option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option></select></label></div><GlassButton onClick={makeInvite}>Generate new invitation</GlassButton>{inviteExpiry && <p className="muted mt-4">Valid until <ScreeningTime value={inviteExpiry} /></p>}
      <label>Invitation link<input readOnly value={invite} aria-label="Invitation link" onFocus={e => e.target.select()} /></label>
      <div className="button-row mt-4">
        <GlassButton variant="primary" onClick={async () => { try { await navigator.clipboard.writeText(invite); setCopied(true); } catch { setError("Select and copy the invitation link."); } }}>{copied ? <Check size={15} /> : <Link2 size={15} />}{copied ? "Copied" : "Copy invitation"}</GlassButton>
        <GlassButton variant="danger" onClick={async () => { try { await roomAction({ action: "revoke-invite", invitationId: inviteId }); setInviteOpen(false); } catch (e) { setError(e instanceof Error ? e.message : "Unable to revoke."); } }}>Revoke link</GlassButton>
      </div>
      <div className="button-row mt-4"><a className="button button-glass" href={`https://wa.me/?text=${encodeURIComponent(`Join my CineChat screening: ${invite}`)}`} target="_blank" rel="noreferrer">WhatsApp</a><a className="button button-glass" href={`https://t.me/share/url?url=${encodeURIComponent(invite)}`} target="_blank" rel="noreferrer">Telegram</a><GlassButton onClick={async () => { try { if (navigator.share) await navigator.share({ title: room.title, url: invite }); else { await navigator.clipboard.writeText(invite); setCopied(true); } } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setError("Copy the invitation link to share it in your messaging app."); } }}>Share invitation</GlassButton></div>
      <GlassButton className="mt-4" disabled={!connected} onClick={async () => { if (room.playback.playing || await doControl("play", playback.current.position)) setInviteOpen(false); }}>Start Watching</GlassButton>
      <div className="invitation-list" aria-label="Existing invitations">{inviteRecords.map(item => <div key={item.id}><span>{item.uses}/{item.maxUses} guests · {item.revoked ? "Revoked" : new Date(item.expiresAt) <= new Date() ? "Expired" : <ScreeningTime value={item.expiresAt} />}</span>{!item.revoked && <GlassButton aria-label={`Revoke invitation ${item.id}`} onClick={async () => { try { await roomAction({ action: "revoke-invite", invitationId: item.id }); setInviteRecords(old => old.map(i => i.id === item.id ? { ...i, revoked: true } : i)); } catch (error) { setError(error instanceof Error ? error.message : "Unable to revoke invitation."); } }}>Revoke</GlassButton>}</div>)}</div>
    </GlassModal>}
    <GlassModal open={report !== false} onClose={() => setReport(false)} title={report ? "Report this message" : "Report this cinema"}>
      <form onSubmit={reportSubmit} className="form-stack"><label>Reason<select name="reason"><option value="harassment">Harassment or abuse</option><option value="spam">Spam</option><option value="unsafe">Unsafe content</option><option value="copyright">Copyright complaint</option><option value="other">Other</option></select></label><label>Details<textarea name="details" maxLength={2000} placeholder="Help moderators understand what happened." /></label><GlassButton variant="primary">Submit report</GlassButton></form>
    </GlassModal>
  </div>;
}
