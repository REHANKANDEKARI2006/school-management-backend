import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const email = "nikita@gmail.com";
const hash = "$2b$10$WMCfTXiqz2OFe7ekl33gBOOyyzOm9WY6yZIgXHzPSpSVilr4LaiiR";

(async () => {
  try {
    const res = await pool.query(
      'UPDATE "user" SET password_hash = $1 WHERE email = $2 RETURNING *',
      [hash, email]
    );
    if (res.rowCount > 0) {
      console.log(`UPDATE_SUCCESS: User ${email} updated.`);
    } else {
      console.log(`UPDATE_FAILED: User ${email} not found.`);
    }
  } catch (err) {
    console.error("DB_ERROR:", err);
  } finally {
    await pool.end();
  }
})();
