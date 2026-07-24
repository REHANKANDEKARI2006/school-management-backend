/**
 * Fix all primary key sequences in the database.
 * Resets each sequence to MAX(id) + 1 so new inserts don't collide.
 */
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fixSequences() {
  const client = await pool.connect();
  try {
    // Find all tables with serial/identity columns and their sequences
    const seqQuery = `
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
      ORDER BY t.relname;
    `;

    const { rows } = await client.query(seqQuery);

    if (rows.length === 0) {
      console.log("No sequences found.");
      return;
    }

    console.log(`Found ${rows.length} sequence(s) to check:\n`);

    for (const row of rows) {
      const { table_name, column_name, sequence_name } = row;

      // Get current max value in the table
      const maxRes = await client.query(
        `SELECT COALESCE(MAX("${column_name}"), 0) AS max_val FROM "${table_name}"`
      );
      const maxVal = parseInt(maxRes.rows[0].max_val);

      // Get current sequence value
      const seqRes = await client.query(`SELECT last_value FROM ${sequence_name}`);
      const seqVal = parseInt(seqRes.rows[0].last_value);

      if (seqVal < maxVal) {
        // Fix the sequence
        await client.query(
          `SELECT setval('${sequence_name}', $1)`,
          [maxVal]
        );
        console.log(
          `✅ FIXED: ${table_name}.${column_name} — sequence was ${seqVal}, max ID is ${maxVal}. Reset to ${maxVal}.`
        );
      } else {
        console.log(
          `   OK:    ${table_name}.${column_name} — sequence=${seqVal}, max=${maxVal}`
        );
      }
    }

    console.log("\n🎉 All sequences checked and fixed.");
  } catch (err) {
    console.error("❌ Error fixing sequences:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSequences();
