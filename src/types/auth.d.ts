import "next-auth";
declare module "next-auth" {
  interface User { authVersion?: number }
  interface Session { user: { id: string; authVersion: number } & import("next-auth").DefaultSession["user"] }
}
declare module "next-auth/jwt" {
  interface JWT { id?: string; authVersion?: number }
}
