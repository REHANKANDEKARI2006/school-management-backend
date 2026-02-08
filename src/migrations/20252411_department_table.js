import db from '../config/db.js';

// 1. Create department table if not exists
export async function createDepartmentTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS department (
        dept_id SERIAL PRIMARY KEY,
        dept_name VARCHAR(100) NOT NULL
      )
    `);
    console.log('Table `department` ensured.');
  } catch (error) {
    console.log('createDepartmentTable error:', error);
  }
}

// 2. Drop/delete department table
export async function dropDepartmentTable() {
  try {
    await db.query('DROP TABLE IF EXISTS department');
    console.log('Table `department` dropped.');
  } catch (error) {
    console.log('dropDepartmentTable error:', error);
  }
}

// 3. Seed demo departments (typical Indian school)
export async function seedDepartments() {
  try {
    await db.query(`
      INSERT INTO department (dept_name) VALUES
        ('Language'),
        ('Mathematics'),
        ('Science'),
        ('Social Science'),
        ('History'),
        ('Geography'),
        ('Physical Education & Sports'),
        ('Computer Science'),
        ('Accounts & Finance'),
        ('Library'),
        ('Art & Craft'),
        ('Music')
    `);
    console.log('Demo departments for Blue Bridge School inserted!');
  } catch (error) {
    console.log('seedDepartments error:', error);
  }
}

// 4. Remove all department rows (for rollback/testing)
export async function removeAllDepartments() {
  try {
    await db.query('DELETE FROM department');
    console.log('All department records deleted.');
  } catch (error) {
    console.log('removeAllDepartments error:', error);
  }
}

// Uncomment only one at a time as needed:
// createDepartmentTable();
seedDepartments();
// removeAllDepartments();
// dropDepartmentTable();