import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const email = "nikita@gmail.com";
const password = "nikita123";

(async () => {
  try {
    const hash = await bcrypt.hash(password, 10);
    console.log("GENERATED_CONFIRMED_HASH:", hash);
    const res = await pool.query(
      'UPDATE "user" SET password_hash = $1 WHERE email = $2 RETURNING *',
      [hash, email]
    );
    if (res.rowCount > 0) {
      console.log(`UPDATE_SUCCESS: User ${email} updated.`);
      
      // Immediate verification
      const isMatch = await bcrypt.compare(password, res.rows[0].password_hash);
      console.log("IMMEDIATE_VERIFICATION_nikita123:", isMatch);
    } else {
      console.log(`UPDATE_FAILED: User ${email} not found.`);
    }
  } catch (err) {
    console.error("DB_ERROR:", err);
  } finally {
    await pool.end();
  }
})();
