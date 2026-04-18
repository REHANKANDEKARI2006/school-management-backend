
import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function listAll() {
  let output = "";
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    output += "ALL_TABLES: " + JSON.stringify(tables.rows.map(r => r.table_name), null, 2) + "\n\n";

    // Check for admin related tables
    const adminTables = tables.rows.filter(t => t.table_name.toLowerCase().includes('admin'));
    output += "ADMIN_RELATED_TABLES: " + JSON.stringify(adminTables.map(t => t.table_name), null, 2) + "\n\n";

    // Check for role table
    const roles = await pool.query("SELECT * FROM role");
    output += "ROLES_DATA: " + JSON.stringify(roles.rows, null, 2) + "\n\n";

    fs.writeFileSync("db_investigation.txt", output);
    console.log("Output written to db_investigation.txt");
    
  } catch (err) {
    console.error("ERROR:", err);
    fs.writeFileSync("db_investigation.txt", "ERROR: " + err.message);
  } finally {
    await pool.end();
  }
}

listAll();
