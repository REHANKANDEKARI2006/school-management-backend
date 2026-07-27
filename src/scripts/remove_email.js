import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const STAFF_ID = 6;
const USER_ID = 68;

const client = await pool.connect();
try {
  await client.query('BEGIN');

  // Clear class assignments
  const classRes = await client.query('UPDATE class SET staff_id = NULL WHERE staff_id = $1', [STAFF_ID]);
  console.log(`✅ Cleared ${classRes.rowCount} class assignment(s)`);

  // Delete staff record
  const staffDel = await client.query('DELETE FROM staff WHERE staff_id = $1', [STAFF_ID]);
  console.log(`✅ staff record: ${staffDel.rowCount} deleted`);

  // Delete user record
  const userDel = await client.query('DELETE FROM "user" WHERE user_id = $1', [USER_ID]);
  console.log(`✅ user record: ${userDel.rowCount} deleted`);

  await client.query('COMMIT');
  console.log('\n✅ DONE — Shubham Patilee (mikhvi.br.a.m.w.ell.v.f.867.2@gmail.com) permanently deleted.');

  // Verify deletion
  const verify = await client.query('SELECT COUNT(*) FROM "user" WHERE user_id = $1', [USER_ID]);
  console.log(`\n🔍 Verification: ${verify.rows[0].count} user records remaining (should be 0)`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('❌ ERROR — Rolled back:', err.message, err.detail || '');
} finally {
  client.release();
  await pool.end();
}
