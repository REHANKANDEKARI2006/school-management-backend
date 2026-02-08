// src/migrations/20251216_user_table.js
import db from '../config/db.js';

//
// 1. CREATE user table (with role_id FK)
//
export async function createUserTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        user_id        SERIAL PRIMARY KEY,
        user_name      VARCHAR(100) UNIQUE NOT NULL,
        institute_id   INTEGER NOT NULL,
        email          VARCHAR(150) UNIQUE NOT NULL,
        phone          VARCHAR(20),
        password_hash  VARCHAR(255) NOT NULL,
        role_id        INTEGER,                     -- FK to user_role
        is_active      BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        email_token    VARCHAR(100),
        phone_verified BOOLEAN DEFAULT FALSE,
        phone_token    VARCHAR(100),
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now(),
        last_login     TIMESTAMPTZ,
        CONSTRAINT user_institute_id_fkey
          FOREIGN KEY (institute_id) REFERENCES public.institute(institute_id),
        CONSTRAINT user_role_id_fkey
          FOREIGN KEY (role_id) REFERENCES public.user_role(role_id)
      )
    `);
    console.log('Table `user` ensured.');
  } catch (error) {
    console.error('createUserTable error:', error);
  }
}

//
// 2. DROP user table
//
export async function dropUserTable() {
  try {
    await db.query('DROP TABLE IF EXISTS "user" CASCADE');
    console.log('Table `user` dropped.');
  } catch (error) {
    console.error('dropUserTable error:', error);
  }
}

// helper to fetch role_id by role_code from user_role
async function getRoleId(roleCode) {
  const { rows } = await db.query(
    'SELECT role_id FROM user_role WHERE role_code = $1',
    [roleCode]
  );
  if (!rows.length) {
    throw new Error(`Role not found for role_code=${roleCode}`);
  }
  return rows[0].role_id;
}

//
// 3. SEED demo users (master_admin, admins, staff) using role_id
//
export async function seedUsers() {
  try {
    const masterAdminRoleId   = await getRoleId('MASTER_ADMIN');
    const instituteAdminRoleId = await getRoleId('INSTITUTE_ADMIN');
    const teacherRoleId       = await getRoleId('TEACHER');
    const cashierRoleId       = await getRoleId('CASHIER');
    const librarianRoleId     = await getRoleId('LIBRARIAN');
    const managementRoleId    = await getRoleId('MANAGEMENT_MEMBER');
    const sportsMgrRoleId     = await getRoleId('SPORTS_MANAGER');

    await db.query(`
      INSERT INTO "user"
        (user_name, institute_id, email, phone, password_hash,
         role_id, is_active, email_verified, email_token,
         phone_verified, phone_token, last_login)
      VALUES
        -- Master Admins
        ('masteradmin1', 3, 'masteradmin1@demo.edu.in', '9000000001',
         'hash_masteradmin1', ${masterAdminRoleId},
         true, true, '', true, '', NOW()),
        ('masteradmin2', 3, 'masteradmin2@demo.edu.in', '9000000002',
         'hash_masteradmin2', ${masterAdminRoleId},
         true, true, '', true, '', NOW()),

        -- Admins (Institute Admin)
        ('admin.rahul', 3, 'rahul.admin@demo.edu.in', '9000000010',
         'hash_adminr', ${instituteAdminRoleId},
         true, true, '', true, '', NOW()),
        ('admin.rita', 3, 'rita.admin@demo.edu.in', '9000000011',
         'hash_adminrita', ${instituteAdminRoleId},
         true, false, '', true, '', NULL),
        ('admin.jay', 3, 'jay.admin@demo.edu.in', '9000000012',
         'hash_adminjay', ${instituteAdminRoleId},
         true, true, '', false, '', NULL),

        -- Staff: Teachers (30)
        ('teacher1',  3, 'teacher1@demo.edu.in',  '9100000001',
         'hash_teacher1',  ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher2',  3, 'teacher2@demo.edu.in',  '9100000002',
         'hash_teacher2',  ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher3',  3, 'teacher3@demo.edu.in',  '9100000003',
         'hash_teacher3',  ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher4',  3, 'teacher4@demo.edu.in',  '9100000004',
         'hash_teacher4',  ${teacherRoleId},
         true, true,  '', false, '', NULL),
        ('teacher5',  3, 'teacher5@demo.edu.in',  '9100000005',
         'hash_teacher5',  ${teacherRoleId},
         true, false, '', true,  '', NULL),
        ('teacher6',  3, 'teacher6@demo.edu.in',  '9100000006',
         'hash_teacher6',  ${teacherRoleId},
         true, true,  '', false, '', NULL),
        ('teacher7',  3, 'teacher7@demo.edu.in',  '9100000007',
         'hash_teacher7',  ${teacherRoleId},
         true, false, '', true,  '', NULL),
        ('teacher8',  3, 'teacher8@demo.edu.in',  '9100000008',
         'hash_teacher8',  ${teacherRoleId},
         true, true,  '', false, '', NULL),
        ('teacher9',  3, 'teacher9@demo.edu.in',  '9100000009',
         'hash_teacher9',  ${teacherRoleId},
         false,false,'', false, '', NULL),
        ('teacher10', 3, 'teacher10@demo.edu.in', '9100000010',
         'hash_teacher10', ${teacherRoleId},
         true, false, '', true,  '', NULL),
        ('teacher11', 3, 'teacher11@demo.edu.in', '9100000011',
         'hash_teacher11', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher12', 3, 'teacher12@demo.edu.in', '9100000012',
         'hash_teacher12', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher13', 3, 'teacher13@demo.edu.in', '9100000013',
         'hash_teacher13', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher14', 3, 'teacher14@demo.edu.in', '9100000014',
         'hash_teacher14', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher15', 3, 'teacher15@demo.edu.in', '9100000015',
         'hash_teacher15', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher16', 3, 'teacher16@demo.edu.in', '9100000016',
         'hash_teacher16', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher17', 3, 'teacher17@demo.edu.in', '9100000017',
         'hash_teacher17', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher18', 3, 'teacher18@demo.edu.in', '9100000018',
         'hash_teacher18', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher19', 3, 'teacher19@demo.edu.in', '9100000019',
         'hash_teacher19', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher20', 3, 'teacher20@demo.edu.in', '9100000020',
         'hash_teacher20', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher21', 3, 'teacher21@demo.edu.in', '9100000021',
         'hash_teacher21', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher22', 3, 'teacher22@demo.edu.in', '9100000022',
         'hash_teacher22', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher23', 3, 'teacher23@demo.edu.in', '9100000023',
         'hash_teacher23', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher24', 3, 'teacher24@demo.edu.in', '9100000024',
         'hash_teacher24', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher25', 3, 'teacher25@demo.edu.in', '9100000025',
         'hash_teacher25', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher26', 3, 'teacher26@demo.edu.in', '9100000026',
         'hash_teacher26', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher27', 3, 'teacher27@demo.edu.in', '9100000027',
         'hash_teacher27', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher28', 3, 'teacher28@demo.edu.in', '9100000028',
         'hash_teacher28', ${teacherRoleId},
         true, false, '', false, '', NULL),
        ('teacher29', 3, 'teacher29@demo.edu.in', '9100000029',
         'hash_teacher29', ${teacherRoleId},
         true, true,  '', true,  '', NULL),
        ('teacher30', 3, 'teacher30@demo.edu.in', '9100000030',
         'hash_teacher30', ${teacherRoleId},
         true, false, '', false, '', NULL),

        -- Staff: Cashiers (2)
        ('cashier1', 3, 'cashier1@demo.edu.in',  '9200000001',
         'hash_cashier1', ${cashierRoleId},
         true, false, '', false, '', NULL),
        ('cashier2', 3, 'cashier2@demo.edu.in',  '9200000002',
         'hash_cashier2', ${cashierRoleId},
         false,false,'', false, '', NULL),

        -- Staff: Librarian (1)
        ('librarian', 3, 'librarian@demo.edu.in', '9300000001',
         'hash_librarian', ${librarianRoleId},
         true, false, '', false, '', NULL),

        -- Staff: Management (4)  (1 existing + 3 more office/HR roles)
        ('management', 3, 'management@demo.edu.in', '9400000001',
         'hash_management', ${managementRoleId},
         true, false, '', false, '', NULL),
        ('office.staff1', 3, 'office.staff1@demo.edu.in', '9400000002',
         'hash_office1', ${managementRoleId},
         true, false, '', false, '', NULL),
        ('office.staff2', 3, 'office.staff2@demo.edu.in', '9400000003',
         'hash_office2', ${managementRoleId},
         true, false, '', false, '', NULL),
        ('hr.manager', 3, 'hr.manager@demo.edu.in', '9400000004',
         'hash_hrmanager', ${managementRoleId},
         true, false, '', false, '', NULL),

        -- Staff: Sports Manager (1) + 2 sports assistants
        ('sportsmgr',  3, 'sportsmgr@demo.edu.in',  '9500000001',
         'hash_sportsmgr',  ${sportsMgrRoleId},
         true, false, '', false, '', NULL),
        ('sports.asst1',3, 'sports.asst1@demo.edu.in','9500000002',
         'hash_sportsasst1', ${sportsMgrRoleId},
         true, false, '', false, '', NULL),
        ('sports.asst2',3, 'sports.asst2@demo.edu.in','9500000003',
         'hash_sportsasst2', ${sportsMgrRoleId},
         true, false, '', false, '', NULL)

      ON CONFLICT (user_name) DO NOTHING
    `);

    console.log('Demo users batch inserted!');
  } catch (error) {
    console.error('seedUsers error:', error);
  }
}

//
// 4. DELETE all users
//
export async function deleteAllUsers() {
  try {
    await db.query('DELETE FROM "user"');
    console.log('All users deleted.');
  } catch (error) {
    console.error('deleteAllUsers error:', error);
  }
}

// Uncomment ONE at a time when running this file:
// createUserTable();
// dropUserTable();
seedUsers();
// deleteAllUsers();