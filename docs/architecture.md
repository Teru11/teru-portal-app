# アーキテクチャ設計書

## 1. 基本方針

本プロジェクトは、個人利用を前提とした管理系アプリケーションとして設計する。  
現時点ではローカル開発を優先し、将来的にクラウドへ移行できるように、責務の分離と設定管理を整理する。

---

## 2. 設計思想

### 2.1 シンプルさを優先する

* 1人開発を前提とし、過剰な抽象化を避ける
* 各機能を責務ごとに分離する
* 必要最小限のレイヤー構造を維持する

### 2.2 拡張性を残す

* 機能追加時に既存構造を壊しにくくする
* UI と API の責務を分離する
* API / Service / DB の境界を明確にする

---

## 3. 全体構成

```text
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # アプリ全体レイアウト
│   ├── page.tsx                      # ポータルトップ画面
│   └── api/                          # 機能ごとの Route Handlers
│       └── [feature]/                # 例: /api/sumabura/strategy-notes
│           └── route.ts
├── components/                       # UI コンポーネント
│   ├── layout/                       # Header / Sidebar 等
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── ui/                           # 共通ボタン・入力欄・カードなど
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   └── features/                     # 機能別UI
│       └── [feature]/
│           └── ...
├── services/                         # ビジネスロジック / DBアクセス層
│   ├── common/
│   └── [feature]/
│       ├── characterService.ts
│       └── strategyNoteService.ts
├── lib/                              # 共通ユーティリティ
│   ├── prisma.ts                     # Prisma Client
│   ├── api-client.ts                 # フロントエンド用 Fetch ラッパー
│   └── ...
├── types/                            # 共通型定義
├── hooks/                            # カスタムフック
├── utils/                            # 補助関数
├── constants/                        # 定数
├── schemas/                          # バリデーションなど
└── config/                           # 設定ファイル
```

---

## 4. レイヤー責務

### 4.1 UI 層

* 画面の表示と入力の受け取り
* API 呼び出しと結果表示
* 画面用の状態管理

対象:
* `components/layout/`
* `components/ui/`
* `components/features/`

### 4.2 API 層

* HTTP リクエストの受け取り
* 入力値の検証
* サービス層の呼び出し
* 共通レスポンス形式の返却

対象:
* `app/api/[feature]/route.ts`

### 4.3 Service 層

* ビジネスロジックの実装
* Prisma を使った DB アクセス
* UI と DB の橋渡し

対象:
* `services/[feature]/`

### 4.4 Data / DB 層

* Prisma の定義とマイグレーション
* DB との接続管理
* 論理削除や検索条件の統制

対象:
* `lib/prisma.ts`
* Prisma schema

---

## 5. 依存関係の方針

依存方向は以下を基本とする。

```text
UI → API → Service → Prisma / DB
```

* UI は DB に直接依存しない
* API は DB を直接扱わず、Service 層を経由する
* Service は UI の詳細を知らない
* 共通処理は lib と utils に集約する

---

## 6. 機能ごとの分割方針

機能は「ドメイン単位」で分割し、拡張しやすい構造を維持する。

例:

```text
services/
├── common/
├── management/
│   ├── noteService.ts
│   └── categoryService.ts
└── future-feature/
```

この設計により、将来的な管理機能追加でも既存コードを大きく壊しにくい。

---

## 7. UI 設計との整合性

[docs/ui-standard.md](docs/ui-standard.md) の構成と整合するよう、UI は次の階層を基本とする。

```text
src/components/
├── layout/
├── ui/
└── features/
```

* `layout/`: ヘッダー、サイドバーなどの構造要素
* `ui/`: 共通ボタンや入力などの最小部品
* `features/`: 各機能固有の画面コンポーネント

これにより、UI の責務がわかりやすく保守しやすい。

---

## 8. API 設計との整合性

[docs/api-standard.md](docs/api-standard.md) の設計方針と整合するよう、API は機能単位で分割する。

```text
src/app/api/
├── [feature]/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
```

また、Service 層も機能単位で切り分け、以下の関係を保つ。

```text
src/app/api/[feature]/route.ts
        ↓
services/[feature]/...
        ↓
Prisma / DB
```

これにより、API の命名規則、レスポンス形式、DB アクセスの責務が一致する。

---

## 9. 環境依存の扱い

ローカル環境で動かすことを前提としながら、将来クラウドへ展開できる構成を目指す。

* 環境変数で接続先や設定値を切り替える
* ハードコードを避ける
* `DATABASE_URL` などの外部設定を明示的に管理する

---

## 10. 運用方針

現時点では以下を優先する。

* 手元で動くこと
* 実用性と速度を重視すること
* 変更時に設計書と実装を同期させること

将来、クラウド環境へ展開する場合でも、ここで整理したレイヤー境界と設定管理の方針を活かす。

---

## 11. 結論

本アーキテクチャは、ローカル開発前提の小規模管理アプリである一方、UI 設計・API 設計・DB 設計の各方針と整合する構造を持つ。  
そのため、初期の開発しやすさと将来の拡張性を両立できる設計として整理されている。
