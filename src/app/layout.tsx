import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "공공기관 채용 트래커",
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
