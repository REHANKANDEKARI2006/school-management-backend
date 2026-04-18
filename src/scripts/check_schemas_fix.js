
import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  let output = "";
  try {
    const studentCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'student'");
    output += "STUDENT_COLUMNS:\n" + JSON.stringify(studentCols.rows.map(r => r.column_name), null, 2) + "\n\n";

    const staffCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'staff'");
    output += "STAFF_COLUMNS:\n" + JSON.stringify(staffCols.rows.map(r => r.column_name), null, 2) + "\n\n";

    fs.writeFileSync("schemas_fix.txt", output);
    console.log("Written to schemas_fix.txt");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

check();
