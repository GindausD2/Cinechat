import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { hashToken } from "@/lib/security";
import { passwordSchema } from "@/lib/validation";
import { requiredSecret } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: requiredSecret("AUTH_SECRET"),
  adapter: {
    ...PrismaAdapter(db),
    // Sign-in uses provider identity only; CineChat never calls Google APIs.
    // Avoid retaining Google access/refresh/ID tokens or unnecessary scopes.
    async linkAccount(account) {
      const { userId, type, provider, providerAccountId } = account;
      await db.account.create({ data: { userId, type, provider, providerAccountId } });
    }
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.id) {
        await db.user.updateMany({ where: { id: message.token.id as string }, data: { authVersion: { increment: 1 } } });
        await db.realtimeTicket.deleteMany({ where: { userId: message.token.id as string } });
      }
    }
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = z.object({ email: z.email(), password: passwordSchema }).safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        await rateLimit(`login:${hashToken(email)}`, 12, 900);
        await rateLimit("login:global", 1000, 60);
        const user = await db.user.findUnique({ where: { email } });
        const valid = await compare(parsed.data.password, user?.passwordHash || "$2b$12$uNAgafWa/xHL/XCDrMgV4OgTQIo5Utg1SEy70RIiNTVbg1v0VBKf2");
        if (!user || !valid || !user.emailVerified || user.suspended) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image, authVersion: user.authVersion };
      }
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })] : [])
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && !profile?.email_verified) return false;
      if (!user.id) return false;
      const existing = await db.user.findUnique({ where: { id: user.id } });
      return !existing?.suspended;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const row = await db.user.findUnique({ where: { id: user.id } });
        token.id = user.id;
        token.authVersion = row?.authVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.authVersion = token.authVersion as number;
      }
      return session;
    }
  }
}));
