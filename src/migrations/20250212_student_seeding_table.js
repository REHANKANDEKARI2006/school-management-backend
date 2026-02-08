import db from '../config/db.js';
import { nameDictionary } from './nameDictionary.js';
import { randomFrom, generateRandomAddress } from './seedUtils.js';


// ---------- helpers ----------
// function randomFrom(arr) {
//   return arr[Math.floor(Math.random() * arr.length)];
// }

function pickReligionKey() {
  const keys = Object.keys(nameDictionary);
  return keys[Math.floor(Math.random() * keys.length)];
}

function generateStudentName(fatherFirstName) {
  const key = pickReligionKey();
  const dict = nameDictionary[key];
  const isFemale = Math.random() < 0.5;

  const firstName = randomFrom(dict.firstNames);
  const lastName = randomFrom(dict.surnames);
  const middleName = fatherFirstName || null;
  const genderId = isFemale ? 2 : 1; // 1 = male, 2 = female

  return { firstName, middleName, lastName, genderId };
}

async function getFathers() {
  const { rows } = await db.query(`
    SELECT guardian_id, grdn_first_name
    FROM guardian
    WHERE gender_id = 1
    ORDER BY guardian_id
  `);
  return rows;
}

// ---------- 1. create table ----------
export async function createStudentTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS student (
        student_id      SERIAL PRIMARY KEY,
        user_id         INTEGER UNIQUE,
        stu_first_name  VARCHAR(100),
        stu_middle_name VARCHAR(100),
        stu_last_name   VARCHAR(100),
        email           VARCHAR(150),
        status          VARCHAR(50),
        address         TEXT,
        date_of_birth   DATE,
        bg_id           INTEGER,
        joined_date     DATE,
        gender_id       INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT student_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id)
      )
    `);
    console.log('student table ensured.');
  } catch (error) {
    console.error('createStudentTable error:', error);
  }
}

// ---------- 2. drop table ----------
export async function dropStudentTable() {
  try {
    await db.query('DROP TABLE IF EXISTS student CASCADE');
    console.log('student table dropped.');
  } catch (error) {
    console.error('dropStudentTable error:', error);
  }
}

// ---------- 3. seed students for a user_id range ----------
export async function seedStudentsForUserRange() {
  // >>> CHANGE THIS RANGE ONLY <<<
  const START_USER_ID = 143;   // first student user_id
  const END_USER_ID   = 162;  // last  student user_id

  try {
    const { rows: users } = await db.query(
      `
        SELECT user_id, user_name, email
        FROM "user"
        WHERE user_id BETWEEN $1 AND $2
        ORDER BY user_id
      `,
      [START_USER_ID, END_USER_ID]
    );

    if (users.length === 0) {
      console.log('No student users in this user_id range.');
      return;
    }

    const fathers = await getFathers();
    let fatherIdx = 0;

    const values = users.map(u => {
      let fatherFirstName = null;
      if (fatherIdx < fathers.length) {
        fatherFirstName = fathers[fatherIdx].grdn_first_name;
        fatherIdx++;
      }

      const s = generateStudentName(fatherFirstName);
      const bgId = 1;
      const status = 'Active';

      const address = generateRandomAddress();

      return `(${u.user_id},
        '${s.firstName}',
        ${s.middleName ? `'${s.middleName}'` : 'NULL'},
        '${s.lastName}',
        '${u.email}',
        '${status}',
        '${address}',
        DATE '2008-01-01' + (random() * 365)::int,
        ${bgId},
        CURRENT_DATE,
        ${s.genderId}
      )`;
    });

    await db.query(`
      INSERT INTO student (
        user_id,
        stu_first_name,
        stu_middle_name,
        stu_last_name,
        email,
        status,
        address,
        date_of_birth,
        bg_id,
        joined_date,
        gender_id
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log(`Inserted ${values.length} students.`);
  } catch (error) {
    console.error('seedStudentsForUserRange error:', error);
  }
}

// ---------- 4. delete all rows ----------
export async function deleteAllStudents() {
  try {
    await db.query('DELETE FROM student');
  console.log('all students deleted.');
  } catch (error) {
    console.error('deleteAllStudents error:', error);
  }
}

// Uncomment ONE at a time to run directly:
createStudentTable();
// dropStudentTable();
// seedStudentsForUserRange();
// deleteAllStudents();