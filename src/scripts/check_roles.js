import pool from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkRoles() {
  try {
    const res = await pool.query('SELECT role_id, role_name FROM role');
    console.log('ROLES IN DB:', res.rows);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
}

checkRoles();
