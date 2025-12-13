import db from '../config/db.js';

// 1. Create the master_admin table if not exists
export async function createMasterAdminTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_admin (
        master_admin_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        m_admin_first_name VARCHAR(100),
        m_admin_last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        gender_id INTEGER,
        status_id INTEGER,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP,
        CONSTRAINT master_admin_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
        CONSTRAINT master_admin_gender_id_fkey FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id),
        CONSTRAINT master_admin_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.status(status_id)
      )
    `);
    console.log('Table `master_admin` ensured.');
  } catch (error) {
    console.log('CreateMasterAdminTable error:', error);
  }
}

// 2. Drop/delete the master_admin table
export async function dropMasterAdminTable() {
  try {
    await db.query('DROP TABLE IF EXISTS master_admin');
    console.log('Table `master_admin` dropped.');
  } catch (error) {
    console.log('DropMasterAdminTable error:', error);
  }
}

// 3. Seed demo data for two master admins (institute 3)
export async function seedMasterAdmins() {
  try {
    await db.query(`
      INSERT INTO master_admin
        (user_id, m_admin_first_name, m_admin_last_name, email, phone, gender_id, status_id, updated_at)
      VALUES
        (
          (SELECT user_id FROM "user" WHERE user_name = 'masteradmin1' AND institute_id = 3),
          'Karim', 'Shaikh', 'masteradmin1@demo.edu.in', '9000000001',
          1,  -- existing gender_id, e.g. 1 for male
          1,  -- existing status_id, e.g. 1 for Active
          NOW()
        ),
        (
          (SELECT user_id FROM "user" WHERE user_name = 'masteradmin2' AND institute_id = 3),
          'Ravi', 'Prasad', 'masteradmin2@demo.edu.in', '9000000002',
          1,  -- existing gender_id, e.g. 1 for male
          1,  -- existing status_id, e.g. 1 for Active
          NOW()
        )
    `);
    console.log('Two master admins seeded for institute 3!');
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
    console.log('RemoveAllMasterAdmins error:', error);
  }
}

// Uncomment ONLY ONE at a time as needed:
// createMasterAdminTable();
seedMasterAdmins();
// removeAllMasterAdmins();
// dropMasterAdminTable();
