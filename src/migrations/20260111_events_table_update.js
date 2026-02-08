// src/migrations/20260111_events_table_update.js
import db from '../config/db.js';

//
// 1. create events table with event_status integration
//
export async function createEventsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        event_id         SERIAL PRIMARY KEY,
        event_name       VARCHAR(100) NOT NULL,
        description      TEXT,
        event_date       DATE,
        venue            VARCHAR(150),
        event_status_id  INTEGER NOT NULL,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT events_event_status_id_fkey
          FOREIGN KEY (event_status_id) REFERENCES public.event_status(event_status_id)
      )
    `);
    console.log('events table ensured with event_status_id.');
  } catch (error) {
    console.error('createEventsTable error:', error);
  }
}

//
// 2. drop events table
//
export async function dropEventsTable() {
  try {
    await db.query('DROP TABLE IF EXISTS events CASCADE');
    console.log('events table dropped.');
  } catch (error) {
    console.error('dropEventsTable error:', error);
  }
}

//
// 3. seed general school events with parameterized queries (FIXED)
//
export async function seedGeneralEvents() {
  try {
    // Fetch 'Scheduled' status ID dynamically
    const statusRes = await db.query(
      `SELECT event_status_id FROM event_status WHERE event_status_name = 'Scheduled'`
    );
    if (statusRes.rows.length === 0) {
      throw new Error("Status 'Scheduled' not found. Please seed event_status table first.");
    }
    const SCHEDULED_STATUS_ID = statusRes.rows[0].event_status_id;

    // Define all events as arrays for parameterized insert
    const eventsData = [
      ['Sports Day', 'Track and field events, team games, and house competitions', '2026-01-10', 'School Ground'],
      ['Republic Day', 'Flag hoisting, parade and speeches on 26 January', '2026-01-26', 'Assembly Ground'],
      ['Science Exhibition', 'Student science models, experiments and innovation projects display', '2026-02-10', 'Science Block'],
      ['Annual Day Celebration', 'Annual cultural gathering with performances and prize distribution', '2026-03-20', 'School Auditorium'],
      ['Yoga Day', 'Mass yoga session and health awareness activities on International Yoga Day', '2026-06-21', 'School Ground'],
      ['Inter-School Sports', 'Participation in external sports tournaments and matches', '2026-07-05', 'Various Venues'],
      ['Independence Day', 'Flag hoisting and cultural programme on 15 August', '2026-08-15', 'Assembly Ground'],
      ["Teachers' Day", 'Cultural events and performances to honour teachers', '2026-09-05', 'School Auditorium'],
      ['Literary Fest', 'Debates, elocution, essay writing and quiz competitions', '2026-11-25', 'Library Hall'],
      ["Children's Day", 'Fun activities and programmes for students', '2026-11-14', 'School Campus'],
      ['Cultural Fest', 'Inter-house dance, music, drama and art competitions', '2026-12-01', 'School Auditorium'],
      ['Historical Exhibition', 'Exhibition of charts, models and skits based on Indian history', '2026-12-15', 'Exhibition Hall']
    ];

    // Insert using parameterized query (safe from SQL injection)
    const values = eventsData.map(event => 
      [event[0], event[1], event[2], event[3], SCHEDULED_STATUS_ID]
    );

    for (const eventValues of values) {
      await db.query(`
        INSERT INTO events (
          event_name, description, event_date, venue, event_status_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, now(), now())
        ON CONFLICT DO NOTHING
      `, eventValues);
    }

    console.log(`12 general events seeded with Scheduled status (${SCHEDULED_STATUS_ID}).`);
  } catch (error) {
    console.error('seedGeneralEvents error:', error);
  }
}

//
// 4. delete all events
//
export async function deleteAllEvents() {
  try {
    await db.query('DELETE FROM events');
    console.log('all events deleted.');
  } catch (error) {
    console.error('deleteAllEvents error:', error);
  }
}

// Uncomment ONE at a time:
// createEventsTable();
// dropEventsTable();
seedGeneralEvents();
// deleteAllEvents();