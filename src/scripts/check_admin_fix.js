
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    console.log("--- User Table Columns ---");
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user'");
    console.log(cols.rows.map(r => r.column_name));

    console.log("\n--- Admin/Master Admin Users ---");
    const admins = await pool.query('SELECT user_id, user_name, email, role_id FROM "user" WHERE role_id IN (1, 2) LIMIT 5');
    console.log(admins.rows);

    if (admins.rows.length > 0) {
      console.log("\n--- Checking Staff Table for these Users ---");
      const userIds = admins.rows.map(a => a.user_id);
      const staff = await pool.query('SELECT user_id, staff_first_name, staff_last_name FROM staff WHERE user_id = ANY($1)', [userIds]);
      console.log(staff.rows);
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

check();
