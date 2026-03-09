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
        await pool.query(`
      ALTER TABLE attendance_session 
      ADD CONSTRAINT attendance_session_unique 
      UNIQUE (class_id, section_id, subject_id, attendance_date);
    `);
        console.log("Unique constraint added to attendance_session.");
    } catch (err) {
        if (err.code === '42P04') {
            console.log("Constraint already exists.");
        } else if (err.code === '23505') {
            console.log("Duplicates exist! Deleting duplicates and retrying...");
            await pool.query(`
            DELETE FROM attendance_session a USING (
                SELECT MIN(session_id) as min_id, class_id, section_id, subject_id, attendance_date
                FROM attendance_session 
                GROUP BY class_id, section_id, subject_id, attendance_date HAVING COUNT(*) > 1
            ) b
            WHERE a.class_id = b.class_id AND a.section_id = b.section_id AND a.subject_id = b.subject_id AND a.attendance_date = b.attendance_date AND a.session_id <> b.min_id;
        `);
            await pool.query(`
            ALTER TABLE attendance_session 
            ADD CONSTRAINT attendance_session_unique 
            UNIQUE (class_id, section_id, subject_id, attendance_date);
        `);
            console.log("Unique constraint added after deleting duplicates.");
        } else {
            console.error("Error adding constraint:", err);
        }
    } finally {
        pool.end();
    }
}

run();
