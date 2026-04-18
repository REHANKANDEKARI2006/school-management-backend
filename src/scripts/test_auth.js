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
    const res = await pool.query('SELECT * FROM "user" WHERE LOWER(email) = LOWER($1)', [email]);
    if (res.rows.length === 0) {
      console.log("TEST_RESULT: USER_NOT_FOUND");
    } else {
      const user = res.rows[0];
      console.log("USER_FOUND:", user.email);
      console.log("STORED_HASH:", user.password_hash);
      const isMatch = await bcrypt.compare(password, user.password_hash);
      console.log("BCRYPT_MATCH_RESULT:", isMatch);
      
      const newHash = await bcrypt.hash(password, 10);
      console.log("NEWLY_GENERATED_HASH_FOR_TEST:", newHash);
      const isMatchNew = await bcrypt.compare(password, newHash);
      console.log("BCRYPT_MATCH_WITH_NEW_HASH:", isMatchNew);
    }
  } catch (err) {
    console.error("DB_ERROR:", err);
  } finally {
    await pool.end();
  }
})();
