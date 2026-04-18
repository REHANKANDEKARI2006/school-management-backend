
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    // Check notices class_id
    const checkNotice = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'notices' AND column_name = 'class_id'");
    if (checkNotice.rows.length === 0) {
      console.log("Adding class_id column to notices table...");
      await pool.query("ALTER TABLE notices ADD COLUMN class_id INTEGER REFERENCES class(class_id)");
    }

    // Check events class_id
    const checkEvent = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'class_id'");
    if (checkEvent.rows.length === 0) {
      console.log("Adding class_id column to events table...");
      await pool.query("ALTER TABLE events ADD COLUMN class_id INTEGER REFERENCES class(class_id)");
    }
    
    console.log("Migration finished.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
