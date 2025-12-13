import db from '../config/db.js';

// 1. Create the staff table (user_id as FK)
export async function createStaffTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,  -- Must be unique in case each user can only be one staff
        staff_first_name VARCHAR(100),
        staff_last_name VARCHAR(100),
        title VARCHAR(50),
        email VARCHAR(150),
        contact VARCHAR(20),
        qualification TEXT,
        dept_id INTEGER,
        subject_id INTEGER,
        status_id INTEGER,
        bg_id INTEGER,
        gender_id INTEGER,
        CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
        CONSTRAINT staff_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.department(dept_id),
        CONSTRAINT staff_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT staff_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.status(status_id),
        CONSTRAINT staff_bg_id_fkey FOREIGN KEY (bg_id) REFERENCES public.blood_group(bg_id),
        CONSTRAINT staff_gender_id_fkey FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id)
      )
    `);
    console.log('Table `staff` ensured.');
  } catch (error) {
    console.log('createStaffTable error:', error);
  }
}

// 2. Drop the staff table
export async function dropStaffTable() {
  try {
    await db.query('DROP TABLE IF EXISTS staff');
    console.log('Table `staff` dropped.');
  } catch (error) {
    console.log('dropStaffTable error:', error);
  }
}

// 3. Seed: Match user_id based on user table usernames
export async function seedStaff() {
  try {
    await db.query(`
      INSERT INTO staff (
        user_id, staff_first_name, staff_last_name, title, email, contact, qualification,
        dept_id, subject_id, status_id, bg_id, gender_id
      )
      VALUES
        -- Teachers
        ((SELECT user_id FROM "user" WHERE user_name='teacher1' AND institute_id=3), 'Ankit', 'Mathur', 'Teacher', 'teacher1@demo.edu.in', '9100000001', 'MSc Math', 2, 3, 1, 1, 1),
        ((SELECT user_id FROM "user" WHERE user_name='teacher2' AND institute_id=3), 'Ayushi', 'Verma', 'Teacher', 'teacher2@demo.edu.in', '9100000002', 'MA Eng', 1, 1, 1, 2, 2),
        ((SELECT user_id FROM "user" WHERE user_name='teacher3' AND institute_id=3), 'Rahul', 'Singh', 'Teacher', 'teacher3@demo.edu.in', '9100000003', 'MSc Science', 3, 5, 1, 1, 1),
        ((SELECT user_id FROM "user" WHERE user_name='teacher4' AND institute_id=3), 'Pooja', 'Sharma', 'Teacher', 'teacher4@demo.edu.in', '9100000004', 'MA Hindi', 1, 2, 1, 2, 2),
        ((SELECT user_id FROM "user" WHERE user_name='teacher5' AND institute_id=3), 'Mohit', 'Kumar', 'Teacher', 'teacher5@demo.edu.in', '9100000005', 'MSc Physics', 3, 6, 1, 1, 1),
        ((SELECT user_id FROM "user" WHERE user_name='teacher6' AND institute_id=3), 'Simran', 'Patel', 'Teacher', 'teacher6@demo.edu.in', '9100000006', 'MSc Comp Sci', 8, 8, 1, 2, 2),
        ((SELECT user_id FROM "user" WHERE user_name='teacher7' AND institute_id=3), 'Ramesh', 'Yadav', 'Teacher', 'teacher7@demo.edu.in', '9100000007', 'MSc Bio', 3, 7, 1, 1, 1),
        ((SELECT user_id FROM "user" WHERE user_name='teacher8' AND institute_id=3), 'Priya', 'Jain', 'Teacher', 'teacher8@demo.edu.in', '9100000008', 'MA Geo', 6, 10, 1, 2, 2),
        ((SELECT user_id FROM "user" WHERE user_name='teacher9' AND institute_id=3), 'Vinay', 'Nair', 'Teacher', 'teacher9@demo.edu.in', '9100000009', 'MA Hist', 5, 9, 1, 1, 1),
        ((SELECT user_id FROM "user" WHERE user_name='teacher10' AND institute_id=3), 'Deepa', 'Gupta', 'Teacher', 'teacher10@demo.edu.in', '9100000010', 'MA Soc Sci', 4, 4, 1, 2, 2),

        -- Other staff
        ((SELECT user_id FROM "user" WHERE user_name='cashier1' AND institute_id=3), 'Alok', 'Shah', 'Cashier', 'cashier1@demo.edu.in', '9200000001', 'BCom', 9, NULL, 1, 1, 1),
        ((SELECT user_id FROM "user" WHERE user_name='cashier2' AND institute_id=3), 'Kavita', 'Joshi', 'Cashier', 'cashier2@demo.edu.in', '9200000002', 'BCom', 9, NULL, 1, 2, 2),
        ((SELECT user_id FROM "user" WHERE user_name='librarian' AND institute_id=3), 'Meena', 'Kaur', 'Librarian', 'librarian@demo.edu.in', '9300000001', 'MLISc', 10, NULL, 1, 2, 2),
        ((SELECT user_id FROM "user" WHERE user_name='management' AND institute_id=3), 'Sanjay', 'Mehta', 'Management', 'management@demo.edu.in', '9400000001', 'MBA', NULL, NULL, 1, 1, 1),
        ((SELECT user_id FROM "user" WHERE user_name='sportsmgr' AND institute_id=3), 'Anil', 'Raj', 'Sports Manager', 'sportsmgr@demo.edu.in', '9500000001', 'BPEd', 7, NULL, 1, 1, 1)
    `);
    console.log('Demo staff inserted!');
  } catch (error) {
    console.log('seedStaff error:', error);
  }
}

// 4. Remove all staff (for reseeding/testing)
export async function removeAllStaff() {
  try {
    await db.query('DELETE FROM staff');
    console.log('All staff records deleted.');
  } catch (error) {
    console.log('removeAllStaff error:', error);
  }
}

// Uncomment ONE at a time as needed:
// createStaffTable();
seedStaff();
// removeAllStaff();
// dropStaffTable();
