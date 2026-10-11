import { Pool } from "pg";

/** 開発時の再コンパイルでプールが重複生成されないよう、プロセス全体で共有します。 */
const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };

/**
 * 環境変数からPostgreSQL接続プールを取得し、未作成なら一度だけ初期化します。
 * @returns {Pool} アプリ内で共有するPostgreSQL接続プール
 * @throws {Error} DATABASE_URLが設定されていない場合
 */
export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL が設定されていません。");
  }

  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return globalForPg.pgPool;
}