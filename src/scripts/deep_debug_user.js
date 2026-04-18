
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function debugUser(email) {
  try {
    const userRes = await pool.query("SELECT * FROM \"user\" WHERE LOWER(email) = LOWER($1)", [email]);
    console.log('--- USER TABLE ---');
    console.log(JSON.stringify(userRes.rows, null, 2));

    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      const uid = u.user_id;

      const tables = ['student', 'staff', 'guardian', 'admin', 'master_admin'];
      for (const table of tables) {
        let query = "";
        if (table === 'student') query = `SELECT * FROM ${table} WHERE student_user_id = $1 OR LOWER(email) = LOWER($2)`;
        else if (table === 'guardian') query = `SELECT * FROM ${table} WHERE guardian_user_id = $1 OR LOWER(email) = LOWER($2)`;
        else query = `SELECT * FROM ${table} WHERE user_id = $1 OR LOWER(email) = LOWER($2)`;

        const res = await pool.query(query, [uid, email]);
        if (res.rows.length > 0) {
          console.log(`--- ${table.toUpperCase()} TABLE ---`);
          console.log(JSON.stringify(res.rows, null, 2));
        }
      }
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

const targetEmail = process.argv[2] || 'nikita@gmail.com';
debugUser(targetEmail);
