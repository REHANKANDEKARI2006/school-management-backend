import pool from "../config/db.js";

async function setupDocumentsDB() {
  const client = await pool.connect();
  try {
    console.log("Starting DB migration for Documents system...");
    await client.query("BEGIN");

    // Create school_profile table
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_profile (
          id SERIAL PRIMARY KEY,
          school_name VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          phone VARCHAR(50),
          email VARCHAR(100),
          affiliation_number VARCHAR(100),
          principal_name VARCHAR(255),
          logo_url TEXT,
          signature_url TEXT,
          primary_color VARCHAR(20) DEFAULT '#000000',
          academic_year VARCHAR(20),
          selected_id_card_template VARCHAR(50) DEFAULT 'template1',
          selected_bonafide_template VARCHAR(50) DEFAULT 'template1',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created table: school_profile");

    // Create generated_documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS generated_documents (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES student(student_id),
          doc_type VARCHAR(50) NOT NULL, -- 'ID_CARD' or 'BONAFIDE'
          template_id VARCHAR(50) NOT NULL,
          generated_by INTEGER REFERENCES "user"(user_id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created table: generated_documents");

    await client.query("COMMIT");
    console.log("DB migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error running DB migration:", err);
  } finally {
    client.release();
    process.exit();
  }
}

setupDocumentsDB();
