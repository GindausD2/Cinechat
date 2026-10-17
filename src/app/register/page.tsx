import { AuthForm } from "@/components/auth-form";
import { safeReturnPath } from "@/lib/return-path";
export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) { return <AuthForm mode="register" returnTo={safeReturnPath((await searchParams).returnTo)} />; }
