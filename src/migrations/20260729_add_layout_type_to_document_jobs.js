import pool from '../config/db.js';

export async function up() {
  console.log("Running migration: Adding layout_type column to document_jobs table...");
  await pool.query(`
    ALTER TABLE document_jobs
    ADD COLUMN IF NOT EXISTS layout_type VARCHAR(20) DEFAULT 'grid';
  `);
  console.log("✅ Migration complete: layout_type column added to document_jobs.");
}

up().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
