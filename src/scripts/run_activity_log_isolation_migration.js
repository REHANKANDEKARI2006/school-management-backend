import db from '../config/db.js';

async function runMigration() {
  console.log("🚀 Starting activity log isolation migration...");
  try {
    await db.query("BEGIN");

    console.log("Altering 'activity_log' table to add 'institute_id'...");
    await db.query(`
      ALTER TABLE activity_log 
      ADD COLUMN IF NOT EXISTS institute_id INTEGER REFERENCES institute(institute_id);
    `);

    console.log("Backfilling 'institute_id' from 'user' table...");
    await db.query(`
      UPDATE activity_log al
      SET institute_id = u.institute_id
      FROM "user" u
      WHERE u.user_id = al.user_id AND al.institute_id IS NULL;
    `);

    console.log("Setting default institute_id for any remaining logs with null institute_id...");
    await db.query(`
      UPDATE activity_log
      SET institute_id = 2
      WHERE institute_id IS NULL;
    `);

    console.log("Setting column institute_id as NOT NULL...");
    await db.query(`
      ALTER TABLE activity_log 
      ALTER COLUMN institute_id SET NOT NULL;
    `);

    await db.query("COMMIT");
    console.log("✅ Activity log isolation migration completed successfully!");
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Migration failed! Transaction rolled back.", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
