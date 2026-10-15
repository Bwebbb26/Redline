import { pool } from "../db/pool.js";

const result = await pool.query(
  `SELECT NOW() AS server_time, VERSION() AS version`,
);

console.log("Database connection successful.", result.rows[0]);

await pool.end();
