// src/migrations/20251225_master_admin_table_update.js
import db from '../config/db.js';

// 1. Create the master_admin table if not exists
export async function createMasterAdminTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_admin (
        master_admin_id    SERIAL PRIMARY KEY,
        user_id            INTEGER UNIQUE,
        m_admin_first_name VARCHAR(100),
        m_admin_last_name  VARCHAR(100),
        email              VARCHAR(255),
        phone              VARCHAR(20),
        gender_id          INTEGER,
        user_status_id     INTEGER NOT NULL, -- New status column
        created_at         TIMESTAMPTZ DEFAULT now(),
        updated_at         TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT master_admin_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id),
        CONSTRAINT master_admin_gender_id_fkey 
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT master_admin_user_status_fkey
          FOREIGN KEY (user_status_id) REFERENCES public.user_status(user_status_id)
      )
    `);
    console.log('Table `master_admin` ensured with user_status_id.');
  } catch (error) {
    console.log('createMasterAdminTable error:', error);
  }
}

// 2. Drop/delete the master_admin table
export async function dropMasterAdminTable() {
  try {
    await db.query('DROP TABLE IF EXISTS master_admin CASCADE');
    console.log('Table `master_admin` dropped.');
  } catch (error) {
    console.log('dropMasterAdminTable error:', error);
  }
}

// 3. Seed demo data for two master admins (institute 3)
export async function seedMasterAdmins() {
  try {
    // 1. Fetch the ID for 'Active' status dynamically
    const statusRes = await db.query(
      `SELECT user_status_id FROM user_status WHERE status_name = 'Active'`
    );

    if (statusRes.rows.length === 0) {
      throw new Error("Status 'Active' not found in user_status table. Please seed user_status first.");
    }
    const activeStatusId = statusRes.rows[0].user_status_id;

    // 2. Insert Master Admins with the fetched status ID
    await db.query(`
      INSERT INTO master_admin
        (user_id, m_admin_first_name, m_admin_last_name, email, phone, gender_id, user_status_id, updated_at)
      VALUES
        (
          (SELECT user_id FROM "user" WHERE user_name = 'masteradmin1' AND institute_id = 3),
          'Karim', 'Shaikh', 'masteradmin1@demo.edu.in', '9000000001',
          1,  -- gender_id (Male)
          ${activeStatusId}, -- Active status
          NOW()
        ),
        (
          (SELECT user_id FROM "user" WHERE user_name = 'masteradmin2' AND institute_id = 3),
          'Ravi', 'Prasad', 'masteradmin2@demo.edu.in', '9000000002',
          1,  -- gender_id (Male)
          ${activeStatusId}, -- Active status
          NOW()
        )
      ON CONFLICT (user_id) DO NOTHING
    `);
    console.log('Two master admins seeded with Active status!');
  } catch (error) {
    console.log('seedMasterAdmins error:', error);
  }
}

// 4. Remove all master admins (for rollback/testing)
export async function removeAllMasterAdmins() {
  try {
    await db.query('DELETE FROM master_admin');
    console.log('All master_admin records deleted.');
  } catch (error) {
    console.log('removeAllMasterAdmins error:', error);
  }
}

// Uncomment ONLY ONE at a time as needed:
// createMasterAdminTable();
// seedMasterAdmins();
// removeAllMasterAdmins();
// dropMasterAdminTable();