# API設計標準書

## 1. 基本方針 (General Principles)

- 通信方式: Next.js App Router の Route Handlers (`app/api/.../route.ts`) および Server Actions を採用する
- データ形式: リクエスト / レスポンスともに `JSON` 形式に統一する
- HTTP メソッド定義:
  - `GET`: データの取得（一覧・詳細）
  - `POST`: データの新規作成
  - `PUT`: データの更新
  - `DELETE`: データの削除（論理削除フラグの更新を含む）
- 命名規則 (Naming Convention):
  - エンドポイント (URL): 小文字・ハイフン繋ぎ（ケバブケース）
    - 例: `/api/sumabura/strategy-notes`
  - JSON キー (Payload): 小文字・スネークケース
    - 例: `target_character_id`
  - DB カラム名と一致させてマッピング負荷を低減する
  - 関数・メソッド名: キャメルケース
    - 例: `getStrategyNotes`, `createStrategyNote`

---

## 2. 操作別メソッド・命名マッピング標準

HTTP メソッド、処理内容（SQL）、Prisma（ORM）メソッド、および関数命名の対応関係を、以下のように統一する。

| 操作内容 | HTTPメソッド | SQL操作 | Prisma（ORM）操作 | バックエンド / API 関数命名例 |
| :--- | :--- | :--- | :--- | :--- |
| **一覧取得** | `GET` | `SELECT` | `findMany()` | `getStrategyNotes()` |
| **単件取得** | `GET` | `SELECT ... WHERE id = ?` | `findUnique()` / `findFirst()` | `getStrategyNoteById(id)` |
| **新規登録** | `POST` | `INSERT` | `create()` | `createStrategyNote(data)` |
| **更新** | `PUT` / `PATCH` | `UPDATE` | `update()` | `updateStrategyNote(id, data)` |
| **削除** | `DELETE` | `UPDATE`（論理削除） / `DELETE` | `update()`（フラグ変更） / `delete()` | `deleteStrategyNote(id)` |

---

## 3. エンドポイント命名規約

機能追加やスキーマ拡張に対応できるよう、URL の第1階層には機能名（スキーマ名）を含める。

```text
/api/{schema_name}/{resource_name}
```

例:

- `GET /api/sumabura/characters`：ファイターマスター一覧取得
- `GET /api/sumabura/user-characters`：使用キャラ一覧取得
- `POST /api/sumabura/strategy-notes`：対策メモ新規作成
- `PUT /api/sumabura/strategy-notes`：対策メモ更新
- `DELETE /api/sumabura/strategy-notes`：対策メモ削除

### 3.1 命名ルール

- URL はすべて小文字で記述する
- 単語の区切りはハイフン (`-`) を使用する
- リソース名は複数形を基本とする
- API の役割が分かる命名を優先し、略語は避ける
- REST の慣例に沿い、動詞ではなくリソース名で表現する

---

## 4. レスポンス形式標準

すべての API レスポンスは、成功・失敗に関わらず共通のラッパー形式を返す。

### 4.1 成功時レスポンス

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "test"
  }
}
```

- `success` は処理結果の成否を示す
- `data` には配列またはオブジェクトを返す
- 取得系、更新系、削除系の成功時は、すべてこの形式を採用する

### 4.2 エラー時レスポンス

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "対策メモの保存に失敗しました。"
  }
}
```

- `code` は識別用のエラーコードを返す
- `message` は画面に表示するユーザー向けのメッセージを返す
- エラーメッセージは UI 標準で定義したアラート表示にそのまま連携する

### 4.3 エラーコードの例

- `BAD_REQUEST`: バリデーションエラー、不正なリクエスト
- `NOT_FOUND`: 指定したリソースが存在しない
- `INTERNAL_SERVER_ERROR`: サーバー側の例外、DB 接続失敗など
- 必要に応じて、業務固有のコードを追加してもよい

---

## 5. HTTP ステータスコード定義

| HTTP Status | 説明 | 用途 |
| --- | --- | --- |
| 200 OK | 正常終了 | 取得、更新、削除の成功 |
| 201 Created | 新規作成成功 | 新規リソースの生成 |
| 400 Bad Request | リクエスト不正 | バリデーションエラー、不正なパラメータ |
| 404 Not Found | 対象なし | 指定 ID のリソースが存在しない |
| 500 Internal Server Error | サーバー内部エラー | DB 接続エラー、未捕捉例外 |

- 成功時は `200` または `201` を返す
- 失敗時は適切な HTTP ステータスと、共通 JSON エラー形式を返す
- 例外発生時は `500` に集約せず、必要に応じて `400` / `404` などを明示する

---

## 6. 通信エラー処理と UI 連携ルール

画面側では以下を原則とする。

- API 呼び出しで `success: false` を返却した場合、または HTTP 4xx / 5xx を受け取った場合は、`error.message` を取得する
- 取得したメッセージは、画面標準（`docs/ui-standard.md`）で定義する「画面タイトル直下の赤系コールアウト」に表示する
- 失敗時にユーザーへ伝える文言は、技術詳細ではなく自然で分かりやすい表現を使う
- 例外時のログはサーバー側で出力し、UI には詳細を露出しない

---

## 7. 実装上の原則

- API の入力と出力は明示的に設計し、曖昧な `any` 返却を避ける
- ルーティング、バリデーション、DB 処理は責務ごとに分離する
- 実行結果は常に共通フォーマットに統一する
- 今後の機能追加に備えて、スキーマ単位で API を分割する設計を推奨する
- 画面と API の責務境界を明確にし、UI 側でのエラーハンドリングを簡潔に保つ

以上を遵守することで、UI・API・DB の連携が一貫し、保守性と拡張性を確保できる。

