
import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkSchemas() {
  let output = "";
  try {
    const tables = ['guardian', 'admin', 'master_admin', 'user_role'];
    for (const table of tables) {
      const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [table]);
      output += `TABLE ${table}:\n` + JSON.stringify(res.rows.map(r => r.column_name), null, 2) + "\n\n";
    }

    // Also check role names in user_role
    const roles = await pool.query("SELECT * FROM user_role");
    output += "ROLES_DATA:\n" + JSON.stringify(roles.rows, null, 2) + "\n\n";

    fs.writeFileSync("schema_investigation.txt", output);
    console.log("Schemas written to schema_investigation.txt");
  } catch (err) {
    console.error("ERROR:", err);
    fs.writeFileSync("schema_investigation.txt", "ERROR: " + err.message);
  } finally {
    await pool.end();
  }
}

checkSchemas();
