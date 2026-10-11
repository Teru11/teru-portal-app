import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Next.js推奨ルールを適用し、生成ファイルをLint対象から外す設定です。 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-nextの既定除外設定をこの一覧で管理します。
  globalIgnores([
    // Next.jsの生成物と型定義はLint対象から除外します。
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
