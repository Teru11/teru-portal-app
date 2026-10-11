import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL が設定されていません。");
  }

  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return globalForPg.pgPool;
}