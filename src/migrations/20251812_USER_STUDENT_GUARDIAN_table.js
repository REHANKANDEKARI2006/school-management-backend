// src/seed/20251218_seed_students_guardians_update.js
import db from '../config/db.js';
import { nameDictionary } from './nameDictionary.js';
import { addressDictionary } from './addressDictionary.js';

/**
 * CONFIG
 */
const INSTITUTE_ID = 3;
const STUDENT_ROLE_ID = 3;
const PARENT_ROLE_ID  = 4;
const STUDENT_ACCESS_ID = 3;
const PARENT_ACCESS_ID  = 4;

// REAL class_section_id values (30 rows: 1A–10C)
const classSectionIds = [
  61,62,63, 64,65,66, 67,68,69, 70,71,72, 73,74,75,
  76,77,78, 79,80,81, 82,83,84, 85,86,87, 88,89,90
];

const STUDENTS_PER_CLASS = 20;
const PASSWORD_HASH = 'demo-password-hash'; // replace with real hash if needed

//
// Helpers
//
function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickCommunity() {
  const keys = Object.keys(nameDictionary);
  return nameDictionary[randItem(keys)];
}

function buildRandomAddress() {
  const street = randItem(addressDictionary.streets);
  const area   = randItem(addressDictionary.areas);
  const city   = randItem(addressDictionary.cities);
  const state  = randItem(addressDictionary.states);
  return `${street}, ${area}, ${city}, ${state}`;
}

let guardianUserCounter = 1;
let studentUserCounter  = 1;

function buildGuardianCredentials() {
  const username = `guardian${guardianUserCounter}`;
  const email    = `guardian${guardianUserCounter}@example.com`;
  guardianUserCounter += 1;
  return { username, email };
}

function buildStudentCredentials() {
  const username = `student${studentUserCounter}`;
  const email    = `student${studentUserCounter}@example.com`;
  studentUserCounter += 1;
  return { username, email };
}

// guardian1(user_id 70) -> 9000000001, guardian2 -> 9000000002, etc.
function buildGuardianPhone(userId) {
  const pairIndex = Math.floor((userId - 70) / 2) + 1; // 1..600
  return `9000000${pairIndex.toString().padStart(4, '0')}`;
}

//
// 1. Prepare environment
//
export async function createStudentGuardianSeedEnv() {
  console.log('createStudentGuardianSeedEnv: nothing to create (tables already exist).');
}

