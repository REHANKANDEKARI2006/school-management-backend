import db from '../config/db.js';

// 1. Create class table
export async function createClassTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS class (
        class_name  VARCHAR(50),
        section_id  INTEGER,
        staff_id    INTEGER,
        room_number VARCHAR(10),
        class_id    SERIAL PRIMARY KEY,
        CONSTRAINT class_section_id_fkey FOREIGN KEY (section_id)
          REFERENCES public.section(section_id),
        CONSTRAINT class_staff_id_fkey FOREIGN KEY (staff_id)
          REFERENCES public.staff(staff_id)
      )
    `);
    console.log('Table \`class\` ensured.');
  } catch (error) {
    console.log('createClassTable error:', error);
  }
}

// 2. Drop class table
export async function dropClassTable() {
  try {
    await db.query('DROP TABLE IF EXISTS class CASCADE');
    console.log('Table `class` dropped.');
  } catch (error) {
    console.log('dropClassTable error:', error);
  }
}

// 3. Seed classes 1–10 (A,B,C) with fixed teachers and rooms
export async function seedClasses() {
  try {
    await db.query(`
      INSERT INTO class (class_name, section_id, staff_id, room_number)
      VALUES
        -- Class 1
        ('Class 1', 1,  1, '100'),
        ('Class 1', 2,  2, '101'),
        ('Class 1', 3,  3, '102'),

        -- Class 2
        ('Class 2', 1,  4, '103'),
        ('Class 2', 2,  5, '104'),
        ('Class 2', 3,  6, '105'),

        -- Class 3
        ('Class 3', 1,  7, '106'),
        ('Class 3', 2,  8, '107'),
        ('Class 3', 3,  9, '108'),

        -- Class 4
        ('Class 4', 1, 10, '109'),
        ('Class 4', 2, 17, '110'),
        ('Class 4', 3, 18, '111'),

        -- Class 5
        ('Class 5', 1, 19, '112'),
        ('Class 5', 2, 20, '113'),
        ('Class 5', 3, 21, '114'),

        -- Class 6
        ('Class 6', 1, 22, '115'),
        ('Class 6', 2, 23, '116'),
        ('Class 6', 3, 24, '117'),

        -- Class 7
        ('Class 7', 1, 25, '118'),
        ('Class 7', 2, 26, '119'),
        ('Class 7', 3, 29, '120'),

        -- Class 8
        ('Class 8', 1, 30, '121'),
        ('Class 8', 2, 31, '122'),
        ('Class 8', 3, 32, '123'),

        -- Class 9
        ('Class 9', 1, 33, '124'),
        ('Class 9', 2, 34, '125'),
        ('Class 9', 3, 35, '126'),

        -- Class 10
        ('Class 10', 1,  1, '127'),  -- you can rotate or reuse teachers as needed
        ('Class 10', 2,  2, '128'),
        ('Class 10', 3,  3, '129')
    `);
    console.log('Classes with assigned class teachers inserted.');
  } catch (error) {
    console.log('seedClasses error:', error);
  }
}

// 4. Remove all class rows
export async function removeAllClasses() {
  try {
    await db.query('DELETE FROM class');
    console.log('All class records deleted.');
  } catch (error) {
    console.log('removeAllClasses error:', error);
  }
}

// Uncomment one at a time:
// createClassTable();
seedClasses();
// removeAllClasses();
// dropClassTable();
