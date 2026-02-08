// src/migrations/20260111_event_status_table.js
import db from '../config/db.js';

//
// 1. Create event_status table
//
export async function createEventStatusTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_status (
        event_status_id   SERIAL PRIMARY KEY,
        event_status_name VARCHAR(50) NOT NULL UNIQUE,
        description       TEXT,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('event_status table ensured.');
  } catch (err) {
    console.error('createEventStatusTable error:', err);
  }
}

//
// 2. Seed event statuses (exactly 5 main entities)
//
export async function seedEventStatus() {
  try {
    const statuses = [
      { name: 'Upcoming',   desc: 'Event is planned for future date.' },
      { name: 'Scheduled',  desc: 'Event has fixed date and time.' },
      { name: 'Ongoing',    desc: 'Event is currently happening.' },
      { name: 'Completed',  desc: 'Event has finished successfully.' },
      { name: 'Cancelled',  desc: 'Event was cancelled.' }
    ];

    for (const s of statuses) {
      await db.query(
        `INSERT INTO event_status (event_status_name, description)
         VALUES ($1, $2)
         ON CONFLICT (event_status_name) DO NOTHING`,
        [s.name, s.desc]
      );
    }
    console.log('event_status table seeded with exactly 5 main statuses.');
  } catch (err) {
    console.error('seedEventStatus error:', err);
  }
}

//
// 3. Clear all event_status records
//
export async function clearEventStatus() {
  try {
    await db.query('DELETE FROM event_status');
    console.log('all event_status rows deleted.');
  } catch (err) {
    console.error('clearEventStatus error:', err);
  }
}

//
// 4. Drop event_status table
//
export async function dropEventStatusTable() {
  try {
    await db.query('DROP TABLE IF EXISTS event_status CASCADE');
    console.log('event_status table dropped.');
  } catch (err) {
    console.error('dropEventStatusTable error:', err);
  }
}


// Run one at a time:
// createEventStatusTable();
seedEventStatus();
// clearEventStatus();
// dropEventStatusTable();
