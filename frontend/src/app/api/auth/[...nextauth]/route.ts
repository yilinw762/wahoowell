import NextAuth, { Account, NextAuthOptions, Profile, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://127.0.0.1:8000";

async function fetchBackendUserId(payload: {
  email?: string | null;
  name?: string | null;
}): Promise<number | undefined> {
  if (!payload.email) return undefined;

  try {
    const res = await fetch(`${API_BASE}/api/users/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        username: payload.name ?? payload.email.split("@")[0],
        password: "oauth-google",
      }),
    });

    if (!res.ok) {
      console.error("Failed to upsert backend user", await res.text());
      return undefined;
    }

    const data = (await res.json()) as { user_id?: number };
    return data.user_id;
  } catch (error) {
    console.error("Error talking to backend user upsert", error);
    return undefined;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch("http://localhost:8000/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });
        if (!res.ok) return null;
        const user = await res.json();
        return { id: user.user_id, name: user.username, email: credentials?.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({
      token,
      user,
      account,
      profile,
    }: {
      token: JWT;
      user?: User;
      account?: Account | null;
      profile?: Profile | null;
    }) {
      if (account?.provider === "google" && (user || profile)) {
        const backendId = await fetchBackendUserId({
          email: profile?.email ?? user?.email,
          name: profile?.name ?? user?.name ?? null,
        });
        if (backendId) {
          token.id = backendId;
          token.name = profile?.name ?? user?.name ?? null;
          return token;
        }
      }

      if (user) {
        token.id = (user as { id?: string | number }).id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (!session.user) {
        session.user = {};
      }
      (session.user as { id?: string | number; name?: string | null }).id = (token as { id?: string | number }).id;
      (session.user as { id?: string | number; name?: string | null }).name = (token as { name?: string | null }).name;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };