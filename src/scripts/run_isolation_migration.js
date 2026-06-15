import db from '../config/db.js';

async function runMigration() {
  console.log("🚀 Starting database isolation migration...");
  
  const tablesToAlter = [
    'class',
    'custom_holidays',
    'materials',
    'notices',
    'events',
    'exam',
    'question_papers',
    'schedule',
    'fee_structure',
    'leave_applications',
    'paper_format_templates',
    'question_bank',
    'attendance_session'
  ];

  try {
    await db.query("BEGIN");

    for (const table of tablesToAlter) {
      console.log(`Adding institute_id column to table: "${table}"`);
      
      // Add column if it does not exist
      await db.query(`
        ALTER TABLE "${table}" 
        ADD COLUMN IF NOT EXISTS institute_id INTEGER REFERENCES institute(institute_id);
      `);

      // Update existing records to default to Sunshine Public School (institute_id = 3)
      const updateRes = await db.query(`
        UPDATE "${table}" 
        SET institute_id = 3 
        WHERE institute_id IS NULL;
      `);
      console.log(`Updated existing rows for "${table}": ${updateRes.rowCount}`);
    }

    await db.query("COMMIT");
    console.log("✅ Database isolation migration completed successfully!");
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Migration failed! Transaction rolled back.", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
