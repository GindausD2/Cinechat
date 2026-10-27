import { AuthForm } from "@/components/auth-form";
import { safeReturnPath } from "@/lib/return-path";
export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  return <AuthForm mode="login" google={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} returnTo={safeReturnPath((await searchParams).returnTo)} />;
}
