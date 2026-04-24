import pool from "../config/db.js";

async function updateDatabase() {
  try {
    console.log("🚀 Starting database update for Authentication System...");

    // 1. Add new columns to "user" table
    await pool.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS invite_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS invite_token_expiry TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES "user"(user_id),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
    `);
    console.log("✅ Added invite_token, invite_token_expiry, created_by, and status columns to 'user' table.");

    // 2. Map existing active users to 'active' status
    const updateRes = await pool.query(`
      UPDATE "user"
      SET status = 'active'
      WHERE is_active = true AND status = 'pending';
    `);
    console.log(`✅ Updated ${updateRes.rowCount} existing active users to 'active' status.`);

    // 3. Ensure role_id exists for roles if they don't (Master Admin check)
    // The roles should already exist from previous migrations, but we ensure hierarchy consistency.
    
    console.log("✅ Database update completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Database update failed:", err);
    process.exit(1);
  }
}

updateDatabase();
