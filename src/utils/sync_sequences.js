/**
 * Utility: Auto-sync all PostgreSQL sequences on server startup.
 * Prevents "duplicate key value violates unique constraint" errors
 * caused by sequences falling behind the actual max IDs in tables
 * (e.g. after bulk seeding or manual data imports).
 */
import pool from "../config/db.js";

export async function syncAllSequences() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT 
        t.relname AS table_name,
        a.attname AS column_name,
        pg_get_serial_sequence(t.relname::text, a.attname::text) AS sequence_name
      FROM pg_class t
      JOIN pg_attribute a ON a.attrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relkind = 'r'
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND pg_get_serial_sequence(t.relname::text, a.attname::text) IS NOT NULL
      ORDER BY t.relname
    `);

    let fixedCount = 0;

    for (const { table_name, column_name, sequence_name } of rows) {
      const maxRes = await client.query(
        `SELECT COALESCE(MAX("${column_name}"), 0) AS max_val FROM "${table_name}"`
      );
      const maxVal = parseInt(maxRes.rows[0].max_val);

      const seqRes = await client.query(`SELECT last_value FROM ${sequence_name}`);
      const seqVal = parseInt(seqRes.rows[0].last_value);

      if (seqVal < maxVal) {
        await client.query(`SELECT setval('${sequence_name}', $1)`, [maxVal]);
        console.log(`  ↳ Fixed ${table_name}.${column_name}: ${seqVal} → ${maxVal}`);
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      console.log(`✅ Synced ${fixedCount} out-of-date sequence(s).`);
    } else {
      console.log(`✅ All ${rows.length} sequences are in sync.`);
    }
  } catch (err) {
    console.error("⚠️ Sequence sync warning (non-fatal):", err.message);
  } finally {
    client.release();
  }
}
