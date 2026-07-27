import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

async function addMissingColumns() {
  try {
    await pool.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS institute_id INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE`);
    console.log("✅ Verified institute_id column on question_papers table.");
  } catch (err) {
    console.error("Error adding column:", err.message);
  }
}

addMissingColumns();
