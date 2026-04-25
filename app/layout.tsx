import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PATZ",
  description: "네일 예약을 가장 간편하게, PATZ.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/*
         * Pretendard variable font, dynamically subsetted so only the Korean
         * (and Latin) glyphs actually rendered on the page are downloaded.
         * Self-hosting via next/font/local is a Step-N optimization.
         */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-mobile bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
