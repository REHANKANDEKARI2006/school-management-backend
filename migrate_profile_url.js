import pool from "./src/config/db.js";

async function migrate() {
  try {
    console.log("Adding profile_url to master_admin...");
    await pool.query(`ALTER TABLE master_admin ADD COLUMN IF NOT EXISTS profile_url TEXT`);
    
    console.log("Adding profile_url to admin...");
    await pool.query(`ALTER TABLE admin ADD COLUMN IF NOT EXISTS profile_url TEXT`);
    
    console.log("Adding profile_url to guardian...");
    await pool.query(`ALTER TABLE guardian ADD COLUMN IF NOT EXISTS profile_url TEXT`);

    console.log("✅ Database migration completed successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
