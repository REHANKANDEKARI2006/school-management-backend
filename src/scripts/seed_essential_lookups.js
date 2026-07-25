import db from '../../src/config/db.js';
import bcrypt from 'bcryptjs';

async function seedEssentialLookups() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('🌱 Seeding user roles...');
    await client.query(`
      INSERT INTO user_role (role_id, role_name, role_code, category, description) VALUES
      (1, 'Master Admin', 'MASTER_ADMIN', 'ADMIN', 'Super administrator with global access across all institutes'),
      (2, 'Institute Administrator', 'INSTITUTE_ADMIN', 'ADMIN', 'Administrator with full access to single institute'),
      (3, 'Teacher', 'TEACHER', 'STAFF', 'Academic teaching staff'),
      (4, 'Class Teacher', 'CLASS_TEACHER', 'STAFF', 'Teacher assigned as in-charge of a specific class/section'),
      (5, 'Department Head', 'DEPT_HEAD', 'STAFF', 'Head of an academic department'),
      (6, 'Accountant / Cashier', 'CASHIER', 'STAFF', 'Financial & fee collection management'),
      (7, 'Librarian', 'LIBRARIAN', 'STAFF', 'Library resources & issue management'),
      (8, 'Transport Manager', 'TRANSPORT_MGR', 'STAFF', 'Bus routes & transport management'),
      (9, 'Hostel Warden', 'HOSTEL_WARDEN', 'STAFF', 'Hostel accommodations management'),
      (10, 'Sports Manager', 'SPORTS_MANAGER', 'STAFF', 'Sports & athletics management'),
      (11, 'Exam Controller', 'EXAM_CONTROLLER', 'STAFF', 'Examination & grading system management'),
      (12, 'Admission Officer', 'ADMISSION_OFFICER', 'STAFF', 'Student admissions & lead management'),
      (13, 'Receptionist / Front Desk', 'RECEPTIONIST', 'STAFF', 'Visitor & inquiry desk'),
      (14, 'HR Manager', 'HR_MANAGER', 'STAFF', 'Staff payroll & attendance management'),
      (15, 'IT Administrator', 'IT_ADMIN', 'STAFF', 'Technical infrastructure & user access management'),
      (16, 'Academic Coordinator', 'ACADEMIC_COORD', 'STAFF', 'Curriculum & timetable planning coordinator'),
      (17, 'Management Member', 'MANAGEMENT_MEMBER', 'ADMIN', 'School board or executive management'),
      (18, 'Student', 'STUDENT', 'STUDENT', 'Enrolled student'),
      (19, 'Alumni', 'ALUMNI', 'STUDENT', 'Graduated student'),
      (20, 'Parent / Guardian', 'PARENT', 'GUARDIAN', 'Parent or legal guardian of enrolled student'),
      (21, 'Guest / Auditor', 'GUEST', 'GUEST', 'Read-only temporary access')
      ON CONFLICT (role_id) DO NOTHING
    `);

    console.log('🌱 Seeding user statuses...');
    await client.query(`
      INSERT INTO user_status (user_status_id, status_name) VALUES
      (1, 'Active'), (2, 'Inactive'), (3, 'Suspended'), (4, 'On Leave'),
      (5, 'Probation'), (6, 'Terminated'), (7, 'Resigned'), (8, 'Retired'),
      (9, 'Alumni'), (10, 'Rusticated'), (11, 'Banned'), (12, 'Transferred'),
      (13, 'Pending Approval')
      ON CONFLICT (user_status_id) DO NOTHING
    `);

    console.log('🌱 Seeding blood groups...');
    await client.query(`
      INSERT INTO blood_group (bg_id, bg_name, blood_group) VALUES
      (1, 'A+', 'A+'), (2, 'A-', 'A-'), (3, 'B+', 'B+'), (4, 'B-', 'B-'),
      (5, 'AB+', 'AB+'), (6, 'AB-', 'AB-'), (7, 'O+', 'O+'), (8, 'O-', 'O-')
      ON CONFLICT (bg_id) DO NOTHING
    `);

    console.log('🌱 Seeding genders...');
    await client.query(`
      INSERT INTO gender (gender_id, gender_name) VALUES
      (1, 'Male'), (2, 'Female'), (3, 'Other')
      ON CONFLICT (gender_id) DO NOTHING
    `);

    console.log('🌱 Seeding default institute...');
    await client.query(`
      INSERT INTO institute (institute_id, name, email, phone, address) VALUES
      (3, 'Sunshine Public School', 'admin@sunshine.edu.in', '+91 98765 43210', '123 Education Lane, Knowledge Park')
      ON CONFLICT (institute_id) DO NOTHING
    `);

    console.log('🌱 Seeding default school profile...');
    await client.query(`
      INSERT INTO school_profile (id, school_name, email, phone, address, academic_year, principal_name, logo_url) VALUES
      (3, 'Sunshine Public School', 'admin@sunshine.edu.in', '+91 98765 43210', '123 Education Lane, Knowledge Park', '2026-27', 'Dr. Ramesh Sharma', 'https://res.cloudinary.com/dmrin51u8/image/upload/v1713550000/logo_placeholder.png')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('🌱 Seeding Master Admin user...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const masterAdminUserRes = await client.query(`
      INSERT INTO "user" (user_id, user_name, institute_id, email, password_hash, role_id, is_active, status)
      VALUES (1, 'Master Admin', 3, 'masteradmin1@demo.edu.in', $1, 1, true, 'active')
      ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active', is_active = true
      RETURNING user_id
    `, [hashedPassword]);

    await client.query(`
      INSERT INTO master_admin (user_id, master_first_name, master_last_name, user_status_id)
      VALUES (1, 'Master', 'Admin', 1)
      ON CONFLICT (user_id) DO NOTHING
    `);

    // Reset sequences to MAX + 1
    const seqs = [
      ['user_role', 'role_id'],
      ['user_status', 'user_status_id'],
      ['blood_group', 'bg_id'],
      ['gender', 'gender_id'],
      ['institute', 'institute_id'],
      ['user', 'user_id']
    ];
    for (const [tbl, col] of seqs) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${tbl}', '${col}'), COALESCE((SELECT MAX(${col}) FROM "${tbl}"), 0) + 1, false)`);
    }

    await client.query('COMMIT');
    console.log('✅ Essential reference lookups & Master Admin seeded successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding essential lookups:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedEssentialLookups();
