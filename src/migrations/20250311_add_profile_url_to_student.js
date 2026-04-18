import db from '../config/db.js';

export async function addProfileUrlToStudent() {
  try {
    await db.query(`
      ALTER TABLE student
      ADD COLUMN profile_url VARCHAR(255);
    `);
    console.log('Column profile_url added to student table successfully.');
  } catch (error) {
    if (error.code === '42701') { // Duplicate column
      console.log('Column profile_url already exists in student table.');
    } else {
      console.error('Error adding profile_url column:', error);
    }
  }
}

addProfileUrlToStudent();
