import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const STAFF_ID = 6;
const USER_ID = 68;

const client = await pool.connect();
try {
  // Find all FK references to this staff_id and user_id
  console.log('=== Checking all references to staff_id=6 ===');
  
  const tables = ['class', 'attendance_record', 'leave_request', 'leave_approval'];
  for (const t of tables) {
    try {
      const r = await client.query(`SELECT COUNT(*) FROM ${t} WHERE staff_id = $1`, [STAFF_ID]);
      if (parseInt(r.rows[0].count) > 0) console.log(`  ⚠️ ${t}: ${r.rows[0].count} records reference staff_id=${STAFF_ID}`);
    } catch(e) {
      // Try user_id column instead
      try {
        const r2 = await client.query(`SELECT COUNT(*) FROM ${t} WHERE user_id = $1`, [USER_ID]);
        if (parseInt(r2.rows[0].count) > 0) console.log(`  ⚠️ ${t}: ${r2.rows[0].count} records reference user_id=${USER_ID}`);
      } catch(e2) {}
    }
  }

  console.log('\n=== Checking all references to user_id=68 ===');
  // Query information_schema for all tables with FK to user
  const fkQuery = await client.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND (ccu.table_name = 'user' OR ccu.table_name = 'staff')
    ORDER BY tc.table_name
  `);
  console.log('FK references to user/staff tables:');
  for (const fk of fkQuery.rows) {
    try {
      const r = await client.query(`SELECT COUNT(*) FROM "${fk.table_name}" WHERE "${fk.column_name}" = $1`, [fk.column_name.includes('staff') ? STAFF_ID : USER_ID]);
      if (parseInt(r.rows[0].count) > 0) {
        console.log(`  ⚠️ ${fk.table_name}.${fk.column_name}: ${r.rows[0].count} records`);
      }
    } catch(e) {}
  }

  // Direct attempt: try to delete staff and see what FK error we get
  console.log('\n=== Attempting staff delete to see exact FK error ===');
  await client.query('BEGIN');
  await client.query('UPDATE class SET staff_id = NULL WHERE staff_id = $1', [STAFF_ID]);
  try {
    await client.query('DELETE FROM staff WHERE staff_id = $1', [STAFF_ID]);
    console.log('Staff deleted OK - now trying user delete...');
    try {
      await client.query('DELETE FROM "user" WHERE user_id = $1', [USER_ID]);
      console.log('User deleted OK');
    } catch (ue) {
      console.log('User delete failed:', ue.message);
      console.log('Detail:', ue.detail);
      console.log('Table:', ue.table);
      console.log('Constraint:', ue.constraint);
    }
  } catch (se) {
    console.log('Staff delete failed:', se.message);
    console.log('Detail:', se.detail);
    console.log('Table:', se.table);
    console.log('Constraint:', se.constraint);
  }
  await client.query('ROLLBACK');

} finally {
  client.release();
  await pool.end();
}
