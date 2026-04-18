
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function listTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("TABLES:", res.rows.map(r => r.table_name));

    const guardCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'guardian'");
    console.log("GUARDIAN_COLUMNS:", guardCols.rows.map(r => r.column_name));
    
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

listTables();
