import db from '../config/db.js';

// 1. CREATE guardian table
export async function createGuardianTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS guardian (
        guardian_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        grdn_first_name VARCHAR(100),
        grdn_last_name VARCHAR(100),
        contact VARCHAR(20),
        email VARCHAR(150),
        address TEXT,
        gender_id INTEGER,
        CONSTRAINT guardian_gender_id_fkey FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id)
      )
    `);
    console.log('Table `guardian` ensured.');
  } catch (error) {
    console.log('createGuardianTable error:', error);
  }
}

// 2. DROP guardian table
export async function dropGuardianTable() {
  try {
    await db.query('DROP TABLE IF EXISTS guardian');
    console.log('Table `guardian` dropped.');
  } catch (error) {
    console.log('dropGuardianTable error:', error);
  }
}

// 3. SEED guardians (based on parent users: fetch user_id by user_name/email)
export async function seedGuardians() {
  try {
    await db.query(`
      INSERT INTO guardian
        (user_id, grdn_first_name, grdn_last_name, contact, email, address, gender_id)
      VALUES
        ((SELECT user_id FROM "user" WHERE user_name='amit.sharma' AND institute_id=3), 'Amit', 'Sharma', '9710000001', 'amit.sharma@demo.edu.in', 'B-101, Sector 9, Delhi', 1),
        ((SELECT user_id FROM "user" WHERE user_name='sunita.sharma' AND institute_id=3), 'Sunita', 'Sharma', '9710000002', 'sunita.sharma@demo.edu.in', 'B-101, Sector 9, Delhi', 2),
        ((SELECT user_id FROM "user" WHERE user_name='suresh.patel' AND institute_id=3), 'Suresh', 'Patel', '9710000003', 'suresh.patel@demo.edu.in', 'C-22, Andheri, Mumbai', 1),
        ((SELECT user_id FROM "user" WHERE user_name='kavita.patel' AND institute_id=3), 'Kavita', 'Patel', '9710000004', 'kavita.patel@demo.edu.in', 'C-22, Andheri, Mumbai', 2),
        ((SELECT user_id FROM "user" WHERE user_name='vijay.singh' AND institute_id=3), 'Vijay', 'Singh', '9710000005', 'vijay.singh@demo.edu.in', '12 Park Road, Jaipur', 1),
        ((SELECT user_id FROM "user" WHERE user_name='alka.singh' AND institute_id=3), 'Alka', 'Singh', '9710000006', 'alka.singh@demo.edu.in', '12 Park Road, Jaipur', 2),
        ((SELECT user_id FROM "user" WHERE user_name='rajesh.mehta' AND institute_id=3), 'Rajesh', 'Mehta', '9710000007', 'rajesh.mehta@demo.edu.in', '41/13 Shivaji Marg, Ahmedabad', 1),
        ((SELECT user_id FROM "user" WHERE user_name='anita.mehta' AND institute_id=3), 'Anita', 'Mehta', '9710000008', 'anita.mehta@demo.edu.in', '41/13 Shivaji Marg, Ahmedabad', 2),
        ((SELECT user_id FROM "user" WHERE user_name='sanjay.kumar' AND institute_id=3), 'Sanjay', 'Kumar', '9710000009', 'sanjay.kumar@demo.edu.in', 'Saket Nagar, Lucknow', 1),
        ((SELECT user_id FROM "user" WHERE user_name='rakhi.kumar' AND institute_id=3), 'Rakhi', 'Kumar', '9710000010', 'rakhi.kumar@demo.edu.in', 'Saket Nagar, Lucknow', 2),
        ((SELECT user_id FROM "user" WHERE user_name='veer.desai' AND institute_id=3), 'Veer', 'Desai', '9710000011', 'veer.desai@demo.edu.in', 'MG Road, Pune', 1),
        ((SELECT user_id FROM "user" WHERE user_name='pooja.desai' AND institute_id=3), 'Pooja', 'Desai', '9710000012', 'pooja.desai@demo.edu.in', 'MG Road, Pune', 2)
        -- Continue for all 30 guardians, follow the pattern for user_name, contact, email, address, gender_id
    `);
    console.log('Demo guardians inserted!');
  } catch (error) {
    console.log('seedGuardians error:', error);
  }
}

// 4. REMOVE all guardians
export async function removeAllGuardians() {
  try {
    await db.query('DELETE FROM guardian');
    console.log('All guardian records deleted.');
  } catch (error) {
    console.log('removeAllGuardians error:', error);
  }
}

// Uncomment one per run as needed:
// createGuardianTable();
seedGuardians();
// removeAllGuardians();
// dropGuardianTable();
