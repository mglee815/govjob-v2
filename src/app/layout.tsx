import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

// 이 앱은 "오늘 날짜" 기준으로 캘린더·마감일 D-day 등을 계산하는데, 정적 캐싱된 페이지를 그대로
// 재사용하면 캐시가 만들어진 시점(서버 UTC 기준)의 날짜가 굳어서 표시될 수 있음 -> 매 요청마다 새로 렌더링
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "govjob-tracker",
  description: "공공기관 채용 공고를 한눈에 관리하세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} h-full`}>
      <body className="min-h-full antialiased" style={{ background: "#F7FAFC" }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
