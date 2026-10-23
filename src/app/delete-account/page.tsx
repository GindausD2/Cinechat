import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { DeleteAccountForm } from "@/components/delete-account-form";
export const metadata = { title: "Confirm account deletion", robots: { index: false, follow: false } };
export default async function DeleteAccount({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
 const { token = "" } = await searchParams;
 const user = await currentUser();
 if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/delete-account?token=${token}`)}`);
 return <section className="page-container legal-copy"><span className="eyebrow">YOUR ACCOUNT. YOUR CHOICE.</span><h1>Confirm account deletion</h1>{/^[A-Za-z0-9_-]{43}$/.test(token) ? <DeleteAccountForm email={user.email} token={token} /> : <p role="alert">This link is invalid. Request a new link in account settings. Nothing has been deleted.</p>}</section>;
}
