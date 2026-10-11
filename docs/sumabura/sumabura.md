# スマブラ（メニューから遷移）設計書

メニュー名：スマブラ

## 1. 目的と対象範囲

スマブラツールは、自分が使用するファイターを起点に、対戦相手ごとの対策メモと参考動画を確認・更新するための個人向けツールである。

### 1.1 対象範囲

* ファイター情報の参照
* 使用キャラ（メインキャラ・サブキャラ）の登録、表示、論理削除
* 自キャラと対策対象キャラの組み合わせごとの対策メモの参照、登録、更新、論理削除
* 対策メモに紐づく YouTube URL の保持

### 1.2 対象外

* 対戦履歴、戦績、レートの管理
* オンライン対戦サービスとの連携
* 複数ユーザー間でのメモ共有
* ファイター情報の通常画面からの編集

## 2. ドメイン概要

### 2.1 ドメイン用語

| 用語 | 定義 |
| :--- | :--- |
| ファイター | スマブラに登場するキャラクター。`characters` で管理するマスター。 |
| 使用キャラ | 利用者が自分のキャラクターとして登録したファイター。 |
| 対策対象キャラ | 対策メモの対象となる相手側のファイター。 |
| 対策メモ | 自キャラと対策対象キャラの組み合わせに対する立ち回り・注意点のメモ。 |

### 2.2 ドメインモデル

```text
ファイター (characters)
	├── 使用キャラ (user_characters)
	└── 対策対象キャラ

使用キャラ ── 自キャラ ── 対策メモ (strategy_notes) ── 対策対象キャラ
									  └── YouTube URL
```

## テーブル構造（`sumabura` スキーマ）

### 1. `sumabura.characters` (ファイター管理)
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
| `content` | 対策内容 | TEXT | NULL | 対策メモ（プレーンテキスト）（改行可） |
| `youtube_url` | YouTube URL | VARCHAR(255) | NULL | 立ち回りや対策の参考YouTube動画URL |
| `updated_at` | 最終更新日時 | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 最終更新日時 |

## 3. 画面構成

スマブラツールは、メニューから遷移した後の**1画面**で完結させる。表示順は上から次の順とする。

```text
1. 画面タイトル：スマブラ
2. 使用ファイター選択
3. 対策対象ファイター
4. ファイター一覧
```

[design.pdf参照](/design.pdf)
※design.xlsxも同様

## 5. API

APIは [../api-standard.md](../api-standard.md) の共通レスポンス形式と命名規則に従う。

すべての成功レスポンスは `{ "success": true, "data": ... }`、エラーレスポンスは [../api-standard.md](../api-standard.md) の形式とする。JSON キーはスネークケースを使用する。

#### ファイター一覧取得API（`GET /api/sumabura/characters`）

ファイター一覧を ID 昇順で取得する。
`nickname` は完全一致で絞り込む。
使用キャラだけに限定する場合は `registered_only=true` を指定する。

| 入力 | 場所 | 必須 | 型 | 内容 |
| :--- | :--- | :---: | :--- | :--- |
| `nickname` | Query | いいえ | string | 略称の完全一致検索 |
| `registered_only` | Query | いいえ | boolean | `true` の場合、使用キャラ登録済みのファイターに限定。省略時は `false` |

成功時の `data` は次の配列とする。

```json
[
	{
		"id": 1,
		"name": "マリオ",
		"nickname": "マリオ",
		"note": null,
		"is_registered": true
	}
]
```

`note` は未設定の場合 `null`、`is_registered` は有効な使用キャラ登録がある場合 `true`。

#### ファイター更新API（`PUT /api/sumabura/characters`）

ファイターの `note` または `nickname` を更新する。
1 リクエストで更新できる項目はどちらか一方とする。

| 入力 | 場所 | 必須 | 型 | 制約 |
| :--- | :--- | :---: | :--- | :--- |
| `id` | Body | はい | integer | 更新対象のファイター ID |
| `note` | Body | 条件付き | string \| null | `note` 更新時に指定。`null` でクリア |
| `nickname` | Body | 条件付き | string | `nickname` 更新時に指定。1〜20 文字 |

