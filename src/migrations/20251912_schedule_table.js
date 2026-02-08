// src/migrations/20251219_schedule_table.js
import db from '../config/db.js';

export async function createScheduleTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        schedule_id   SERIAL PRIMARY KEY,
        class_id      INTEGER NOT NULL,
        staff_id      INTEGER NOT NULL,
        subject_id    INTEGER NOT NULL,
        schedule_date DATE,
        day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        period_number SMALLINT NOT NULL,
        start_time    TIME NOT NULL,
        end_time      TIME NOT NULL,
        room_id       INTEGER,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT schedule_class_fkey
          FOREIGN KEY (class_id)   REFERENCES public.class(class_id),
        CONSTRAINT schedule_staff_fkey
          FOREIGN KEY (staff_id)   REFERENCES public.staff(staff_id),
        CONSTRAINT schedule_subject_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id)
      );

      -- class cannot have 2 entries in same slot
      CREATE UNIQUE INDEX IF NOT EXISTS schedule_class_slot_uk
        ON schedule (class_id, day_of_week, period_number);
      -- NOTE: NO staff-slot unique index now, to avoid seeding conflicts
    `);
    console.log('schedule table ensured.');
  } catch (err) {
    console.error('createScheduleTable error:', err);
  }
}

export async function seedSchedule() {
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM schedule');

    // adjust to your real IDs
    const classIds   = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
    const staffIds   = [101, 102, 103, 104, 105, 106];
    const subjectIds = [1, 2, 3, 4, 5, 6];

    const PERIODS_PER_DAY = 6;
    const DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

    const periodTimes = [
      { start: '09:00', end: '09:45' },
      { start: '09:50', end: '10:35' },
      { start: '10:40', end: '11:25' },
      { start: '11:30', end: '12:15' },
      { start: '13:00', end: '13:45' },
      { start: '13:50', end: '14:35' }
    ];

    for (const classId of classIds) {
      for (const day of DAYS) {
        for (let p = 0; p < PERIODS_PER_DAY; p++) {
          const periodNo = p + 1;
          const { start, end } = periodTimes[p];

          const staffId   = staffIds[(classId + day + p) % staffIds.length];
          const subjectId = subjectIds[(classId + p) % subjectIds.length];

          await db.query(
            `
            INSERT INTO schedule (
              class_id,
              staff_id,
              subject_id,
              schedule_date,
              day_of_week,
              period_number,
              start_time,
              end_time,
              room_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `,
            [
              classId,
              staffId,
              subjectId,
              null,
              day,
              periodNo,
              start,
              end,
              null
            ]
          );
        }
      }
    }

    await db.query('COMMIT');
    console.log('seedSchedule completed.');
  } catch (err) {
    console.error('seedSchedule error:', err);
    await db.query('ROLLBACK');
  }
}

export async function clearSchedule() {
  try {
    await db.query('DELETE FROM schedule');
    console.log('all schedule rows deleted.');
  } catch (err) {
    console.error('clearSchedule error:', err);
  }
}

export async function dropScheduleTable() {
  try {
    await db.query('DROP TABLE IF EXISTS schedule CASCADE');
    console.log('schedule table dropped.');
  } catch (err) {
    console.error('dropScheduleTable error:', err);
  }
}



// Run one at a time:
// createScheduleTable();
seedSchedule();
// clearSchedule();
// dropScheduleTable();
