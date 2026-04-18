import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function verify() {
  console.log("Starting verification...");

  try {
    // Investigative step: List columns for related tables
    const subColsRes = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'subject'
    `);
    console.log("Columns in 'subject' table:", subColsRes.rows.map(r => r.column_name));

    const bgColsRes = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'blood_group'
    `);
    console.log("Columns in 'blood_group' table:", bgColsRes.rows.map(r => r.column_name));

    // 1. Check if we can fetch a teacher with the new fields
    const res = await pool.query(`
      SELECT s.staff_id, s.qualification, s.subject_id, sub.subject_name, s.bg_id, bg.blood_group
      FROM staff s
      LEFT JOIN subject sub ON s.subject_id = sub.subject_id
      LEFT JOIN blood_group bg ON s.bg_id = bg.bg_id
      LIMIT 1
    `);

    if (res.rows.length === 0) {
      console.error("No staff found for testing!");
      return;
    }

    const teacher = res.rows[0];
    console.log("Initial Teacher Data:", {
      id: teacher.staff_id,
      qualification: teacher.qualification,
      subject: teacher.subject_name,
      blood_group: teacher.blood_group
    });

    // 2. Simulate an update
    const testQual = "BSc Computer Science, MSc AI (Updated Test)";
    await pool.query(
      "UPDATE staff SET qualification = $1 WHERE staff_id = $2",
      [testQual, teacher.staff_id]
    );

    // 3. Verify update
    const res2 = await pool.query(
      "SELECT qualification FROM staff WHERE staff_id = $1",
      [teacher.staff_id]
    );
    
    if (res2.rows[0].qualification === testQual) {
      console.log("✅ Qualification update verified successfully!");
    } else {
      console.error("❌ Qualification update failed!");
    }

  } catch (err) {
    console.error("Verification failed with error:", err);
  } finally {
    await pool.end();
  }
}

verify();
