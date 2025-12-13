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
        guardian_id     SERIAL PRIMARY KEY,
        user_id         INTEGER UNIQUE,
        grdn_first_name VARCHAR(100),
        grdn_last_name  VARCHAR(100),
        contact         VARCHAR(20),
        email           VARCHAR(150),
        address         TEXT,
        gender_id       INTEGER,
        CONSTRAINT guardian_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id)
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

// ---------- 3A. seed FATHERS from students ----------
export async function seedFatherGuardiansFromStudents() {
  const START_PARENT_USER_ID = 121;   // parent users for fathers
  const END_PARENT_USER_ID = 140;

  const START_STUDENT_USER_ID = 101; // students batch
  const END_STUDENT_USER_ID = 120;

  try {
    const { rows: parentUsers } = await db.query(
      `
        SELECT user_id, user_name, email, phone
        FROM "user"
        WHERE user_id BETWEEN $1 AND $2
          AND user_type = 'parent'
          AND institute_id = 3
        ORDER BY user_id
      `,
      [START_PARENT_USER_ID, END_PARENT_USER_ID]
    );

    const { rows: students } = await db.query(
      `
        SELECT user_id, stu_middle_name, stu_last_name, address
        FROM student
        WHERE user_id BETWEEN $1 AND $2
          AND stu_middle_name IS NOT NULL
        ORDER BY user_id
      `,
      [START_STUDENT_USER_ID, END_STUDENT_USER_ID]
    );

    const count = Math.min(parentUsers.length, students.length);
    if (count === 0) {
      console.log('No parents or students for father guardians.');
      return;
    }

    const values = [];
    for (let i = 0; i < count; i++) {
      const u = parentUsers[i];
      const s = students[i];

      values.push(
        `(${u.user_id},
          '${s.stu_middle_name}',
          '${s.stu_last_name}',
          '${u.phone}',
          '${u.email}',
          '${s.address}',
          1)`
      ); // 1 = male
    }

    await db.query(`
      INSERT INTO guardian
        (user_id, grdn_first_name, grdn_last_name, contact, email, address, gender_id)
      VALUES
        ${values.join(',\n')}
    `);

    console.log(`Inserted ${values.length} father guardians.`);
  } catch (error) {
    console.error('seedFatherGuardiansFromStudents error:', error);
  }
}

// ---------- 3B. seed MOTHERS from students ----------
export async function seedMotherGuardiansFromStudents() {
  const START_PARENT_USER_ID = 141;   // parent users for mothers
  const END_PARENT_USER_ID = 142;

  const START_STUDENT_USER_ID = 119;
  const END_STUDENT_USER_ID = 120;

  try {
    const { rows: parentUsers } = await db.query(
      `
        SELECT user_id, user_name, email, phone
        FROM "user"
        WHERE user_id BETWEEN $1 AND $2
          AND user_type = 'parent'
          AND institute_id = 3
        ORDER BY user_id
      `,
      [START_PARENT_USER_ID, END_PARENT_USER_ID]
    );

    const { rows: students } = await db.query(
      `
        SELECT user_id, stu_last_name, address
        FROM student
        WHERE user_id BETWEEN $1 AND $2
        ORDER BY user_id
      `,
      [START_STUDENT_USER_ID, END_STUDENT_USER_ID]
    );

    const count = Math.min(parentUsers.length, students.length);
    if (count === 0) {
      console.log('No parents or students for mother guardians.');
      return;
    }

    const values = [];
    for (let i = 0; i < count; i++) {
      const u = parentUsers[i];
      const s = students[i];

      const g = generateGuardianNameFemale(s.stu_last_name);

      values.push(
        `(${u.user_id},
          '${g.firstName}',
          '${g.lastName}',
          '${u.phone}',
          '${u.email}',
          '${s.address}',
          ${g.genderId})`
      ); // 2 = female
    }

    await db.query(`
      INSERT INTO guardian
        (user_id, grdn_first_name, grdn_last_name, contact, email, address, gender_id)
      VALUES
        ${values.join(',\n')}
    `);

    console.log(`Inserted ${values.length} mother guardians.`);
  } catch (error) {
    console.error('seedMotherGuardiansFromStudents error:', error);
  }
}

// ---------- 4. delete all rows ----------
export async function deleteAllGuardians() {
  try {
    await db.query('DELETE FROM guardian');
    console.log('all guardians deleted.');
  } catch (error) {
    console.error('deleteAllGuardians error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createGuardianTable();
// dropGuardianTable();
// seedFatherGuardiansFromStudents();
seedMotherGuardiansFromStudents();
// deleteAllGuardians();
