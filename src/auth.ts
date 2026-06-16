import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

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
    // Username/password login. Accounts come from env so they can be rotated
    // without a code change:
    //   • Shared demo (defaults Tintin / Mobius9) — pinned in wrangler.jsonc vars (public by design).
    //   • Owner "bijoyr" — password supplied ONLY via the BIJOYR_PASSWORD Worker secret
    //     (never committed); the account stays disabled until that secret is set.
    // New users request their own creds via the "Contact us" form, which emails the owner.
    Credentials({
      id: "demo",
      name: "Sign in",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(creds) {
        const user = typeof creds?.username === "string" ? creds.username.trim() : "";
        const pass = typeof creds?.password === "string" ? creds.password.trim() : "";
        if (!user || !pass) return null;

        const accounts = [
          {
            id: "demo-user", // stable id → all demo users share one isolated data space
            user: (process.env.DEMO_USERNAME ?? "Tintin").trim(),
            pass: (process.env.DEMO_PASSWORD ?? "Mobius9").trim(),
          },
          {
            id: "bijoyr", // owner — own data space, separate from the shared demo
            user: (process.env.BIJOYR_USERNAME ?? "bijoyr").trim(),
            pass: (process.env.BIJOYR_PASSWORD ?? "").trim(), // empty (no secret set) ⇒ disabled
          },
        ];

        const match = accounts.find((a) => a.pass && user === a.user && pass === a.pass);
        return match
          ? { id: match.id, name: match.user, email: `${match.id}@mobius-screen.app` }
          : null;
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.name) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
