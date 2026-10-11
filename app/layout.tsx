import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "スマブラ | teru-portal",
  description: "ファイターごとの対策と参考動画を管理する個人用ノート",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