//
// 2. Seed users, students, guardians and class_enrollment
//
export async function seedStudentsAndGuardians() {
  try {
    console.log('seeding students, guardians, users and class_enrollment...');
    
    // 1. Fetch Active Status ID dynamically
    const statusRes = await db.query(
      `SELECT user_status_id FROM user_status WHERE status_name = 'Active'`
    );
    if (statusRes.rows.length === 0) {
      throw new Error("Status 'Active' not found. Please seed user_status table first.");
    }
    const activeStatusId = statusRes.rows[0].user_status_id;

    await db.query('BEGIN');

    for (const classSectionId of classSectionIds) {
      for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
        const community     = pickCommunity();
        const guardianFirst = randItem(community.maleFirstNames);
        const surname       = randItem(community.surnames);
        const address       = buildRandomAddress();

        // ---------- guardian user ----------
        const guardianCred = buildGuardianCredentials();
        const guardianUserRes = await db.query(
          `
          INSERT INTO "user" (
            user_name,
            institute_id,
            email,
            phone,
            password_hash,
            role_id,
            is_active,
            email_verified,
            phone_verified,
            created_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,true,false,false, now(), now())
          RETURNING user_id
          `,
          [
            guardianCred.username,
            INSTITUTE_ID,
            guardianCred.email,
            null,                // phone set just after we know user_id
            PASSWORD_HASH,
            PARENT_ROLE_ID
          ]
        );
        const guardianUserId = guardianUserRes.rows[0].user_id;

        // compute and save guardian phone
        const guardianPhone = buildGuardianPhone(guardianUserId);
        await db.query(
          `UPDATE "user" SET phone = $1 WHERE user_id = $2`,
          [guardianPhone, guardianUserId]
        );

        // ---------- student user ----------
        const studentCred = buildStudentCredentials();
        const studentUserRes = await db.query(
          `
          INSERT INTO "user" (
            user_name,
            institute_id,
            email,
            phone,
            password_hash,
            role_id,
            is_active,
            email_verified,
            phone_verified,
            created_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,true,false,false, now(), now())
          RETURNING user_id
          `,
          [
            studentCred.username,
            INSTITUTE_ID,
            studentCred.email,
            null,                // will copy from guardianPhone
            PASSWORD_HASH,
            STUDENT_ROLE_ID
          ]
        );
        const studentUserId = studentUserRes.rows[0].user_id;

        // student gets same phone as guardian
        await db.query(
          `UPDATE "user" SET phone = $1 WHERE user_id = $2`,
          [guardianPhone, studentUserId]
        );

        // ---------- student ----------
        const stuFirst  = randItem(community.firstNames);
        const stuMiddle = guardianFirst; // guardian first name as middle name
        const stuLast   = surname;

        const studentRes = await db.query(
          `
          INSERT INTO student (
            student_user_id,
            stu_first_name,
            stu_middle_name,
            stu_last_name,
            email,
            address,
            date_of_birth,
            gender_id,
            bg_id,
            joined_date,
            access_id,
            user_status_id, -- New column name
            created_at,
            updated_at
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12, now(), now()
          )
          RETURNING student_id
          `,
          [
            studentUserId,
            stuFirst,
            stuMiddle,
            stuLast,
            studentCred.email,
            address,
            '2014-06-15',   // placeholder DOB
            1,              // gender_id
            1,              // bg_id
            '2024-06-01',   // joined_date
            STUDENT_ACCESS_ID,
            activeStatusId  // Dynamic Active Status ID
          ]
        );
        const studentId = studentRes.rows[0].student_id;

        // ---------- guardian ----------
        await db.query(
          `
          INSERT INTO guardian (
            guardian_user_id,
            grdn_first_name,
            grdn_last_name,
            student_id,
            phone,
            email,
            address,
            access_id,
            user_status_id, -- New column name
            created_at,
            updated_at,
            gender_id
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9, now(), now(), $10
          )
          `,
          [
            guardianUserId,
            guardianFirst,
            surname,
            studentId,
            null,                // will sync from user below
            guardianCred.email,
            address,
            PARENT_ACCESS_ID,
            activeStatusId,      // Dynamic Active Status ID
            1 // gender_id placeholder
          ]
        );

        // ---------- class_enrollment (assign student to class_section) ----------
        await db.query(
          `
          INSERT INTO class_enrollment (
            class_section_id,
            student_id,
            enrolled_on,
            status
          )
          VALUES ($1,$2, CURRENT_DATE, 'Active')
          `,
          [classSectionId, studentId]
        );
      }
    }

    // After all inserts, sync guardian.phone from its user.phone
    await db.query(`
      UPDATE guardian g
      SET phone = u.phone
      FROM "user" u
      WHERE u.user_id = g.guardian_user_id
    `);

    await db.query('COMMIT');
    console.log('seedStudentsAndGuardians completed successfully.');
  } catch (error) {
    console.error('seedStudentsAndGuardians error:', error);
    await db.query('ROLLBACK');
  }
}

//
// 3. Delete all seeded guardians, students, and enrollments
//
export async function deleteAllStudentsAndGuardians() {
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM class_enrollment');
    await db.query('DELETE FROM guardian');
    await db.query('DELETE FROM student');
    await db.query('COMMIT');
    console.log('all students, guardians and enrollments deleted.');
  } catch (error) {
    console.error('deleteAllStudentsAndGuardians error:', error);
    await db.query('ROLLBACK');
  }
}

//
// 4. Drop helper env
//
export async function dropStudentGuardianSeedEnv() {
  console.log('dropStudentGuardianSeedEnv: nothing to drop (uses existing tables).');
}

// Uncomment ONE at a time when running this file:
// createStudentGuardianSeedEnv();
// seedStudentsAndGuardians();
// deleteAllStudentsAndGuardians();
// dropStudentGuardianSeedEnv();