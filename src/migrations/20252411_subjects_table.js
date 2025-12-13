import db from '../config/db.js';

// 1. Create the subject table if not exists
export async function createSubjectTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subject (
        subject_id SERIAL PRIMARY KEY,
        subject_name VARCHAR(100),
        dept_id INTEGER,
        CONSTRAINT subject_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.department(dept_id)
      )
    `);
    console.log('Table `subject` ensured.');
  } catch (error) {
    console.log('createSubjectTable error:', error);
  }
}

// 2. Drop/delete subject table
export async function dropSubjectTable() {
  try {
    await db.query('DROP TABLE IF EXISTS subject');
    console.log('Table `subject` dropped.');
  } catch (error) {
    console.log('dropSubjectTable error:', error);
  }
}

// 3. Seed demo subjects. Adjust dept_id values to match your actual department table IDs!
export async function seedSubjects() {
  try {
    await db.query(`
      INSERT INTO subject (subject_name, dept_id) VALUES
        -- Language (dept_id = 1)
        ('English', 1),
        ('Hindi', 1),
        ('Urdu', 1),
        ('Marathi', 1),

        -- Mathematics (dept_id = 2)
        ('Mathematics 1', 2),
        ('Mathematics 2', 2),

        -- Science (dept_id = 3)
        ('Science 1', 3),
        ('Science 2', 3),

        -- Social Science (dept_id = 4)
        ('Social Science', 4),

        -- History (dept_id = 5)
        ('Ancient History', 5),
        ('Modern History', 5),

        -- Geography (dept_id = 6)
        ('Physical Geography', 6),
        ('Human Geography', 6),

        -- Physical Education & Sports (dept_id = 7)
        ('Physical Education', 7),
        ('Sports', 7),

        -- Computer Science (dept_id = 8)
        ('Basic Computers', 8),
        ('Computer Applications', 8),

        -- Accounts & Finance (dept_id = 9)
        ('Accounts', 9),
        ('Finance', 9),

        -- Library (dept_id = 10)
        ('Library Science', 10),

        -- Art & Craft (dept_id = 11)
        ('Fine Arts', 11),
        ('Craft', 11),

        -- Music (dept_id = 12)
        ('Vocal Music', 12),
        ('Instrumental Music', 12)
    `);
    console.log('Demo subjects inserted!');
  } catch (error) {
    console.log('seedSubjects error:', error);
  }
}

// 4. Remove all subjects (for rollback/testing)
export async function removeAllSubjects() {
  try {
    await db.query('DELETE FROM subject');
    console.log('All subject records deleted.');
  } catch (error) {
    console.log('removeAllSubjects error:', error);
  }
}

// Uncomment one at a time to use:
// createSubjectTable();
seedSubjects();
// removeAllSubjects();
// dropSubjectTable();
