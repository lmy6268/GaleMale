import NextAuth, { NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        console.log("== KAKAO LOGIN USER INFO ==");
        console.log("User:", user);
        console.log("Profile:", profile);
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/', 
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
