# 開発環境構築手順

## 前提導入

### Node
```sh
node -v
→ バージョンアップ：volta install node@22  → volta install pnpm
```

### VScodeの設定
```sh
Get-ExecutionPolicy -Scope CurrentUser
→ RemoteSigned
```

### pnpm 導入
```sh
npm install -g pnpm
pnpm -v
```

### VScode拡張機能
```text
・Japanese Language Pack for VS Code（VScode日本語）

・ESLint（コード内の文法エラーや、不要な変数、不適切な記述（バグの元になるコード）を静的に検出・警告してくれるツール）
pnpm add eslint-plugin-react → ESLintに React特有の構文チェックルール追加
pnpm add eslint-plugin-react-hooks → React Hooksの 使用ルールを強制する プラグイン

・Prettier Code for matter（コードのフォーマット（インデント、改行、セミコロンの有無など）を自動で統一するツール）
pnpm add -D eslint-plugin-prettier → Prettier の整形ルールを ESLint のチェック対象として組み込むためのプラグインです。これにより「ESLintの修正コマンドを実行するだけでコード整形まで一括完了する」状態を作れます。

・GitLens Git supercharged（コードの各行を「誰が・いつ・どのコミットで変更したか」をエディタ上にインライン表示してくれる高機能Git拡張）

・VS Code Counter（プロジェクト内の総コード行数（Lines of Code）や言語ごとの行数、コメント行数をワンクリックで集計・視覚化してくれるツール）

・Material Icon Theme：フォルダ毎にアイコン変更
・Bracket Highlighter：括弧ハイライト
・indent-rainbow：インデントハイライト
・YAML：Red Hatが提供するYAMLファイルの補完・構文チェック拡張機能
・Windsurf Plugin (formerly Codeium): AI Coding Autocomplete and Chat for Python, JavaScript, TypeScript, and more（無料AI補完）
```

## プロジェクト作成
```sh
pnpm create next-app teru-portal-app

・Would you like to use TypeScript? → Yes
・Would you like to use ESLint? → Yes
・Would you like to use Tailwind CSS? → Yes
・Would you like your code inside a src/ directory? → Yes
・Would you like to use App Router? (recommended) → Yes
・Would you like to use Turbopack for next dev? → Yes （開発サーバーが高速になります）
・Would you like to customize the import alias (@/ by default)?* → No （またはエンターキー）
```

### 移動
```sh
cd teru-portal-app
```

### ドキュメント管理フォルダ作成
```sh
mkdir docs
```

## Git

### SSH確認
```sh
# 接続確認
ssh -T git@github.com
```

### SSH登録
```sh
# キー確認
cat ~/.ssh/id_ed25519.pub
→ 出力したものをGitHubの設定のsshに登録
```

### GitHubでプロジェクト作成
[GitHub](https://github.com/Teru11/teru-portal-app)

### プロジェクト新規プッシュ
```sh
# 接続
git remote add origin git@github.com:Teru11/teru-portal-app.git

# 追加
git add .

# コミット
git commit -m "新規作成"

# ブランチ名変更
git branch -M main

# GitHubへプッシュ
git push -u origin main --force
```

## Redmine

### 開く
```sh
E:\develop\redmine\open-redmine.bat
```
[Redmine](http://localhost:3000/)

### 直接切る方法
```sh
Stop-Process -Name "ruby" -Force
```