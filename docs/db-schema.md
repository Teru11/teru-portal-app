# データベース設計書

## 環境情報
* **PostgreSQL バージョン:** 15.4
* **データベース名:** `teru-portal`

## スキーマ定義
* **`public`**: ポータル全体の共通管理用（将来的な共通設定、共通ユーザー情報など）
* **`sumabura`**: スマブラツール専用データ

## 全体制約・運用方針
* **外部キー（FK）制御:** アプリケーション側（Next.js / Prisma 等）でリレーションを担保し、DBレベルでの物理 FK 制約（`FOREIGN KEY`）は設定しない。
* **削除方針:** 論理削除を採用し、データ復元を可能とする。
* **検証・テスト運用:** 常設のテストスキーマは設けない。テストが必要な場合は本番スキーマからコピーして `test_` プレフィックス付きスキーマ（例: `test_sumabura`）を作成し、検証完了後に即時削除する。

---

## テーブル構造（`sumabura` スキーマ）

### 1. `sumabura.characters` (ファイターマスター)
全ファイターの基本情報を保持するマスターテーブルです。

| 物理名 | 論理名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | ファイターID | INTEGER | PRIMARY KEY | ソート・画像ファイル参照キー（例: `1`, `2`, `3`） |
| `name` | ファイター名 | VARCHAR(30) | NOT NULL | 画面表示名（例: `'マリオ'`, `'ドンキーコング'`） |
| `nickname` | 略称名 | VARCHAR(20) | NOT NULL | 検索用略称（例: `'マリオ'`, `'DK'`） |
| `note` | 説明 | TEXT | NULL | 全体的なコンボ・固有対策ノート（改行可） |

---

### 2. `sumabura.user_characters` (使用キャラ管理)
プレイヤーが使用するメインキャラ・サブキャラの登録テーブルです。

| 物理名 | 論理名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | ID | SERIAL | PRIMARY KEY | 一意の識別子 |
| `character_id` | ファイターID | INTEGER | NOT NULL | 使用キャラのID（`characters.id` 参照） |
| `is_deleted` | 削除フラグ | BOOLEAN | DEFAULT FALSE | 論理削除フラグ（`FALSE`: 有効, `TRUE`: 削除済み） |

---

### 3. `sumabura.strategy_notes` (対策メモ)
「自分の使用キャラ × 対策対象キャラ」ごとの対策メモおよび参考動画URLを記録するテーブルです。

| 物理名 | 論理名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | ID | SERIAL | PRIMARY KEY | 一意の識別子 |
| `my_character_id` | 自キャラID | INTEGER | NOT NULL | 自分の使用キャラID（`characters.id` 参照） |
| `target_character_id` | 対策対象キャラID | INTEGER | NOT NULL | 対策対象のキャラID（`characters.id` 参照） |
| `content` | 対策内容 | TEXT | NOT NULL | 対策メモ（プレーンテキスト） |
| `youtube_url` | YouTube URL | VARCHAR(255) | NULL | 立ち回りや対策の参考YouTube動画URL |
| `updated_at` | 最終更新日時 | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 最終更新日時 |