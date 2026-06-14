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
    // Shared demo login. Credentials come from env so they can be rotated without
    // a code change (defaults: Tintin / Mobius9). New users request their own via
    // the "Contact us for login details" form, which emails the owner.
    Credentials({
      id: "demo",
      name: "Demo access",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(creds) {
        const expectedUser = (process.env.DEMO_USERNAME ?? "Tintin").trim();
        const expectedPass = (process.env.DEMO_PASSWORD ?? "Mobius9").trim();
        const user = typeof creds?.username === "string" ? creds.username.trim() : "";
        const pass = typeof creds?.password === "string" ? creds.password.trim() : "";
        if (user && pass && user === expectedUser && pass === expectedPass) {
          // Stable id → all demo users share one isolated data space.
          return { id: "demo-user", name: expectedUser, email: "demo@mobius-screen.app" };
        }
        return null;
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
