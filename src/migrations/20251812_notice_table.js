// src/migrations/20251218_notices_table.js
import db from '../config/db.js';

//
// 1. Create notices table
//
export async function createNoticesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notices (
        notice_id     SERIAL PRIMARY KEY,
        title         VARCHAR(150) NOT NULL,
        content       TEXT NOT NULL,
        author_name   VARCHAR(100) NOT NULL,
        author_type   VARCHAR(30) NOT NULL, -- 'admin' / 'staff'
        author_id     INTEGER,             -- FK to staff/admin user
        audience_id   INTEGER NOT NULL,    -- FK to notice_audience
        img_url       VARCHAR(255),
        attachment_id INTEGER,            -- FK to notice_attachment
        post_date     DATE DEFAULT CURRENT_DATE,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT notices_audience_fkey
          FOREIGN KEY (audience_id) REFERENCES public.notice_audience(audience_id),
        CONSTRAINT notices_attachment_fkey
          FOREIGN KEY (attachment_id) REFERENCES public.notice_attachment(attachment_id)
      )
    `);
    console.log('notices table ensured.');
  } catch (error) {
    console.error('createNoticesTable error:', error);
  }
}

//
// 2. Drop notices table
//
export async function dropNoticesTable() {
  try {
    await db.query('DROP TABLE IF EXISTS notices CASCADE');
    console.log('notices table dropped.');
  } catch (error) {
    console.error('dropNoticesTable error:', error);
  }
}

//
// 3. Seed demo general notices
//    Assumes notice_audience ids 33–48 and
//    notice_attachment ids: 1 = reopen PDF, 2 = essay poster, 3 = pre‑board schedule.
//
export async function seedGeneralNotices() {
  try {
    const values = [
      // 33 = Entire School, attachment_id = 1 (reopen circular)
      `('School Reopens After Vacation',
        'School will reopen on 10 June. All students must report in proper uniform with ID cards.',
        'Principal', 'admin', 1,
        33,
        NULL,
        4,
        '2026-05-25', now(), now())`,

      // 34 = All Students, no attachment yet
      `('Uniform and ID Card Reminder',
        'Students are requested to follow the updated uniform guidelines and carry ID cards daily.',
        'Discipline In‑charge', 'staff', 5,
        34,
        NULL,
        NULL,
        '2026-06-01', now(), now())`,

      // 35 = All Staff, no attachment
      `('Staff Meeting',
        'All teaching and non‑teaching staff must attend the monthly review meeting in the auditorium.',
        'Principal', 'admin', 1,
        35,
        NULL,
        NULL,
        '2026-06-05', now(), now())`,

      // 36 = Language Department, attachment_id = 2 (essay poster / rules)
      `('Language Dept – Essay Competition',
        'Essay competition on the topic "My India @ 2047" for Classes 6–10. Submit entries by 20 July.',
        'HOD Language', 'staff', 12,
        36,
        NULL,
        5,
        '2026-07-05', now(), now())`,

      // 37 = Science Department, no attachment here (details via separate file if needed)
      `('Science Exhibition Guidelines',
        'Selected students must submit final model details to the Science Department by 30 August.',
        'HOD Science', 'staff', 15,
        37,
        NULL,
        NULL,
        '2026-08-10', now(), now())`,

      // 38 = Mathematics Department
      `('Maths Remedial Classes',
        'Remedial classes for weak students will be conducted after school on Mondays and Wednesdays.',
        'HOD Mathematics', 'staff', 18,
        38,
        NULL,
        NULL,
        '2026-07-15', now(), now())`,

      // 39 = Social Science Department
      `('Social Science Project Submission',
        'Students must submit social science projects to their respective teachers by 10 September.',
        'HOD Social Science', 'staff', 20,
        39,
        NULL,
        NULL,
        '2026-08-25', now(), now())`,

      // 40 = Class 1 – All Sections
      `('Class 1 – Parents Meeting',
        'Parent–Teacher meeting for Class 1 will be held on Saturday from 9:00 AM to 11:00 AM.',
        'Class 1 Coordinator', 'staff', 21,
        40,
        NULL,
        NULL,
        '2026-06-20', now(), now())`,

      // 41 = Class 3 – All Sections
      `('Class 3 – Holiday Homework Reminder',
        'Students of Class 3 must complete holiday homework and bring it on reopening day.',
        'Class 3 Coordinator', 'staff', 22,
        41,
        NULL,
        NULL,
        '2026-05-30', now(), now())`,

      // 42 = Class 5 – All Sections
      `('Class 5 – Science Test',
        'Class 5 unit test in Science (Chapter 3 and 4) will be held next Monday.',
        'Science Teacher Class 5', 'staff', 23,
        42,
        NULL,
        NULL,
        '2026-07-01', now(), now())`,

      // 43 = Class 8 – All Sections
      `('Class 8 – Field Trip',
        'Class 8 students will visit the Science Centre. Consent forms must be submitted by 5 August.',
        'Excursion In‑charge', 'staff', 24,
        43,
        NULL,
        NULL,
        '2026-07-25', now(), now())`,

      // 44 = Class 10 – All Sections, attachment_id = 3 (pre‑board schedule PDF)
      `('Class 10 – Pre‑Board Schedule',
        'Pre‑Board examination schedule for Class 10 is published on the school website.',
        'Exam Cell', 'staff', 25,
        44,
        NULL,
        6,
        '2026-11-15', now(), now())`,

      // 45 = Class 6 – Section A
      `('Class 6A – Maths Test',
        'Chapter 1 and 2 unit test will be conducted on Friday. Students must bring geometry boxes.',
        'Class 6A Class Teacher', 'staff', 31,
        45,
        NULL,
        NULL,
        '2026-07-12', now(), now())`,

      // 46 = Class 6 – Section B
      `('Class 6B – English Reading Assessment',
        'Reading assessment for Class 6B will be conducted during English period on Wednesday.',
        'English Teacher 6B', 'staff', 32,
        46,
        NULL,
        NULL,
        '2026-07-18', now(), now())`,

      // 47 = Class 6 – Section C
      `('Class 6C – Science Project',
        'Students of Class 6C must bring materials for the group science project on renewable energy.',
        'Science Teacher 6C', 'staff', 33,
        47,
        NULL,
        NULL,
        '2026-08-02', now(), now())`,

      // 48 = Class 7 – Section B
      `('Class 7B – History Assignment',
        'Complete History Chapter 2 assignment and submit it by next Thursday.',
        'History Teacher 7B', 'staff', 34,
        48,
        NULL,
        NULL,
        '2026-08-10', now(), now())`
    ];

    await db.query(`
      INSERT INTO notices (
        title,
        content,
        author_name,
        author_type,
        author_id,
        audience_id,
        img_url,
        attachment_id,
        post_date,
        created_at,
        updated_at
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log('general notices seeded.');
  } catch (error) {
    console.error('seedGeneralNotices error:', error);
  }
}

//
// 4. Delete all notices
//
export async function deleteAllNotices() {
  try {
    await db.query('DELETE FROM notices');
    console.log('all notices deleted.');
  } catch (error) {
    console.error('deleteAllNotices error:', error);
  }
}

// Uncomment ONE at a time when running this file:
createNoticesTable();
// dropNoticesTable();
// seedGeneralNotices();
// deleteAllNotices();