import db from '../config/db.js';

// 1. Create staff table
export async function createStaffTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id         SERIAL PRIMARY KEY,
        user_id          INTEGER UNIQUE,
        role_id          INTEGER,              -- NEW: link to user_role
        staff_first_name VARCHAR(100),
        staff_last_name  VARCHAR(100),
        title            VARCHAR(50),
        email            VARCHAR(150),
        contact          VARCHAR(20),
        qualification    TEXT,
        dept_id          INTEGER,
        subject_id       INTEGER,
        status_id        INTEGER,
        bg_id            INTEGER,
        gender_id        INTEGER,
        joining_date     DATE,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT staff_bg_id_fkey
          FOREIGN KEY (bg_id) REFERENCES public.blood_group(bg_id),
        CONSTRAINT staff_dept_id_fkey
          FOREIGN KEY (dept_id) REFERENCES public.department(dept_id),
        CONSTRAINT staff_gender_id_fkey
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT staff_status_id_fkey
          FOREIGN KEY (status_id) REFERENCES public.status(status_id),
        CONSTRAINT staff_subject_id_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT staff_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id),
        CONSTRAINT staff_role_id_fkey
          FOREIGN KEY (role_id) REFERENCES public.user_role(role_id)
      )
    `);
    console.log('Table `staff` ensured.');
  } catch (error) {
    console.log('createStaffTable error:', error);
  }
}

// 2. Drop staff table
export async function dropStaffTable() {
  try {
    await db.query('DROP TABLE IF EXISTS staff CASCADE');
    console.log('Table `staff` dropped.');
  } catch (error) {
    console.log('dropStaffTable error:', error);
  }
}

// 3. Seed staff (35 rows: 25 teachers, 2 cashiers, 1 librarian, 1 management, 1 sports manager, 5 extra non‑teaching staff)
export async function seedStaff() {
  try {
    await db.query(`
      INSERT INTO staff (
  user_id, role_id,
  staff_first_name, staff_last_name, title,
  email, contact, qualification,
  dept_id, subject_id, status_id, bg_id, gender_id,
  joining_date, created_at, updated_at
)
VALUES
  -- Teachers 1–10 (Math/English/Science/etc.)
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher1' AND institute_id = 3),
   3, 'Anwar', 'Shaikh', 'Teacher', 'teacher1@demo.edu.in', '9100000001', 'MSc Mathematics',
   2, 3, 1, 1, 1, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher2' AND institute_id = 3),
   3, 'Ayesha', 'Shaikh', 'Teacher', 'teacher2@demo.edu.in', '9100000002', 'MA English',
   1, 1, 1, 2, 2, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher3' AND institute_id = 3),
   3, 'Ramsha', 'Khan', 'Teacher', 'teacher3@demo.edu.in', '9100000003', 'MSc Science',
   3, 5, 1, 1, 1, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher4' AND institute_id = 3),
   3, 'Pooja', 'Sharma', 'Teacher', 'teacher4@demo.edu.in', '9100000004', 'MA Hindi',
   1, 2, 1, 2, 2, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher5' AND institute_id = 3),
   3, 'Mohit', 'Kumar', 'Teacher', 'teacher5@demo.edu.in', '9100000005', 'MSc Physics',
   3, 6, 1, 1, 1, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher6' AND institute_id = 3),
   3, 'Simran','Patel','Teacher','teacher6@demo.edu.in','9100000006','MSc Comp. Sci.',
   8, 8, 1, 2, 2, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher7' AND institute_id = 3),
   3, 'Ramesh','Yadav','Teacher','teacher7@demo.edu.in','9100000007','MSc Biology',
   3, 7, 1, 1, 1, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher8' AND institute_id = 3),
   3, 'Priya','Jain','Teacher','teacher8@demo.edu.in','9100000008','MA Geography',
   6,10,1,2,2, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher9' AND institute_id = 3),
   3, 'Vinay','Nair','Teacher','teacher9@demo.edu.in','9100000009','MA History',
   5, 9,1,1,1, DATE '2023-06-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher10' AND institute_id = 3),
   3, 'Deepa','Gupta','Teacher','teacher10@demo.edu.in','9100000010','MA Social Sci.',
   4, 4,1,2,2, DATE '2023-06-10', now(), now()),

  -- Teachers 11–20
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher11' AND institute_id = 3),
   3, 'Kamyar','Ali','Teacher','teacher11@demo.edu.in','9100000011','MSc Chemistry',
   3, 6,1,1,2, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher12' AND institute_id = 3),
   3, 'Lata','Iyer','Teacher','teacher12@demo.edu.in','9100000012','MSc Physics',
   3, 6,1,2,2, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher13' AND institute_id = 3),
   3, 'Suhas','Patel','Teacher','teacher13@demo.edu.in','9100000013','MA Economics',
   4,11,1,1,1, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher14' AND institute_id = 3),
   3, 'Neha','Rao','Teacher','teacher14@demo.edu.in','9100000014','MA Political Sci.',
   4,12,1,2,2, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher15' AND institute_id = 3),
   3, 'Arjun','Chopra','Teacher','teacher15@demo.edu.in','9100000015','MSc Biology',
   3, 7,1,1,1, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher16' AND institute_id = 3),
   3, 'Shruti','Mishra','Teacher','teacher16@demo.edu.in','9100000016','MSc Computer Sci.',
   8, 8,1,2,2, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher17' AND institute_id = 3),
   3, 'Harish','Bose','Teacher','teacher17@demo.edu.in','9100000017','MA English',
   1, 1,1,1,1, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher18' AND institute_id = 3),
   3, 'Sarah','Khan','Teacher','teacher18@demo.edu.in','9100000018','MSc Mathematics',
   2, 3,1,2,2, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher19' AND institute_id = 3),
   3, 'Zobia','Mobeen','Teacher','teacher19@demo.edu.in','9100000019','MSc Physics',
   3, 6,1,1,1, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher20' AND institute_id = 3),
   3, 'Alina','Fernandes','Teacher','teacher20@demo.edu.in','9100000020','MA Geography',
   6,10,1,2,2, DATE '2023-07-01', now(), now()),

  -- Teachers 21–30
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher21' AND institute_id = 3),
   3, 'Rekha','Pillai','Teacher','teacher21@demo.edu.in','9100000021','MA Hindi',
   1, 2,1,2,2, DATE '2023-08-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher22' AND institute_id = 3),
   3, 'Mukesh','Chawla','Teacher','teacher22@demo.edu.in','9100000022','MA History',
   5, 9,1,1,1, DATE '2023-08-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher23' AND institute_id = 3),
   3, 'Namra','Baig','Teacher','teacher23@demo.edu.in','9100000023','MA Civics',
   4,12,1,2,2, DATE '2023-08-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher24' AND institute_id = 3),
   3, 'Rohit','Bhatia','Teacher','teacher24@demo.edu.in','9100000024','MSc Chemistry',
   3, 6,1,1,1, DATE '2023-08-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher25' AND institute_id = 3),
   3, 'Anita','Thakur','Teacher','teacher25@demo.edu.in','9100000025','MSc Biology',
   3, 7,1,2,2, DATE '2023-08-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher26' AND institute_id = 3),
   3, 'Nikhil','Pandey','Teacher','teacher26@demo.edu.in','9100000026','MSc Mathematics',
   2, 3,1,1,1, DATE '2023-09-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher27' AND institute_id = 3),
   3, 'Garima','Kotwal','Teacher','teacher27@demo.edu.in','9100000027','MA English',
   1, 1,1,2,2, DATE '2023-09-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher28' AND institute_id = 3),
   3, 'Imran','Qureshi','Teacher','teacher28@demo.edu.in','9100000028','MSc Physics',
   3, 6,1,1,1, DATE '2023-09-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher29' AND institute_id = 3),
   3, 'Rina','Gadre','Teacher','teacher29@demo.edu.in','9100000029','MA Geography',
   6,10,1,2,2, DATE '2023-09-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'teacher30' AND institute_id = 3),
   3, 'Sandeep','Rawat','Teacher','teacher30@demo.edu.in','9100000030','MSc Biology',
   3, 7,1,1,1, DATE '2023-09-01', now(), now()),

  -- Cashiers (2)
  ((SELECT user_id FROM "user" WHERE user_name = 'cashier1' AND institute_id = 3),
   12, 'Alok','Shah','Cashier','cashier1@demo.edu.in','9200000001','BCom Finance',
   9, NULL,1,1,1, DATE '2023-07-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'cashier2' AND institute_id = 3),
   12, 'Kareem','Mulla','Cashier','cashier2@demo.edu.in','9200000002','BCom Accounts',
   9, NULL,1,2,2, DATE '2023-07-01', now(), now()),

  -- Librarian (1)
  ((SELECT user_id FROM "user" WHERE user_name = 'librarian' AND institute_id = 3),
   6, 'Meena','Kaur','Librarian','librarian@demo.edu.in','9300000001','MLISc',
   10,NULL,1,2,2, DATE '2022-06-15', now(), now()),

  -- Management / office / HR (4)
  ((SELECT user_id FROM "user" WHERE user_name = 'management' AND institute_id = 3),
   16, 'Sanjay','Mehta','Management','management@demo.edu.in','9400000001','MBA',
   NULL,NULL,1,1,1, DATE '2021-04-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'office.staff1' AND institute_id = 3),
   16, 'Leena','Rathi','Office Staff','office.staff1@demo.edu.in','9400000002','BBA',
   NULL,NULL,1,2,2, DATE '2023-03-15', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'office.staff2' AND institute_id = 3),
   16, 'Amit','Salunke','Office Staff','office.staff2@demo.edu.in','9400000003','BCom',
   NULL,NULL,1,1,1, DATE '2023-03-15', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'hr.manager' AND institute_id = 3),
   16, 'Ravi','Kapoor','HR Manager','hr.manager@demo.edu.in','9400000004','MBA HR',
   NULL,NULL,1,1,1, DATE '2023-02-01', now(), now()),

  -- Sports Manager + assistants (3)
  ((SELECT user_id FROM "user" WHERE user_name = 'sportsmgr' AND institute_id = 3),
   8, 'Anil','Raj','Sports Manager','sportsmgr@demo.edu.in','9500000001','BPEd',
   7,NULL,1,1,1, DATE '2022-01-10', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'sports.asst1' AND institute_id = 3),
   8, 'Prakash','More','PE Assistant','sports.asst1@demo.edu.in','9500000002','BPEd',
   7,NULL,1,1,1, DATE '2023-04-01', now(), now()),
  ((SELECT user_id FROM "user" WHERE user_name = 'sports.asst2' AND institute_id = 3),
   8, 'Sarika','Menon','PE Assistant','sports.asst2@demo.edu.in','9500000003','BPEd',
   7,NULL,1,2,2, DATE '2023-04-01', now(), now());

    `);

    console.log('Demo staff inserted!');
  } catch (error) {
    console.log('seedStaff error:', error);
  }
}

// 4. Remove all staff rows
export async function removeAllStaff() {
  try {
    await db.query('DELETE FROM staff');
    console.log('All staff records deleted.');
  } catch (error) {
    console.log('removeAllStaff error:', error);
  }
}


// Uncomment one at a time as needed:
// createStaffTable();
seedStaff();
// removeAllStaff();
// dropStaffTable();
