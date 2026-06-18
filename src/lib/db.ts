import pkg from 'pg';
import type { QueryResultRow } from 'pg';

// Force pg to return DATE columns as raw strings (YYYY-MM-DD) instead of local Date objects
pkg.types.setTypeParser(1082, (val) => val);

const { Pool } = pkg;

// Reuse pool across hot-reloads in dev
const globalForPg = globalThis as unknown as { _pgPool?: InstanceType<typeof Pool> };

if (!globalForPg._pgPool) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable. Add it to your .env.local file.');
  }
  globalForPg._pgPool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const pool = globalForPg._pgPool!;

export async function query<T extends QueryResultRow = any>(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}
