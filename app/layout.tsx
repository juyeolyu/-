import type { Metadata } from "next";
import "./globals.css";
import FirebaseAnalytics from "@/components/FirebaseAnalytics";

export const metadata: Metadata = {
  title: "이음랜트리 EUMLANTREE — 상업공간 네트워크 구축",
  description: "상업공간 네트워크 구축, 컨설팅, 시공 전문 이음랜트리. 유무선 랜공사, 장비 이설, 배선 정리와 유지보수를 지원합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
