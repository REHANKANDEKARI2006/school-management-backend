import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'school_profile' ORDER BY column_name");
    console.log("COLUMNS_IN_PROFILE:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

run();
