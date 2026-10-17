"use client";
import { useState } from "react";
import { GlassButton } from "./glass";
export function ResendVerification() { const [message, setMessage] = useState(""); return <form className="form-stack glass-card" onSubmit={async e => { e.preventDefault(); const email = new FormData(e.currentTarget).get("email"); const response = await fetch("/api/account/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resend-verification", email }) }); const data = await response.json(); setMessage(data.message || data.error); }}><label>Email<input name="email" type="email" required /></label>{message && <p role="status">{message}</p>}<GlassButton variant="primary">Send verification link</GlassButton></form>; }
