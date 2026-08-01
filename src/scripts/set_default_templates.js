import pool from '../config/db.js';

async function setDefaultTemplates() {
  console.log("Updating school_profile default document templates...");

  await pool.query(`
    UPDATE school_profile
    SET selected_bonafide_template = 'template2'
    WHERE selected_bonafide_template IS NULL OR selected_bonafide_template = 'template1';
  `);

  console.log("✅ School profiles updated with template2 for Bonafide Certificate.");
  process.exit(0);
}

setDefaultTemplates().catch(console.error);
