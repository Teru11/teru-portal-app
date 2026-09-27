# teru-portal-app

## 概要
本プロジェクトは、日々の生活や趣味を管理しやすくするための「自分の管理系アプリ」

現時点では、ローカル環境で利用することを前提としている。クラウドデプロイや本番運用を強制するのではなく、まずは自分の手元で動く管理アプリを安定して作ることを重視する。

なお、現時点で最初に実装する機能ドメインはスマブラ関連の管理機能であるが、将来的には他の個人管理機能へ拡張していくことを前提としている。

## 技術スタック
* **Frontend / Framework:** Next.js (App Router), TypeScript
* **Styling:** Tailwind CSS
* **Database / ORM:** PostgreSQL, Prisma（予定）
* **App Structure:** Route Handlers / Server Actions を前提とした構成
* **Execution Model:** ローカル開発前提（現在の基本方針）

## 開発環境の起動手順
### 1. リポジトリのクローン
```sh
git clone git@github.com:Teru11/teru-portal-app.git
cd teru-portal-app
```

### 2. パッケージのインストール
```sh
pnpm install
```

### 3. 環境変数の設定
```sh
cp .env.example .env
```
必要に応じて、DB接続先やアプリ設定を `.env` に定義する。

### 4. 開発サーバーの起動
```sh
pnpm dev
```

## 課題管理
* 開発タスクや改善項目は Redmine または GitHub Issues 等で管理する
* 実装方針・設計変更は関連するドキュメントと同期して更新する

## ドキュメント
* [画面設計標準・デザインシステム設計書](ui-standard.md)
* [API設計標準書](api-standard.md)
* [データベース設計書](db-schema.md)
* [開発環境構築手順](setup-guide.md)
* [アーキテクチャ設計書](architecture.md)
* [テスト方針](testing-policy.md)
* [CI/CD 運用ガイドライン](ci-cd-guide.md)

## 参照
設計の詳細な方針は [アーキテクチャ設計書](architecture.md) を参照する。
本アプリでは、ローカル開発を前提にしつつ、将来的な拡張を見据えた構成を採用する。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.