"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Film } from "lucide-react";
import { GlassButton } from "./glass";
export function AuthForm({ mode, google = false, token = "" }: { mode: "login" | "register" | "forgot" | "reset" | "verify"; google?: boolean; token?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const title = { login: "Your seat is waiting.", register: "Great films. Better company.", forgot: "Let’s get you back in.", reset: "A fresh start.", verify: "Confirm your email." }[mode];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "login") {
        const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
        if (result?.error) throw new Error("Sign-in failed. Check your password and verify your email first.");
        router.push("/"); router.refresh();
      } else {
        const endpoint = mode === "register" ? "/api/register" : "/api/account/email";
        const body = mode === "register" ? data : mode === "forgot" ? { action: "request-reset", email: data.email } : { action: mode, token, ...data };
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setMessage(result.message); setSuccess(true);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to connect."); }
    finally { setBusy(false); }
  }
  return <div className="auth-layout"><div className="auth-story"><span className="eyebrow">THE WORLD IS YOUR CINEMA</span><h1>Every film.<br />A shared<br /><em>feeling.</em></h1><p>Find your people, press play, and make a night of it.</p><div className="auth-orbit"><Film size={100} strokeWidth={0.7} /></div><span className="muted">Independent films. Open minds. Together.</span></div>
    <section className="auth-card glass"><span className="eyebrow">WELCOME TO CINECHAT</span><h2>{title}</h2><p className="muted">{mode === "register" ? "Join a community that lives for the movies." : mode === "verify" ? "Verify your account to take your first seat." : "The next movie night starts here."}</p>
      <form onSubmit={submit} className="form-stack">
        {mode === "register" && <><label>Username<input name="username" required minLength={3} maxLength={24} autoComplete="username" placeholder="your_screen_name" /></label><label>Date of birth<input name="birthDate" type="date" required /><small>Used for age restrictions. Never displayed on your profile.</small></label></>}
        {["login", "register", "forgot"].includes(mode) && <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>}
        {["login", "register", "reset"].includes(mode) && <label>Password<input name="password" type="password" required minLength={mode === "login" ? 1 : 12} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Your password" : "At least 12 characters"} /></label>}
        {message && <p role="status" className={success ? "success-message" : "error-message"}>{message}</p>}
        <GlassButton variant="primary" disabled={busy || success}>{busy ? "One moment…" : { login: "Sign in", register: "Create account", forgot: "Send reset link", reset: "Update password", verify: "Verify email" }[mode]}<ArrowRight size={17} /></GlassButton>
      </form>
      {mode === "login" && <><Link className="subtle-link" href="/forgot-password">Forgot your password?</Link>{google && <GlassButton onClick={() => signIn("google", { callbackUrl: "/settings" })}>Continue with Google</GlassButton>}<p className="muted">New here? <Link href="/register">Create an account</Link></p><Link className="subtle-link" href="/resend-verification">Resend verification email</Link></>}
      {mode !== "login" && <Link className="subtle-link" href="/login">Back to sign in</Link>}
      {mode === "register" && <small className="muted">By joining, you agree to our <Link href="/legal">community guidelines and privacy terms</Link>. Ages 13 and up.</small>}
    </section></div>;
}
