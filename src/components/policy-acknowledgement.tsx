"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { GlassButton } from "./glass";
export function PolicyAcknowledgement({ returnTo }: { returnTo?: string }) {
 const router = useRouter();
 const [error, setError] = useState(""), [saved, setSaved] = useState(false), [busy, setBusy] = useState(false);
 async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
  try {
   const response = await fetch("/api/account/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptTerms: form.get("acceptTerms") === "on", acknowledgePrivacy: form.get("acknowledgePrivacy") === "on", ageEligible: form.get("ageEligible") === "on" }) });
   const data = await response.json(); if (!response.ok) throw new Error(data.error); setSaved(true); if (returnTo) { router.push(returnTo); router.refresh(); }
  } catch (e) { setError(e instanceof Error ? e.message : "Unable to save your acknowledgement."); } finally { setBusy(false); }
 }
 return saved ? <p role="status">Your terms acceptance and privacy acknowledgement were recorded.</p> : <form onSubmit={submit} className="form-stack"><p>Review the current policies. Acknowledgement does not enable optional tracking or marketing.</p><label className="checkbox consent-checkbox"><span>I accept the <Link href="/legal/terms">Terms of Service</Link>.</span><input type="checkbox" name="acceptTerms" required /></label><label className="checkbox consent-checkbox"><span>I have read the <Link href="/legal/privacy">Privacy Policy</Link>.</span><input type="checkbox" name="acknowledgePrivacy" required /></label><label className="checkbox consent-checkbox"><span>I meet the age and permission requirements where I live. <Link href="/legal/safety">Safety information</Link></span><input type="checkbox" name="ageEligible" required /></label>{error && <p role="alert" className="error-message">{error}</p>}<GlassButton disabled={busy}>Save acknowledgement</GlassButton></form>;
}
