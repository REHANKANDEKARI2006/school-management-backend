import pool from "../config/db.js";

async function main() {
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_lower_email ON "user" (LOWER(email));
    CREATE INDEX IF NOT EXISTS idx_user_lower_username ON "user" (LOWER(user_name));
  `);
  console.log("✅ Unique user email and username indexes ready");
  process.exit(0);
}
main().catch(console.error);
