/**
 * src/lib/database.ts
 *
 * MySQL2 connection pool singleton.
 * Used for audit log writes and template reads.
 */

import mysql from "mysql2/promise";
import { env } from "../config/env";
import { logger } from "./logger";

let _pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "+07:00",
      charset: "utf8mb4",
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
    });
    logger.info("MySQL pool created", {
      host: env.DB_HOST,
      db: env.DB_NAME,
    });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    logger.info("MySQL pool closed gracefully");
  }
}

/**
 * Execute a SELECT query and return typed rows as plain objects.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.query<mysql.RowDataPacket[]>({ sql, values: params });
  return rows as unknown as T[];
}

/**
 * Execute a DML statement (INSERT/UPDATE/DELETE).
 */
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<mysql.ResultSetHeader> {
  const pool = getPool();
  const [result] = await pool.execute<mysql.ResultSetHeader>({ sql, values: params });
  return result;
}
