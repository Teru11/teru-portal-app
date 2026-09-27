# CI/CD 運用ガイドライン

## 1. 基本方針

* **プラットフォーム:** GitHub Actions を利用する
* **開発フロー:** GitHub Flow を基本とし、機能ごとにブランチを切って開発する
* **対象ブランチ:**
  * `main`: 安定版の保護ブランチ
  * `feature/*` または `fix/*`: 作業用ブランチ
* **パッケージマネージャー:** `pnpm`
* **実行前提:** 現時点ではローカル開発を主軸とし、クラウドデプロイを無理に導入しない
* **目的:**
  * 品質チェックの自動化
  * 型エラー・ビルドエラーの早期発見
  * 将来のデプロイ準備を整える

> 本プロジェクトでは GitHub Actions を「コード品質の担保と変更管理のための仕組み」として利用する。開発はローカル前提が中心であり、クラウドデプロイは現時点では必須ではない。

---

## 2. ワークフロー概要

```text
[ feature / fix ブランチ ]
        │
        ├─ Push / PR 作成 ──► CI Workflow
        │                       ├─ 1. pnpm install
        │                       ├─ 2. Prisma Client generate
        │                       ├─ 3. Type Check
        │                       ├─ 4. Lint
        │                       └─ 5. Build Check
        │
        └─ マージ後 ───────► 変更確認 / 次の作業へ進行
                                ├─ 1. 変更内容のレビュー
                                └─ 2. ローカルまたは将来拡張時のデプロイ準備
```

---

## 3. CI の実行方針

CI は PR 作成時および `main` ブランチへの push 時に実行する。  
すべてのチェックが通過しない場合、マージを防止し、品質を維持する。

### 3.1 実行対象

* Node.js 22
* pnpm
* Prisma Client の生成
* TypeScript 型チェック
* ESLint による静的解析
* Next.js の production build

### 3.2 実行順序

1. リポジトリの取得
2. Node.js と pnpm のセットアップ
3. 依存関係のインストール
4. Prisma Client の生成
5. `tsc --noEmit` による型チェック
6. `next lint` による静的解析
7. `next build` によるビルド検証

---

## 4. CD の実行方針

現時点では、クラウドへ自動デプロイすることを目的とせず、GitHub 上での変更管理と品質確認を中心に扱う。  
将来的にデプロイが必要になった場合にのみ、CD を追加する方針とする。

### 4.1 想定フロー

1. `main` へマージ
2. GitHub Actions で検証を実行
3. 変更内容を確認
4. 必要に応じてローカル実行または将来のデプロイ準備へ進む

### 4.2 将来検討対象

* Vercel
* Docker ベースの VPS / EC2
* その他のホスティング環境

> 現段階ではローカル実行が主目的のため、クラウドデプロイは無理に導入しない。

---

## 5. GitHub Actions の基本例

以下は、CI 用の最小構成例である。

```yaml
name: CI Workflow

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-typecheck-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma Client
        run: pnpm exec prisma generate

      - name: Type Check
        run: pnpm exec tsc --noEmit

      - name: Lint Check
        run: pnpm lint

      - name: Build Test
        run: pnpm build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 6. package.json のスクリプト定義

CI 上で実行するコマンドは、`package.json` に統一する。

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "prisma:generate": "prisma generate"
  }
}
```

---

## 7. 運用ルール

* `main` に直接 push しない
* PR を作成してレビューを通す
* CI が通過しないコードはマージしない
* DB 変更がある場合は、Prisma マイグレーションを必ず明示する
* 環境変数は `GitHub Secrets` で管理し、ソースコードに直接埋め込まない
* 本番デプロイ前には、少なくともビルドと型チェックが成功していることを確認する

---

## 8. 今後の拡張方針

ローカル開発が安定してから、必要に応じて以下を検討する。

* `deploy-dev.yml`: 開発環境向け自動デプロイ
* `deploy-prod.yml`: 本番環境向けデプロイ
* `prisma-migrate.yml`: DB マイグレーション専用ジョブ
* `security-scan.yml`: 脆弱性や依存関係の監査

現時点では、GitHub での品質確認と変更管理を重視し、クラウドデプロイは段階的に導入する。