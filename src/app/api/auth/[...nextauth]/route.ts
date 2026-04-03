import NextAuth, { NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";

import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'kakao') {
        try {
          await connectToDatabase();
          const kakaoId = user.id;
          const nickname = user.name || "익명";
          const image = user.image || "";

          // 사용자 정보 업설트 (Update or Insert)
          await User.findOneAndUpdate(
            { kakaoUserId: kakaoId },
            { 
              kakaoUserId: kakaoId, 
              nickname, 
              image 
            },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error("User sync error:", err);
        }
      }
      return true;
    },
    async jwt({ token, user, profile }) {
      if (user) {
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
