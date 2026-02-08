// src/migrations/20251225_admin_table_update.js
import db from '../config/db.js';

// 1. Create the admin table if not exists
export async function createAdminTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin (
        admin_id         SERIAL PRIMARY KEY,
        user_id          INTEGER UNIQUE,
        admin_first_name VARCHAR(100),
        admin_last_name  VARCHAR(100),
        email            VARCHAR(150),
        contact          VARCHAR(20),
        gender_id        INTEGER,
        user_status_id   INTEGER NOT NULL, -- New status column
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT admin_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public."user"(user_id),
        CONSTRAINT admin_gender_id_fkey 
          FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT admin_user_status_fkey
          FOREIGN KEY (user_status_id) REFERENCES public.user_status(user_status_id)
      )
    `);
    console.log('Table `admin` ensured with user_status_id.');
  } catch (error) {
    console.log('createAdminTable error:', error);
  }
}

// 2. Drop/delete the admin table
export async function dropAdminTable() {
  try {
    await db.query('DROP TABLE IF EXISTS admin CASCADE');
    console.log('Table `admin` dropped.');
  } catch (error) {
    console.log('dropAdminTable error:', error);
  }
}

// 3. Seed demo admins
export async function seedAdmins() {
  try {
    // 1. Fetch the ID for 'Active' status dynamically
    const statusRes = await db.query(
      `SELECT user_status_id FROM user_status WHERE status_name = 'Active'`
    );
    
    // Fallback if 'Active' status is missing (safety check)
    if (statusRes.rows.length === 0) {
      throw new Error("Status 'Active' not found in user_status table. Please seed user_status first.");
    }
    const activeStatusId = statusRes.rows[0].user_status_id;

    // 2. Insert Admins with the fetched status ID
    await db.query(`
      INSERT INTO admin (user_id, admin_first_name, admin_last_name, email, contact, gender_id, user_status_id)
      VALUES
        (
          (SELECT user_id FROM "user" WHERE user_name='admin.rahul' AND institute_id=3),
          'Rahul', 'Sharma', 'rahul.admin@demo.edu.in', '9000000010', 1, ${activeStatusId}
        ),
        (
          (SELECT user_id FROM "user" WHERE user_name='admin.rita' AND institute_id=3),
          'Rita', 'Patel', 'rita.admin@demo.edu.in', '9000000011', 2, ${activeStatusId}
        ),
        (
          (SELECT user_id FROM "user" WHERE user_name='admin.jay' AND institute_id=3),
          'Jay', 'Singh', 'jay.admin@demo.edu.in', '9000000012', 1, ${activeStatusId}
        )
      ON CONFLICT (user_id) DO NOTHING
    `);
    console.log('Demo admins inserted with Active status!');
  } catch (error) {
    console.log('seedAdmins error:', error);
  }
}

// 4. Remove all admin rows (for rollback/testing)
export async function removeAllAdmins() {
  try {
    await db.query('DELETE FROM admin');
    console.log('All admin records deleted.');
  } catch (error) {
    console.log('removeAllAdmins error:', error);
  }
}

// Uncomment only the function(s) you want to run:
// createAdminTable();
// seedAdmins();
// removeAllAdmins();
// dropAdminTable();