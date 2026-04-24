import pool from "../config/db.js";

async function migrate() {
    try {
        console.log("🚀 Running migration: Allow NULL for password_hash...");
        await pool.query('ALTER TABLE "user" ALTER COLUMN password_hash DROP NOT NULL');
        console.log("✅ Successfully altered password_hash to allow NULL.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
