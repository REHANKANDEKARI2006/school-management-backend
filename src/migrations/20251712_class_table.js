import db from '../config/db.js';

//
// 1. Create class table
//
export async function createClassTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS class (
        class_id    SERIAL PRIMARY KEY,
        class_name  VARCHAR(50),
        section_id  INTEGER,
        staff_id    INTEGER,              -- class teacher (FK to staff)
        room_number VARCHAR(10),
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT class_section_id_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id),
        CONSTRAINT class_staff_id_fkey
          FOREIGN KEY (staff_id)   REFERENCES public.staff(staff_id)
      )
    `);
    console.log('Table `class` ensured.');
  } catch (error) {
    console.log('createClassTable error:', error);
  }
}

//
// 2. Drop class table
//
export async function dropClassTable() {
  try {
    await db.query('DROP TABLE IF EXISTS class CASCADE');
    console.log('Table `class` dropped.');
  } catch (error) {
    console.log('dropClassTable error:', error);
  }
}

//
// 3. Seed classes 1–10 (A,B,C) with class teachers and timestamps
//
export async function seedClasses() {
  try {
    await db.query(`
      INSERT INTO class (
        class_name, section_id, staff_id, room_number,
        created_at, updated_at
      )
      VALUES
        -- Class 1 (sections A,B,C)
        ('Class 1', 1,  115, '100', now(), now()),
        ('Class 1', 2,  114, '101', now(), now()),
        ('Class 1', 3,  113, '102', now(), now()),

        -- Class 2
        ('Class 2', 1,  105, '103', now(), now()),
        ('Class 2', 2,  104, '104', now(), now()),
        ('Class 2', 3,  103, '105', now(), now()),

        -- Class 3
        ('Class 3', 1,  102, '106', now(), now()),
        ('Class 3', 2,  101, '107', now(), now()),
        ('Class 3', 3,  100, '108', now(), now()),

        -- Class 4
        ('Class 4', 1, 99, '109', now(), now()),
        ('Class 4', 2, 98, '110', now(), now()),
        ('Class 4', 3, 97, '111', now(), now()),

        -- Class 5
        ('Class 5', 1, 96, '112', now(), now()),
        ('Class 5', 2, 95, '113', now(), now()),
        ('Class 5', 3, 94, '114', now(), now()),

        -- Class 6
        ('Class 6', 1, 93, '115', now(), now()),
        ('Class 6', 2, 92, '116', now(), now()),
        ('Class 6', 3, 91, '117', now(), now()),

        -- Class 7
        ('Class 7', 1, 90, '118', now(), now()),
        ('Class 7', 2, 89, '119', now(), now()),
        ('Class 7', 3, 88, '120', now(), now()),

        -- Class 8
        ('Class 8', 1, 87, '121', now(), now()),
        ('Class 8', 2, 86, '122', now(), now()),
        ('Class 8', 3, 78, '123', now(), now()),

        -- Class 9
        ('Class 9', 1, 84, '124', now(), now()),
        ('Class 9', 2, 83, '125', now(), now()),
        ('Class 9', 3, 82, '126', now(), now()),

        -- Class 10 (reusing teachers as class teachers)
        ('Class 10', 1,  80, '127', now(), now()),
        ('Class 10', 2,  79, '128', now(), now()),
        ('Class 10', 3,  85, '129', now(), now())
    `);
    console.log('Classes with assigned class teachers inserted.');
  } catch (error) {
    console.log('seedClasses error:', error);
  }
}

//
// 4. Remove all class rows
//
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