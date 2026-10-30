import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import env from "./env.js";
import * as schema from "../drizzle/index.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  query_timeout: 5000
});
const db = drizzle(pool, { logger: env.NODE_ENV === "development", schema });
export default db;
