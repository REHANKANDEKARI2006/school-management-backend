
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user'");
    console.log('USER_COLUMNS:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

check();
