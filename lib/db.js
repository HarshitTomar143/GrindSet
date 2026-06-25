import { Pool } from "pg";

let pool;

function makeSsl(url) {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return { rejectUnauthorized: false };
  // default: local hosts -> no SSL, remote hosts -> SSL
  if (!url || /@(localhost|127\.0\.0\.1)/.test(url)) return false;
  return { rejectUnauthorized: false };
}

export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env.local and add your PostgreSQL connection string."
      );
    }
    pool = new Pool({ connectionString: url, ssl: makeSsl(url), max: 5 });
  }
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}

export const MOCK_SIZE = 30;
