import type { NextAuthConfig } from "next-auth";

/** Edge-safe Auth.js settings for middleware. */
export const authConfig = {
  trustHost: true,
  providers: [],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user.id as string) || "";
        token.role = (user as { role?: string }).role || "CUSTOMER";
        token.phone = (user as { phone?: string | null }).phone ?? null;
        token.status = (user as { status?: string }).status || "active";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
