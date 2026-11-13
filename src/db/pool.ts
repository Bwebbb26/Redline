import pg from "pg";
import { config } from "../config.js";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
});
export const db = drizzle(pool, { logger: config.nodeEnv === "development" });
