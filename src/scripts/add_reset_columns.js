import pool from "../config/db.js";

async function update() {
  try {
    await pool.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255), 
      ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;
    `);
    console.log("✅ Added reset_token columns successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to add reset_token columns:", err);
    process.exit(1);
  }
}

update();
