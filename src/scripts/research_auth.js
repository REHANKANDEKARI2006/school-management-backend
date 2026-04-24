import pool from "../config/db.js";

async function research() {
  try {
    console.log("--- Users ---");
    const users = await pool.query('SELECT user_id, email, status, is_active, role_id FROM "user" LIMIT 30');
    console.table(users.rows);

    console.log("\n--- Login Attempts ---");
    const attempts = await pool.query('SELECT * FROM login_attempts');
    console.table(attempts.rows);

    console.log("\n--- Master Admin Role ID ---");
    const role = await pool.query("SELECT role_id FROM user_role WHERE role_code = 'MASTER_ADMIN'");
    console.table(role.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

research();
