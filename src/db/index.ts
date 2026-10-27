import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

export const isCloudSqlConfigured = Boolean(
  process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER
);

const createPool = () => {
  if (!isCloudSqlConfigured) {
    return null;
  }
  const g = global as any;
  if (!g._postgresPool) {
    g._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
    });
    g._postgresPool.on("error", (err: any) => {
      console.warn("[DB POOL] Warning on idle SQL pool client:", err?.message || err);
    });
  }
  return g._postgresPool;
};

const pool = createPool();
export const db: any = pool ? drizzle(pool, { schema }) : null;
export { createPool };
