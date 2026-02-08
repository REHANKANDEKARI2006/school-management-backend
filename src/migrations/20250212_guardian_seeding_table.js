// src/migrations/20250212_guardian_seeding_table.js
import db from '../config/db.js';
import { nameDictionary } from './nameDictionary.js';

// ---------- helpers ----------
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickReligionKey() {
  const keys = Object.keys(nameDictionary);
  return keys[Math.floor(Math.random() * keys.length)];
}

// female guardian name with given surname
function generateGuardianNameFemale(lastName) {
  const key = pickReligionKey();
  const dict = nameDictionary[key];
  const firstName = randomFrom(dict.firstNames);
  return { firstName, lastName, genderId: 2 }; // 2 = female
}

// ---------- 1. create table ----------
export async function createGuardianTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS guardian (
        guardian_id      SERIAL PRIMARY KEY,
        user_id          INTEGER UNIQUE,
        student_id       INTEGER,                -- NEW: link to student
        grdn_first_name  VARCHAR(100),
        grdn_last_name   VARCHAR(100),
        contact          VARCHAR(20),
        email            VARCHAR(150),
        address          TEXT,
        gender_id        INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT guardian_gender_id_fkey
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT guardian_student_id_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id)
      )
    `);
    console.log('guardian table ensured.');
  } catch (error) {
    console.error('createGuardianTable error:', error);
  }
}

// ---------- 2. drop table ----------
export async function dropGuardianTable() {
  try {
    await db.query('DROP TABLE IF EXISTS guardian CASCADE');
    console.log('guardian table dropped.');
  } catch (error) {
    console.error('dropGuardianTable error:', error);
  }
}

// 3A. SEED father guardians from students
export async function seedFatherGuardiansFromStudents() {
  // match these to your existing parent users (user_type = 'parent')
  const START_PARENT_USER_ID = 51; // first father parent user_id
  const END_PARENT_USER_ID   = 80; // last  father parent user_id

  try {
    // fetch students ordered by student_id in the range you want to create parents for
    const { rows: students } = await db.query(`
      SELECT student_id, stu_first_name, stu_last_name, address
      FROM student
      ORDER BY student_id
    `);

    if (!students.length) {
      console.log('No students found for father seeding.');
      return;
    }

    // fetch corresponding parent users
    const { rows: parents } = await db.query(
      `
        SELECT user_id
        FROM "user"
        WHERE user_id BETWEEN $1 AND $2
        ORDER BY user_id
      `,
      [START_PARENT_USER_ID, END_PARENT_USER_ID]
    );

    const count = Math.min(students.length, parents.length);
    if (!count) {
      console.log('No parent users found in given range.');
      return;
    }

    const values = [];
    for (let i = 0; i < count; i++) {
      const s = students[i];
      const p = parents[i];

      values.push(`
        (${p.user_id}, ${s.student_id},
         '${s.stu_first_name.replace(/'/g, "''")}',
         '${s.stu_last_name.replace(/'/g, "''")}',
         '9700000${(100 + i).toString().slice(-3)}',
         NULL,
         '${(s.address || '').replace(/'/g, "''")}',
         1
        )
      `);
    }

    await db.query(`
      INSERT INTO guardian (
        user_id,
        student_id,
        grdn_first_name,
        grdn_last_name,
        contact,
        email,
        address,
        gender_id
      )
      VALUES
        ${values.join(',')}
      ON CONFLICT (user_id) DO NOTHING
    `);

    console.log(`Inserted \${count} father guardians linked to students.`);
  } catch (error) {
    console.log('seedFatherGuardiansFromStudents error:', error);
  }
}


// 3B. SEED mother guardians from students
export async function seedMotherGuardiansFromStudents() {
  const START_PARENT_USER_ID = 81; // first mother parent user_id
  const END_PARENT_USER_ID   = 110;

  // simple list of Indian female names to pick from
  const motherNames = ['Anita', 'Kavita', 'Pooja', 'Sunita', 'Rakhi', 'Alka', 'Meena', 'Neha'];

  try {
    const { rows: students } = await db.query(`
      SELECT student_id, stu_last_name, address
      FROM student
      ORDER BY student_id
    `);

    const { rows: parents } = await db.query(
      `
        SELECT user_id
        FROM "user"
        WHERE user_id BETWEEN $1 AND $2
        ORDER BY user_id
      `,
      [START_PARENT_USER_ID, END_PARENT_USER_ID]
    );

    const count = Math.min(students.length, parents.length);
    if (!count) {
      console.log('No parent users / students for mother seeding.');
      return;
    }

    const values = [];
    for (let i = 0; i < count; i++) {
      const s = students[i];
      const p = parents[i];
      const firstName = motherNames[i % motherNames.length];

      values.push(`
        (${p.user_id}, ${s.student_id},
         '${firstName}',
         '${s.stu_last_name.replace(/'/g, "''")}',
         '9800000${(100 + i).toString().slice(-3)}',
         NULL,
         '${(s.address || '').replace(/'/g, "''")}',
         2
        )
      `);
    }

    await db.query(`
      INSERT INTO guardian (
        user_id,
        student_id,
        grdn_first_name,
        grdn_last_name,
        contact,
        email,
        address,
        gender_id
      )
      VALUES
        ${values.join(',')}
      ON CONFLICT (user_id) DO NOTHING
    `);

    console.log(`Inserted \${count} mother guardians linked to students.`);
  } catch (error) {
    console.log('seedMotherGuardiansFromStudents error:', error);
  }
}


// 4. REMOVE all guardians
export async function removeAllGuardians() {
  try {
    await db.query('DELETE FROM guardian');
    console.log('All guardian records deleted.');
  } catch (error) {
    console.log('removeAllGuardians error:', error);
  }
}

// Uncomment one per run as needed:
createGuardianTable();
// seedFatherGuardiansFromStudents();
// seedMotherGuardiansFromStudents();
// removeAllGuardians();
// dropGuardianTable();
