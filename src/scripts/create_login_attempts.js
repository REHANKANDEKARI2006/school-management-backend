import pool from "../config/db.js";

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        ip_address   VARCHAR(45) PRIMARY KEY,
        attempts     INTEGER DEFAULT 0,
        last_attempt TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log("✅ Created login_attempts table successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create login_attempts table:", err);
    process.exit(1);
  }
}

createTable();
