import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const res = await pool.query('SELECT user_id, email, password_hash, role_id FROM "user" WHERE LOWER(email) = LOWER($1)', ['nikita@gmail.com']);
    console.log("USER_RECORD:", JSON.stringify(res.rows));
  } catch (err) {
    console.error("DB_ERROR:", err);
  } finally {
    await pool.end();
  }
})();
