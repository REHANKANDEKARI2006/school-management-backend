
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    const res1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'student'");
    console.log("COLUMNS_IN_STUDENT:", JSON.stringify(res1.rows.map(r => r.column_name)));
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'class_enrollment'");
    console.log("COLUMNS_IN_CLASS_ENROLLMENT:", JSON.stringify(res2.rows.map(r => r.column_name)));
    const res3 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'class'");
    console.log("COLUMNS_IN_CLASS:", JSON.stringify(res3.rows.map(r => r.column_name)));
  } catch (err) {
    console.error("DB_ERROR:", err);
  } finally {
    await pool.end();
  }
}

check();
