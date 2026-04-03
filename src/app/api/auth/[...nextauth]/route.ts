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
      if (account?.provider === 'kakao' && profile) {
        const kakaoProfile = profile as any;
        try {
          await connectToDatabase();
          // 사용자 정보 업설트 (Update or Insert)
          await User.findOneAndUpdate(
            { kakaoUserId: user.id },
            { 
              kakaoUserId: user.id,
              email: kakaoProfile.kakao_account?.email || '',
              image: kakaoProfile.properties?.profile_image || ''
            },
            { upsert: true, returnDocument: 'after' }
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
        // @ts-expect-error
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
