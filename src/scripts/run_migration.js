import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { createExamGradesTable } from '../migrations/20260301_exam_grades_table.js';

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function runMigration() {
    try {
        console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'FOUND' : 'NOT FOUND');
        console.log('Ensuring exam_grades table...');
        await createExamGradesTable();
        console.log('Migration successful!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
