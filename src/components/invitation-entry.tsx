"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "./glass";
export function InvitationEntry() {
  const [error, setError] = useState(""); const router = useRouter();
  return <form className="invitation-entry" onSubmit={event => {
    event.preventDefault(); const value = String(new FormData(event.currentTarget).get("invitation") || "").trim();
    try {
      const url = new URL(value, location.origin);
      if (url.origin !== location.origin || !/^\/invite\/[A-Za-z0-9_-]{32,100}$/.test(url.pathname)) throw new Error();
      router.push(url.pathname);
    } catch { setError("Enter a valid CineChat invitation link."); }
  }}><label>Join with an invitation<input type="text" name="invitation" required placeholder="Paste your CineChat invitation link" autoComplete="off" /></label><GlassButton variant="primary">Open invitation</GlassButton>{error && <p role="alert" className="error-message">{error}</p>}</form>;
}
