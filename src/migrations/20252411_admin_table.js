// 1. Create the admin table if not exists
import db from '../config/db.js';

export async function createAdminTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin (
        admin_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        admin_first_name VARCHAR(100),
        admin_last_name VARCHAR(100),
        email VARCHAR(150),
        contact VARCHAR(20),
        gender_id INTEGER,
        CONSTRAINT admin_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
        CONSTRAINT admin_gender_id_fkey FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id)
      )
    `);
    console.log('Table \`admin\` ensured.');
  } catch (error) {
    console.log('createAdminTable error:', error);
  }
}

// 2. Drop/delete the admin table
export async function dropAdminTable() {
  try {
    await db.query('DROP TABLE IF EXISTS admin');
    console.log('Table `admin` dropped.');
  } catch (error) {
    console.log('dropAdminTable error:', error);
  }
}

// 3. Seed demo admins
// In your seedAdmins(), also insert user_id:
export async function seedAdmins() {
  try {
    await db.query(`
      INSERT INTO admin (user_id, admin_first_name, admin_last_name, email, contact, gender_id)
      VALUES
        (
          (SELECT user_id FROM "user" WHERE user_name='admin.rahul' AND institute_id=3),
          'Rahul', 'Sharma', 'rahul.admin@demo.edu.in', '9000000010', 1
        ),
        (
          (SELECT user_id FROM "user" WHERE user_name='admin.rita' AND institute_id=3),
          'Rita', 'Patel', 'rita.admin@demo.edu.in', '9000000011', 2
        ),
        (
          (SELECT user_id FROM "user" WHERE user_name='admin.jay' AND institute_id=3),
          'Jay', 'Singh', 'jay.admin@demo.edu.in', '9000000012', 1
        )
    `);
    console.log('Demo admins inserted!');
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
seedAdmins();
// removeAllAdmins();
// dropAdminTable();
