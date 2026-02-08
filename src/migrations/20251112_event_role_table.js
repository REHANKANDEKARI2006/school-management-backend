// src/migrations/20251211_event_roles_table.js
import db from '../config/db.js';

//
// 1. create event_role_type and event_role_assignment tables
//
export async function createEventRoleTables() {
  try {
    // role type table
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_role_type (
        role_type_id SERIAL PRIMARY KEY,
        role_code    VARCHAR(50) UNIQUE NOT NULL,
        role_name    VARCHAR(100) NOT NULL
      )
    `);

    // assignment table
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_role_assignment (
        assignment_id SERIAL PRIMARY KEY,
        event_id      INTEGER NOT NULL,
        role_type_id  INTEGER NOT NULL,
        user_id       INTEGER NOT NULL,
        remarks       VARCHAR(255),
        CONSTRAINT era_event_fkey
          FOREIGN KEY (event_id) REFERENCES events(event_id),
        CONSTRAINT era_role_type_fkey
          FOREIGN KEY (role_type_id) REFERENCES event_role_type(role_type_id),
        CONSTRAINT era_user_fkey
          FOREIGN KEY (user_id) REFERENCES "user"(user_id),
        CONSTRAINT era_unique
          UNIQUE (event_id, role_type_id, user_id)
      )
    `);

    console.log('event_role_type and event_role_assignment tables ensured.');
  } catch (error) {
    console.error('createEventRoleTables error:', error);
  }
}

//
// 2. drop both tables (optional)
//
export async function dropEventRoleTables() {
  try {
    await db.query('DROP TABLE IF EXISTS event_role_assignment CASCADE');
    await db.query('DROP TABLE IF EXISTS event_role_type CASCADE');
    console.log('event role tables dropped.');
  } catch (error) {
    console.error('dropEventRoleTables error:', error);
  }
}

//
// helper: get role_type_id by role_code (creates default set if needed)
//
async function ensureRoleTypesAndGetId(roleCode) {
  // seed standard roles if table is empty
  await db.query(`
    INSERT INTO event_role_type (role_code, role_name)
    VALUES
      ('ORGANIZER', 'Event Organizer'),
      ('FAC_COORD', 'Faculty Coordinator'),
      ('STU_COORD', 'Student Coordinator'),
      ('VOLUNTEER', 'Volunteer')
    ON CONFLICT (role_code) DO NOTHING
  `);

  const { rows } = await db.query(
    `SELECT role_type_id FROM event_role_type WHERE role_code = $1`,
    [roleCode]
  );
  if (!rows.length) return null;
  return rows[0].role_type_id;
}

//
// 3. assign coordinators/organizers for ONE event by IDs
//
export async function assignEventCoordinators() {
  // >>> CHANGE ONLY THESE CONSTANTS WHEN YOU RUN THIS <<<

  // which event to assign
  const TARGET_EVENT_ID = 1; // event_id from events table

  // user IDs (from "user" table) for each role
  const ORGANIZER_USER_IDS       = [11];           // e.g. admin
  const FACULTY_COORDINATOR_IDS  = [21, 22];       // e.g. staff/faculty users
  const STUDENT_COORDINATOR_IDS  = [101, 102, 103]; // e.g. student users

  try {
    const organizerRoleId  = await ensureRoleTypesAndGetId('ORGANIZER');
    const facCoordRoleId   = await ensureRoleTypesAndGetId('FAC_COORD');
    const stuCoordRoleId   = await ensureRoleTypesAndGetId('STU_COORD');

    if (!organizerRoleId || !facCoordRoleId || !stuCoordRoleId) {
      console.log('Could not resolve role_type_id values.');
      return;
    }

    const rows = [];

    ORGANIZER_USER_IDS.forEach(uid => {
      rows.push(`(${TARGET_EVENT_ID}, ${organizerRoleId}, ${uid}, 'Organizer')`);
    });

    FACULTY_COORDINATOR_IDS.forEach(uid => {
      rows.push(`(${TARGET_EVENT_ID}, ${facCoordRoleId}, ${uid}, 'Faculty Coordinator')`);
    });

    STUDENT_COORDINATOR_IDS.forEach(uid => {
      rows.push(`(${TARGET_EVENT_ID}, ${stuCoordRoleId}, ${uid}, 'Student Coordinator')`);
    });

    if (!rows.length) {
      console.log('No user_ids provided for any role.');
      return;
    }

    await db.query(`
      INSERT INTO event_role_assignment (
        event_id,
        role_type_id,
        user_id,
        remarks
      )
      VALUES
        ${rows.join(',\n')}
      ON CONFLICT (event_id, role_type_id, user_id) DO NOTHING
    `);

    console.log('Coordinators/organizers assigned for event_id', TARGET_EVENT_ID);
  } catch (error) {
    console.error('assignEventCoordinators error:', error);
  }
}

//
// 4. clear assignments for one event or all (optional)
//
export async function deleteAssignmentsForEvent() {
  // set to a specific event_id; or NULL to clear all
  const TARGET_EVENT_ID = 1;

  try {
    if (TARGET_EVENT_ID) {
      await db.query(
        `DELETE FROM event_role_assignment WHERE event_id = $1`,
        [TARGET_EVENT_ID]
      );
      console.log('Assignments deleted for event_id', TARGET_EVENT_ID);
    } else {
      await db.query('DELETE FROM event_role_assignment');
      console.log('All event role assignments deleted.');
    }
  } catch (error) {
    console.error('deleteAssignmentsForEvent error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createEventRoleTables();
// dropEventRoleTables();
assignEventCoordinators();
// deleteAssignmentsForEvent();