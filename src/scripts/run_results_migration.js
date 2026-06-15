import pool from "../config/db.js";

async function run() {
  console.log("Starting Results System database migrations...");
  try {
    // 1. Add marks_status to exam table if it doesn't exist
    await pool.query(`
      ALTER TABLE exam 
      ADD COLUMN IF NOT EXISTS marks_status VARCHAR(50) DEFAULT 'Pending'
    `);
    console.log("✓ Added marks_status column to exam table.");

    // 2. Create student_results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_results (
        result_id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        exam_name VARCHAR(255) NOT NULL,
        total_obtained DOUBLE PRECISION NOT NULL,
        total_max DOUBLE PRECISION NOT NULL,
        percentage DOUBLE PRECISION NOT NULL,
        grade VARCHAR(10) NOT NULL,
        result_status VARCHAR(50) DEFAULT 'Generated',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (student_id, exam_name)
      )
    `);
    console.log("✓ Created student_results table.");
    
    console.log("PostgreSQL Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
