"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { GlassButton } from "./glass";
export function DeletionConsequences() {
  return <><p>This permanently removes your profile, watchlists/history, messages, reactions, social connections, membership grants and account credentials. Your theaters and clubs are removed, including messages and memberships other people added there.</p><p>Download your account data first if you want a copy. Copies already received by others and external infrastructure backups/logs need separate handling as explained in the <Link href="/legal/privacy">Privacy Policy</Link>. There is no fee or subscription to cancel.</p></>;
}
export function DeleteAccountForm({ email, hasPassword = false, token }: { email: string; hasPassword?: boolean; token?: string }) {
  const [useEmail, setUseEmail] = useState(!hasPassword), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const emailRequest = !token && useEmail;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(emailRequest ? "/api/account/deletion" : "/api/account", { method: emailRequest ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmEmail: form.get("confirmEmail"), ...(token ? { token } : { password: form.get("password") || undefined }) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (data.deleted) { await signOut({ redirect: false }); window.location.assign("/account-deleted"); }
      else setMessage(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to confirm deletion. Your account has not been deleted."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form-stack"><DeletionConsequences />
    <label>Confirm your email<input name="confirmEmail" type="email" autoComplete="email" placeholder={email} required /></label>
    {!emailRequest && !token && <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>}
    {emailRequest && <p className="muted">An email link expires in 15 minutes and must be confirmed while signed in to this account. Requesting a link does not delete anything.</p>}
    {error && <p role="alert" className="error-message">{error}</p>}{message && <p role="status" className="success-message">{message}</p>}
    <GlassButton variant={emailRequest ? "glass" : "danger"} disabled={busy || Boolean(message)}>{busy ? "One moment…" : emailRequest ? "Email deletion confirmation" : "Permanently delete account"}</GlassButton>
    {!token && hasPassword && <GlassButton type="button" onClick={() => { setUseEmail(!useEmail); setError(""); setMessage(""); }}>{useEmail ? "Use my password instead" : "Use email confirmation instead"}</GlassButton>}
  </form>;
}
