import type { Metadata } from "next";
import "./globals.css";

/** ブラウザーのタイトルと検索結果に使うアプリ共通情報です。 */
export const metadata: Metadata = {
  title: "スマブラ | teru-portal",
  description: "ファイターごとの対策と参考動画を管理する個人用ノート",
};

/**
 * 全ページに日本語のルート要素と共通メタデータを適用します。
 * @param {LayoutProps<"/">} props 各ページから渡されるコンテンツ
 * @returns {import("react").JSX.Element} アプリ共通のHTMLレイアウト
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
