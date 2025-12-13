import db from '../config/db.js';

// 1. Create the subject_type_table
export async function createSubjectTypeTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subject_type_table (
        subject_type_id SERIAL PRIMARY KEY,
        type_name VARCHAR(50)
      )
    `);
    console.log('Table `subject_type_table` ensured.');
  } catch (error) {
    console.log('createSubjectTypeTable error:', error);
  }
}

// 2. Drop the subject_type_table
export async function dropSubjectTypeTable() {
  try {
    await db.query('DROP TABLE IF EXISTS subject_type_table');
    console.log('Table `subject_type_table` dropped.');
  } catch (error) {
    console.log('dropSubjectTypeTable error:', error);
  }
}

// 3. Seed demo subject types
export async function seedSubjectTypes() {
  try {
    await db.query(`
      INSERT INTO subject_type_table (type_name) VALUES
        ('Theory'),
        ('Practical'),
        ('Lab'),
        ('Outdoor'),
        ('Project')
    `);
    console.log('Demo subject types inserted!');
  } catch (error) {
    console.log('seedSubjectTypes error:', error);
  }
}

// 4. Remove all subject types
export async function removeAllSubjectTypes() {
  try {
    await db.query('DELETE FROM subject_type_table');
    console.log('All subject type records deleted.');
  } catch (error) {
    console.log('removeAllSubjectTypes error:', error);
  }
}

// Uncomment only one at a time
// createSubjectTypeTable();
// seedSubjectTypes();
// removeAllSubjectTypes();
// dropSubjectTypeTable();
