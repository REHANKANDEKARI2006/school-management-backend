
import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function listTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tables = res.rows.map(r => r.table_name);
    fs.writeFileSync("db_tables.txt", JSON.stringify(tables, null, 2));
    console.log("Tables written to db_tables.txt");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

listTables();
