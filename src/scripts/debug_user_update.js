
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    const res = await pool.query("SELECT * FROM \"user\" LIMIT 1");
    if (res.rows.length > 0) {
        console.log('USER_COLUMNS:', Object.keys(res.rows[0]));
    } else {
        console.log('NO USER DATA');
    }
    
    // Also check pool stats if possible or just try a simple update
    console.log("Testing update...");
    // Try to update a dummy user or just check schema
    const schemaRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user'");
    console.log('USER_SCHEMA_COLS:', schemaRes.rows.map(r => r.column_name));

  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

check();