`note` と `nickname` の両方、またはいずれも指定されない場合は `400 BAD_REQUEST` とする。
成功時の `data` は更新後のファイターオブジェクト（`id`、`name`、`nickname`、`note`）とする。
対象 ID が存在しない場合は `404 NOT_FOUND`。

#### 使用キャラ登録API（`POST /api/sumabura/user-characters`）

使用キャラを登録し、そのファイターを自キャラとする対策メモを全ファイター分作成する。対策メモは `my_character_id` に登録対象の `character_id`、`target_character_id` に各ファイターの ID を設定し、`content` は空文字、`youtube_url` は `null` で初期化する。使用キャラ登録と対策メモ作成は同一トランザクションで実行し、いずれかに失敗した場合はすべてロールバックする。

| 入力 | 場所 | 必須 | 型 | 内容 |
| :--- | :--- | :---: | :--- | :--- |
| `character_id` | Body | はい | integer | 登録するファイター ID |

成功時は `201 Created` とし、`data` に作成された使用キャラ登録の `id` と `character_id`、作成した対策メモ件数 `strategy_notes_created` を返す。

```json
{
	"id": 1,
	"character_id": 1,
	"strategy_notes_created": 86
}
```

`strategy_notes_created` は今回新規作成した対策メモ件数とする。既存メモがある組み合わせは保持し、重複作成しない。
ファイターが存在しない場合は `404 NOT_FOUND`、有効な登録がすでにある場合は `400 BAD_REQUEST`。

#### 使用キャラ削除API（`DELETE /api/sumabura/user-characters`）

使用キャラ登録を論理削除する。`id` または `character_id` のいずれか一方を指定する。

| 入力 | 場所 | 必須 | 型 | 内容 |
| :--- | :--- | :---: | :--- | :--- |
| `id` | Query | 条件付き | integer | 使用キャラ登録 ID |
| `character_id` | Query | 条件付き | integer | ファイター ID |

両方またはいずれも指定されない場合は `400 BAD_REQUEST`。
成功時の `data` は `{ "id": 1, "is_deleted": true }` とする。
対象が存在しない場合は `404 NOT_FOUND`。

#### 対策メモ取得API（`GET /api/sumabura/strategy-notes`）

指定した自キャラの対策メモを取得する。使用キャラ登録時に作成した初期データも返す。
`target_nickname` を指定した場合は略称完全一致で対象を絞り込む。省略時は自キャラに紐づく全件を返す。

| 入力 | 場所 | 必須 | 型 | 内容 |
| :--- | :--- | :---: | :--- | :--- |
| `my_character_id` | Query | はい | integer | 現在選択中の自キャラ ID |
| `target_nickname` | Query | いいえ | string | 対策対象の略称（完全一致） |

成功時の `data` は次の配列とする。対策内容が未入力の初期データも結果に含め、未入力の場合の `content` は空文字とする。

```json
[
	{
		"id": 1,
		"my_character_id": 1,
		"target_character_id": 2,
		"target_name": "ドンキーコング",
		"target_nickname": "DK",
		"content": "",
		"youtube_url": null,
		"updated_at": "2026-10-09T12:00:00Z"
	}
]
```

`youtube_url` は未設定の場合 `null`。

#### 対策メモ更新API（`PUT /api/sumabura/strategy-notes`）

既存の対策メモを更新する。

| 入力 | 場所 | 必須 | 型 | 制約 |
| :--- | :--- | :---: | :--- | :--- |
| `my_character_id` | Body | はい | integer | 自キャラ ID |
| `target_character_id` | Body | はい | integer | 対策対象のファイター ID |
| `content` | Body | はい | string | 対策内容。空文字を指定した場合は内容をクリア |
| `youtube_url` | Body | はい | string \| null | YouTube URL。`null` でクリア |

成功時の `data` は更新後の対策メモ（GET のレスポンスと同じ項目）。
該当するメモが存在しない場合は `404 NOT_FOUND`。