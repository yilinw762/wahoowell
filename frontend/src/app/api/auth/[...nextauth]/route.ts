// ...existing code...
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    signIn: async ({ user, account, profile, isNewUser }) => {
      try {
        await fetch(`${process.env.BACKEND_URL}/api/users/upsert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user?.email,
            name: user?.name,
            image: user?.image,
            provider: account?.provider,
            providerAccountId: account?.providerAccountId,
            isNewUser,
          }),
        });
      } catch (err) {
        console.error("Upsert user to backend failed:", err);
      }
    },
  },
});
// ...existing code...
export { handler as GET, handler as POST };