import { AuthForm } from "@/components/auth-form";
export default function Page() { return <AuthForm mode="login" google={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />; }
