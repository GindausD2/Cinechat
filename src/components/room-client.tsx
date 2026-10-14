"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Users, Send, MessageSquare, X, Link2, LogOut, Flag, Lock, Radio, Shield, Check, MicOff } from "lucide-react";
import { backdropFor, filmAttribution } from "@/lib/artwork";
import type { roomSnapshot } from "@/lib/rooms";
import { CinemaPlayer, type ClientPlayback } from "./cinema-player";
import { GlassButton, GlassChatPanel, GlassModal } from "./glass";
import { ReminderButton } from "./reminder-button";
import { Avatar } from "./avatar";
import { TheaterReactions } from "./theater-reactions";
import { REACTION_LIFETIME_MS, THEATER_REACTIONS } from "@/lib/reactions";
type RoomData = Awaited<ReturnType<typeof roomSnapshot>>;
type Message = RoomData["messages"][number];
type Ack = { ok: boolean; data?: unknown; error?: string; status?: number };
type Reaction = { id: string; emoji: string; userId: string; messageId: string | null; expiresAt: number };
export function RoomClient({ initial, viewerId }: { initial: RoomData; viewerId: string }) {
  const [room, setRoom] = useState(initial), [connected, setConnected] = useState(false), [messages, setMessages] = useState(initial.visibility === "PRIVATE" ? initial.messages : []), [text, setText] = useState(""), [error, setError] = useState(""), [chatOpen, setChatOpen] = useState(true), [tab, setTab] = useState("chat"), [inviteOpen, setInviteOpen] = useState(false), [viewersOpen, setViewersOpen] = useState(false), [invite, setInvite] = useState(""), [inviteId, setInviteId] = useState(""), [copied, setCopied] = useState(false), [online, setOnline] = useState<string[]>([]), [reactions, setReactions] = useState<Reaction[]>([]), [report, setReport] = useState<string | null | false>(false), [removed, setRemoved] = useState(""), [clockOffset, setClockOffset] = useState(0);
  const socket = useRef<Socket | null>(null), playback = useRef(initial.playback), end = useRef<HTMLDivElement>(null); const router = useRouter(); const host = initial.hostId === viewerId;
  const privateTheater = room.visibility === "PRIVATE";
  const updatePlayback = (next: ClientPlayback) => { if (next.version < playback.current.version) return; playback.current = next; setRoom(old => ({ ...old, playback: next })); };
  useEffect(() => {
    let disposed = false; let connection: Socket | null = null;
    async function connect() {
      try {
        const response = await fetch("/api/realtime-ticket", { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (disposed) return;
        connection = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", { auth: { ticket: data.ticket }, transports: ["websocket"], reconnectionDelay: 1000, reconnectionDelayMax: 5000 }); socket.current = connection;
        connection.on("connect", () => { setConnected(true); setError(""); connection?.emit("join", { roomId: initial.id }, (ack: Ack) => { if (!ack.ok) setError(ack.error || "Unable to join."); }); });
        connection.on("disconnect", () => setConnected(false)); connection.on("connect_error", () => { setConnected(false); setError("Reconnecting to your cinema…"); });
        connection.on("state", (data: RoomData) => { setRoom(data); playback.current = data.playback; setMessages(data.visibility === "PRIVATE" ? data.messages : []); });
        connection.on("playback", updatePlayback);
        connection.on("presence", (ids: string[]) => setOnline(ids));
        if (initial.visibility === "PRIVATE") connection.on("message", (message: Message) => setMessages(old => old.some(m => m.id === message.id) ? old : [...old.slice(-99), message]));
        connection.on("reaction", (reaction: Reaction) => {
          if (!THEATER_REACTIONS.some(emoji => emoji === reaction.emoji) || (initial.visibility === "PUBLIC" && reaction.messageId)) return;
          const now = Date.now();
          setReactions(old => old.some(r => r.id === reaction.id) ? old : [...old.filter(r => r.messageId || r.expiresAt > now).slice(-49), { ...reaction, expiresAt: now + REACTION_LIFETIME_MS }]);
        });
        connection.on("removed", ({ reason }: { reason: string }) => { setRemoved(reason); connection?.disconnect(); });
      } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : "Unable to connect."); }
    }
    void connect();
    const sync = setInterval(() => { const started = Date.now(); connection?.emit("sync", {}, (ack: Ack) => { if (ack.ok && ack.data) { const state = ack.data as ClientPlayback; setClockOffset(state.serverTime - (started + Date.now()) / 2); updatePlayback(state); } }); }, 10000);
    const renew = setInterval(() => { void (async () => { const response = await fetch("/api/realtime-ticket", { method: "POST" }); const data = await response.json(); if (response.ok && connection) { connection.auth = { ticket: data.ticket }; connection.disconnect().connect(); } })().catch(() => {}); }, 2700000);
    return () => { disposed = true; clearInterval(sync); clearInterval(renew); connection?.disconnect(); socket.current = null; };
    // A room owns one connection; all live state arrives through socket events.
  }, [initial.id, initial.visibility]);
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
  async function doControl(action: "play" | "pause" | "seek", position?: number) { try { const state = await emit("playback", { action, position, expectedVersion: playback.current.version }) as ClientPlayback; updatePlayback(state); } catch (e) { setError(e instanceof Error ? e.message : "Playback failed."); } }
  async function send(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); try { await emit("message", { body: text }); setText(""); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Message not sent."); } }
  async function react(emoji: string, messageId?: string) { try { await emit("reaction", { emoji, messageId }); } catch (e) { setError(e instanceof Error ? e.message : "Reaction not sent."); } }
  async function makeInvite() { try { const data = await roomAction({ action: "invite", maxUses: 1 }); setInvite(data.url); setInviteId(data.id); setInviteOpen(true); setCopied(false); } catch (e) { setError(e instanceof Error ? e.message : "Invitation failed."); } }
  async function moderate(targetId: string, command: string) { try { await roomAction({ action: "moderate", targetId, command }); } catch (e) { setError(e instanceof Error ? e.message : "Moderation failed."); } }
  async function block(targetId: string) { try { const r = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "block", targetId }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setMessages(old => old.filter(m => m.userId !== targetId)); setRoom(old => ({ ...old, participants: old.participants.filter(p => p.id !== targetId) })); } catch (e) { setError(e instanceof Error ? e.message : "Unable to block."); } }
  async function reportSubmit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); try { const data = Object.fromEntries(new FormData(event.currentTarget)); const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: room.id, messageId: report || undefined, ...data }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setReport(false); setError("Report submitted for review."); } catch (e) { setError(e instanceof Error ? e.message : "Report failed."); } }
  if (removed) return <div className="empty-state"><h1>Intermission.</h1><p>{removed}</p><Link href="/cinemas" className="button button-primary">Back to cinemas</Link></div>;
  const participantList = <div className="participants">
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
        <div className="cinema-status"><span className="pill">{privateTheater ? <Lock size={11} /> : <Radio size={11} />}{privateTheater ? "PRIVATE THEATER · VIP" : "PUBLIC THEATER"}</span><span className={connected ? "connection-good" : "muted"}>{connected ? "● Live & synchronized" : "○ Connecting…"}</span></div>
        <h1>{room.title}</h1>
        <p>{room.movie.title} <span>·</span> <span className="viewer-count" data-testid="live-viewer-count">{online.length} watching</span> <span>·</span> {room.capacity} seats</p>
      </div>
      <div className="button-row">
        {privateTheater && host && <GlassButton variant="primary" onClick={makeInvite}><Link2 size={15} />Invite</GlassButton>}
        {privateTheater && <GlassButton onClick={() => setChatOpen(!chatOpen)} aria-label={chatOpen ? "Collapse chat" : "Open chat"} aria-expanded={chatOpen}><MessageSquare size={15} /></GlassButton>}
        {(!privateTheater || !chatOpen) && <GlassButton onClick={() => setViewersOpen(true)} aria-label="Viewers" aria-haspopup="dialog"><Users size={15} />Viewers</GlassButton>}
        <GlassButton onClick={async () => { try { await roomAction({ action: "leave" }); router.push("/cinemas"); } catch (e) { setError(e instanceof Error ? e.message : "Unable to leave."); } }}><LogOut size={15} />Leave</GlassButton>
      </div>
    </div>
    {room.scheduledAt && <div className="glass-card mb-6"><p className="muted">Scheduled for {new Date(room.scheduledAt).toLocaleString()}.</p><ReminderButton roomId={room.id} /></div>}
    {error && <p role="status" className="error-message cinema-notice">{error}</p>}
    <div className={`cinema-layout ${privateTheater && chatOpen ? "" : "chat-collapsed"}`}>
      <div>
        <CinemaPlayer media={room.media} playback={room.playback} canControl={host && connected} onControl={doControl} movieId={room.movie.id} clockOffset={clockOffset} poster={backdropFor(room.movie)}>
          <TheaterReactions connected={connected} reactions={reactions.filter(r => !r.messageId)} onReaction={react} />
        </CinemaPlayer>
        <div className="cinema-film-info">
          <div><span className="eyebrow">NOW SHOWING</span><h2>{room.movie.title}</h2><p className="muted">{room.description || (privateTheater ? "A screening reserved for your invited guests." : "Enjoy the film. Share the moment with a reaction.")}</p></div>
          <div className="button-row">
            <GlassButton aria-label="Report room" onClick={() => setReport(null)}><Flag size={14} />Report</GlassButton>
            {host && <GlassButton variant="danger" onClick={async () => { try { await roomAction({ action: "end" }); router.push("/cinemas"); } catch (e) { setError(e instanceof Error ? e.message : "Unable to end."); } }}>End screening</GlassButton>}
          </div>
        </div>
        <p className="rights-note"><small>{filmAttribution(room.media.attribution)} <a href={room.media.rightsUrl} target="_blank" rel="noreferrer">{room.media.license}</a></small></p>
      </div>
      {privateTheater && chatOpen && <GlassChatPanel>
        <div className="chat-header"><div><h2>Screening chat</h2><span><span className="live-dot" /> {online.length} here with you</span></div><button className="icon-button" aria-label="Close chat" onClick={() => setChatOpen(false)}><X size={17} /></button></div>
        <div className="chat-tabs"><button className={tab === "chat" ? "active" : ""} aria-pressed={tab === "chat"} onClick={() => setTab("chat")}>Chat</button><button className={tab === "people" ? "active" : ""} aria-pressed={tab === "people"} onClick={() => setTab("people")}><Users size={12} />People ({room.participants.length})</button></div>
        {tab === "chat" ? <>
          <div className="chat-messages">
            {!messages.length && <div className="chat-welcome"><MessageSquare size={23} /><h3>Your guests. Your conversation.</h3><p>Only members of this private theater can read these messages.</p></div>}
            {messages.map(m => <article className="chat-message" key={m.id}>
              <Avatar name={m.name} image={m.image} />
              <div>
                <div className="message-top"><strong>{m.name}</strong>{m.userId === room.hostId && <Shield size={10} />}<time>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><button aria-label={`Report message by ${m.name}`} onClick={() => setReport(m.id)}><Flag size={10} /></button></div>
                <p>{m.body}</p><button className="message-react" aria-label={`Like message by ${m.name}`} onClick={() => react("❤️", m.id)}>♡{reactions.filter(r => r.messageId === m.id).length || ""}</button>
              </div>
            </article>)}
            <div ref={end} />
          </div>
          <form className="chat-compose" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Share a thought…" aria-label="Chat message" disabled={!connected} /><button aria-label="Send message" disabled={!text.trim() || !connected}><Send size={16} /></button></form>
          <p className="chat-guideline">A private conversation. Keep it kind.</p>
        </> : participantList}
      </GlassChatPanel>}
    </div>
    <GlassModal open={viewersOpen} onClose={() => setViewersOpen(false)} title="Theater viewers">
      <p className="muted">{online.length} watching · {room.capacity} seats{host ? ". Manage participants below." : "."}</p>{viewersOpen && participantList}
    </GlassModal>
    {privateTheater && <GlassModal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Save someone a seat.">
      <p className="muted">This invitation is valid for one guest for 24 hours. Share any room code separately.</p>
      <label>Invitation link<input readOnly value={invite} aria-label="Invitation link" onFocus={e => e.target.select()} /></label>
      <div className="button-row mt-4">
        <GlassButton variant="primary" onClick={async () => { try { await navigator.clipboard.writeText(invite); setCopied(true); } catch { setError("Select and copy the invitation link."); } }}>{copied ? <Check size={15} /> : <Link2 size={15} />}{copied ? "Copied" : "Copy invitation"}</GlassButton>
        <GlassButton variant="danger" onClick={async () => { try { await roomAction({ action: "revoke-invite", invitationId: inviteId }); setInviteOpen(false); } catch (e) { setError(e instanceof Error ? e.message : "Unable to revoke."); } }}>Revoke link</GlassButton>
      </div>
    </GlassModal>}
    <GlassModal open={report !== false} onClose={() => setReport(false)} title={report ? "Report this message" : "Report this cinema"}>
      <form onSubmit={reportSubmit} className="form-stack"><label>Reason<select name="reason"><option value="harassment">Harassment or abuse</option><option value="spam">Spam</option><option value="unsafe">Unsafe content</option><option value="copyright">Copyright complaint</option><option value="other">Other</option></select></label><label>Details<textarea name="details" maxLength={2000} placeholder="Help moderators understand what happened." /></label><GlassButton variant="primary">Submit report</GlassButton></form>
    </GlassModal>
  </div>;
}
