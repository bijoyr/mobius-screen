import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Google sign-in is restricted to these emails (the owner). Broader access is
// granted via the shared demo credentials below (DEMO_USERNAME / DEMO_PASSWORD).
const ALLOWED_EMAILS = new Set([
  "bijoyr@gmail.com",
]);

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    // Shared demo login for invited users. Credentials come from env so they can
    // be rotated without a code change (defaults: Tintin / Mobius9).
    Credentials({
      id: "demo",
      name: "Demo access",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(creds) {
        const expectedUser = process.env.DEMO_USERNAME ?? "Tintin";
        const expectedPass = process.env.DEMO_PASSWORD ?? "Mobius9";
        if (
          typeof creds?.username === "string" &&
          typeof creds?.password === "string" &&
          creds.username === expectedUser &&
          creds.password === expectedPass
        ) {
          // Stable id → all demo users share one isolated data space.
          return {
            id: "demo-user",
            name: expectedUser,
            email: "demo@mobius-screen.app",
          };
        }
        return null;
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      // Demo credentials are already validated in authorize().
      if (account?.provider === "demo") return true;
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      return ALLOWED_EMAILS.has(email);
    },
    async jwt({ token, user, profile }) {
      if (profile?.sub) token.sub = profile.sub;
      if (user?.name) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
