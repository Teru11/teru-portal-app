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

## Getting Started

### 1. リポジトリをクローン
```sh
git clone git@github.com:Teru11/teru-portal-app.git
cd teru-portal-app
```

### 2. 依存パッケージをインストール
```sh
pnpm install
```

### 3. 開発サーバーを起動
```sh
pnpm dev
```

ブラウザーで [http://localhost:3000](http://localhost:3000) を開く。

## 課題管理
* 開発タスクや改善項目は Redmine または GitHub Issues 等で管理する
* 実装方針・設計変更は関連するドキュメントと同期して更新する

## ドキュメント
* [画面設計標準・デザインシステム設計書](docs/ui-standard.md)
* [API設計標準書](docs/api-standard.md)
* [データベース設計書](docs/db-schema.md)
* [開発環境構築手順](docs/setup-guide.md)
* [アーキテクチャ設計書](docs/architecture.md)
* [テスト方針](docs/testing-policy.md)
* [CI/CD 運用ガイドライン](docs/ci-cd-guide.md)