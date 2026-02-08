// src/migrations/20251214_user_role_table.js
import db from '../config/db.js';

//
// 1. CREATE user_role table
//
export async function createUserRoleTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_role (
        role_id      SERIAL PRIMARY KEY,
        role_code    VARCHAR(50)  UNIQUE NOT NULL, -- e.g. MASTER_ADMIN
        role_name    VARCHAR(100) NOT NULL,        -- e.g. Master Administrator
        category     VARCHAR(50)  NOT NULL,        -- 'System','Admin','Staff','Student','Guardian','Support'
        description  TEXT
      )
    `);
    console.log('user_role table ensured.');
  } catch (error) {
    console.error('createUserRoleTable error:', error);
  }
}

//
// 2. DROP user_role table (optional)
//
export async function dropUserRoleTable() {
  try {
    await db.query('DROP TABLE IF EXISTS user_role CASCADE');
    console.log('user_role table dropped.');
  } catch (error) {
    console.error('dropUserRoleTable error:', error);
  }
}

//
// 3. SEED detailed roles for a school (classes 1–12)
//
export async function seedUserRoles() {
  try {
    const values = [
      // role_code,           role_name,                     category,   description

      // System / super admin
      `('MASTER_ADMIN',      'Master Administrator',        'System',   'Owner of the platform; manages all institutes and system settings')`,
      `('INSTITUTE_ADMIN',   'Institute Administrator',     'Admin',    'School-level admin; manages classes, staff, students, and guardians')`,

      // Core staff (teaching)
      `('TEACHER',           'Teacher',                     'Staff',    'Subject/grade teacher responsible for teaching and assessments')`,
      `('CLASS_TEACHER',     'Class Teacher',               'Staff',    'Teacher in charge of a specific class/section')`,
      `('MENTOR',            'Mentor',                      'Staff',    'Teacher mentoring a group of students for guidance and counselling')`,

      // Academic support staff
      `('LIBRARIAN',         'Librarian',                   'Staff',    'Manages library, books, and student borrowing records')`,
      `('LAB_ASSISTANT',     'Lab Assistant',               'Staff',    'Supports science/computer labs and practical sessions')`,
      `('SPORTS_MANAGER',    'Sports Manager',              'Staff',    'Manages sports activities, teams, and sports inventory')`,
      `('COUNSELLOR',        'School Counsellor',           'Staff',    'Provides academic and personal counselling for students')`,

      // Administration / office staff
      `('PRINCIPAL',         'Principal',                   'Admin',    'Head of the school; high-level approvals and reporting')`,
      `('VICE_PRINCIPAL',    'Vice Principal',              'Admin',    'Assists principal in academic and administrative duties')`,
      `('OFFICE_STAFF',      'Office Staff',                'Staff',    'General administrative/clerical duties')`,
      `('CASHIER',           'Cashier',                     'Staff',    'Handles fee collection and payment receipts')`,
      `('ACCOUNTANT',        'Accountant',                  'Staff',    'Manages school accounts and financial records')`,
      `('ADMISSION_OFFICER', 'Admission Officer',           'Staff',    'Handles student admissions and related documentation')`,

      // Management / governance
      `('MANAGEMENT_MEMBER', 'Management Committee Member', 'Management','Member of school management / trust / board')`,
      `('HR_MANAGER',        'HR Manager',                  'Management','Handles staff recruitment, leaves, and HR policies')`,

      // Student & guardian
      `('STUDENT',           'Student',                     'Student',  'Enrolled student from class 1 to 12')`,
      `('CLASS_REPRESENTATIVE','Class Representative',      'Student',  'Student representative / class monitor')`,
      `('GUARDIAN',          'Guardian / Parent',           'Guardian', 'Parent or guardian of one or more students')`,

      // Support & technical
      `('IT_SUPPORT',        'IT Support',                  'Support',  'Manages technical issues, user accounts, and system support')`,
      `('LIBRARY_ASSISTANT', 'Library Assistant',           'Support',  'Assists librarian in day-to-day tasks')`,

      // Demo / guest
      `('DEMO_USER',         'Demo Guest User',             'Demo',     'Guest user allowed to explore demo data and switch roles in demo mode')`
    ];

    await db.query(`
      INSERT INTO user_role (role_code, role_name, category, description)
      VALUES
        ${values.join(',\n')}
      ON CONFLICT (role_code) DO NOTHING
    `);

    console.log('user_role seed inserted/updated.');
  } catch (error) {
    console.error('seedUserRoles error:', error);
  }
}

//
// 4. DELETE all roles (optional)
//
export async function deleteAllUserRoles() {
  try {
    await db.query('DELETE FROM user_role');
    console.log('all roles deleted from user_role.');
  } catch (error) {
    console.error('deleteAllUserRoles error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createUserRoleTable();
// dropUserRoleTable();
seedUserRoles();
// deleteAllUserRoles();