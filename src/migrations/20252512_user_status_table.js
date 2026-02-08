// src/migrations/20251225_user_status_table.js
import db from '../config/db.js';

//
// 1. Create user_status table
//
export async function createUserStatusTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_status (
        user_status_id SERIAL PRIMARY KEY,
        status_name    VARCHAR(50) NOT NULL UNIQUE,
        description    TEXT,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('user_status table ensured.');
  } catch (err) {
    console.error('createUserStatusTable error:', err);
  }
}

//
// 2. Seed comprehensive user statuses
//
export async function seedUserStatus() {
  try {
    const statuses = [
      // General Positive
      { name: 'Active',           desc: 'User is currently active and has full access.' },
      
      // General Negative
      { name: 'Inactive',         desc: 'User account is temporarily disabled.' },
      
      // Student Specific
      { name: 'Suspended',        desc: 'Student is suspended for disciplinary reasons.' },
      { name: 'Rusticated',       desc: 'Student is permanently expelled.' },
      { name: 'Alumni',           desc: 'Student has graduated/passed out.' },
      { name: 'Transferred',      desc: 'Student has transferred to another school.' },
      
      // Staff Specific
      { name: 'On Leave',         desc: 'Staff is currently on approved leave.' },
      { name: 'Probation',        desc: 'Staff is new and under probation period.' },
      { name: 'Resigned',         desc: 'Staff has voluntarily left the job.' },
      { name: 'Terminated',       desc: 'Staff employment has been terminated.' },
      { name: 'Retired',          desc: 'Staff has retired from service.' },

      // Admin/System
      { name: 'Banned',           desc: 'User is permanently banned from the system.' },
      { name: 'Pending Approval', desc: 'Account created, waiting for admin approval.' }
    ];

    for (const s of statuses) {
      await db.query(
        `INSERT INTO user_status (status_name, description)
         VALUES ($1, $2)
         ON CONFLICT (status_name) DO UPDATE 
         SET description = EXCLUDED.description`,
        [s.name, s.desc]
      );
    }
    console.log('user_status seeded with all user types.');
  } catch (err) {
    console.error('seedUserStatus error:', err);
  }
}

//
// 3. Drop table
//
export async function dropUserStatusTable() {
  try {
    await db.query('DROP TABLE IF EXISTS user_status CASCADE');
    console.log('user_status table dropped.');
  } catch (err) {
    console.error('dropUserStatusTable error:', err);
  }
}


//Functions
// createUserStatusTable()
seedUserStatus()
//dropUserStatusTable()