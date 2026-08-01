import pool from '../config/db.js';

async function checkTemplates() {
  const { rows } = await pool.query(`
    SELECT institute_id, school_name, selected_id_card_template, selected_bonafide_template, selected_mark_sheet_template
    FROM school_profile
  `);
  console.log("School Profiles Template Configuration:", rows);
  process.exit(0);
}

checkTemplates().catch(console.error);
