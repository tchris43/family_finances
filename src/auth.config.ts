import type { NextAuthConfig } from "next-auth";

/** Ensure AUTH_URL is absolute — Vercel env often omits https:// */
function normalizeAuthUrl() {
  const raw = process.env.AUTH_URL?.trim();
  if (!raw) return;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return;
  process.env.AUTH_URL = `https://${raw}`;
}

normalizeAuthUrl();

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLogin = request.nextUrl.pathname.startsWith("/login");
      if (isLogin) return isLoggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.householdId = (user as { householdId?: string }).householdId;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.householdId = (token.householdId as string) ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
