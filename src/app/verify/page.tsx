import { AuthForm } from "@/components/auth-form";
import { safeReturnPath } from "@/lib/return-path";
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; returnTo?: string }> }) { const { token, returnTo } = await searchParams; return <AuthForm mode="verify" token={token} returnTo={safeReturnPath(returnTo)} />; }
