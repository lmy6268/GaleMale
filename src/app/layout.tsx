import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: "갈래말래 - 프라이빗 장소 투표",
  description: "복잡한 과정 없이 친구들과 함께 약속 장소를 결정하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="min-h-full flex flex-col text-slate-900 bg-slate-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
