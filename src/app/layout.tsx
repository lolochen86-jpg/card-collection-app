import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NBA / MLB 賠率 Edge 分析",
  description: "台灣運彩 vs 國際盤口正期望值分析工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
