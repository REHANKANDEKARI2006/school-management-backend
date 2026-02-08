// src/migrations/20251218_students_guardians_tables_update.js
import db from '../config/db.js';

//
// 1. Create student table
//
export async function createStudentTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS student (
        student_id       SERIAL PRIMARY KEY,
        student_user_id  INTEGER NOT NULL,
        stu_first_name   VARCHAR(100) NOT NULL,
        stu_middle_name  VARCHAR(100),
        stu_last_name    VARCHAR(100) NOT NULL,
        email            VARCHAR(150),
        address          TEXT,
        date_of_birth    DATE,
        gender_id        INTEGER,
        bg_id            INTEGER,
        joined_date      DATE,
        access_id        INTEGER,
        user_status_id   INTEGER NOT NULL, -- New status column
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT student_user_fkey
          FOREIGN KEY (student_user_id) REFERENCES public."user"(user_id),
        CONSTRAINT student_access_fkey
          FOREIGN KEY (access_id) REFERENCES public.access_table(access_id),
        CONSTRAINT student_user_status_fkey
          FOREIGN KEY (user_status_id) REFERENCES public.user_status(user_status_id),
        CONSTRAINT student_gender_fkey
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT student_bg_fkey
          FOREIGN KEY (bg_id) REFERENCES public.blood_group(bg_id)
      )
    `);
    console.log('student table ensured with user_status_id.');
  } catch (error) {
    console.error('createStudentTable error:', error);
  }
}

//
// 2. Drop student table
//
export async function dropStudentTable() {
  try {
    await db.query('DROP TABLE IF EXISTS student CASCADE');
    console.log('student table dropped.');
  } catch (error) {
    console.error('dropStudentTable error:', error);
  }
}

//
// 3. Create guardian table
//
export async function createGuardianTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS guardian (
        guardian_id      SERIAL PRIMARY KEY,
        guardian_user_id INTEGER NOT NULL,
        grdn_first_name  VARCHAR(100) NOT NULL,
        grdn_last_name   VARCHAR(100) NOT NULL,
        student_id       INTEGER NOT NULL,
        phone            VARCHAR(20),
        email            VARCHAR(150),
        address          TEXT,
        access_id        INTEGER,
        user_status_id   INTEGER NOT NULL, -- New status column
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        gender_id        INTEGER,

        CONSTRAINT guardian_user_fkey
          FOREIGN KEY (guardian_user_id) REFERENCES public."user"(user_id),
        CONSTRAINT guardian_student_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id),
        CONSTRAINT guardian_access_fkey
          FOREIGN KEY (access_id) REFERENCES public.access_table(access_id),
        CONSTRAINT guardian_user_status_fkey
          FOREIGN KEY (user_status_id) REFERENCES public.user_status(user_status_id),
        CONSTRAINT guardian_gender_fkey
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id)
      )
    `);
    console.log('guardian table ensured with user_status_id.');
  } catch (error) {
    console.error('createGuardianTable error:', error);
  }
}

//
// 4. Drop guardian table
//
export async function dropGuardianTable() {
  try {
    await db.query('DROP TABLE IF EXISTS guardian CASCADE');
    console.log('guardian table dropped.');
  } catch (error) {
    console.error('dropGuardianTable error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createStudentTable();
// dropStudentTable();
// createGuardianTable();
// dropGuardianTable();