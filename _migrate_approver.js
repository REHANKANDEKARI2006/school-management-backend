import db from './src/config/db.js';

async function migrate() {
  try {
    await db.query(`ALTER TABLE staff_leave ADD COLUMN IF NOT EXISTS approver_id INTEGER REFERENCES "user"(user_id)`);
    console.log("Migration successful");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

migrate();
