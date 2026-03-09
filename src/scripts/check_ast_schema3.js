import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance_status';`);
        fs.writeFileSync('schema_out.txt', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        fs.writeFileSync('schema_out.txt', 'Error: ' + err.message);
    } finally {
        pool.end();
    }
}
run();
