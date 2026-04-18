import pool from "../config/db.js";

async function alterStaffTable() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Adding profile_url column to staff table...");
    await client.query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS profile_url VARCHAR(1000);
    `);

    await client.query("COMMIT");
    console.log("Successfully added profile_url column.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error altering table:", error);
  } finally {
    client.release();
    pool.end();
  }
}

alterStaffTable();
