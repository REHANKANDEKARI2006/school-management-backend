import pkg from 'pg';
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query(`
      ALTER TABLE attendance_session ADD COLUMN IF NOT EXISTS faculty_id INTEGER;
    `);
        console.log("Added faculty_id to attendance_session table.");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
