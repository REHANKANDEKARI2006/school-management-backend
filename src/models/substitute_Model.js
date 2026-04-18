/**
 * substitute_Model.js — Substitute Assignments (Rebuilt)
 * Works with table: substitute_assignments
 */

import db from '../config/db.js';

export const SubstituteModel = {

  // Insert a batch of assignments inside a provided transaction client
  async createAssignmentsBatch(assignments, client) {
    const q = client || db;
    const results = [];
    for (const a of assignments) {
      const { rows } = await q.query(`
        INSERT INTO substitute_assignments
          (leave_application_id, original_teacher_id, substitute_teacher_id,
           assignment_date, period_number, period_start_time, period_end_time,
           class_id, subject, room, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending_acceptance')
        RETURNING *
      `, [
        a.leave_application_id,
        a.original_teacher_id,
        a.substitute_teacher_id,
        a.assignment_date,
        a.period_number,
        a.period_start_time,
        a.period_end_time,
        a.class_id || null,
        a.subject   || null,
        a.room      || null
      ]);
      results.push(rows[0]);
    }
    return results;
  },

  async getAssignmentsByLeave(leave_application_id) {
    const { rows } = await db.query(`
      SELECT sa.*,
             s_orig.staff_first_name  AS original_first_name,
             s_orig.staff_last_name   AS original_last_name,
             s_sub.staff_first_name   AS substitute_first_name,
             s_sub.staff_last_name    AS substitute_last_name,
             s_sub.user_id            AS substitute_user_id
      FROM substitute_assignments sa
      JOIN staff s_orig ON s_orig.staff_id = sa.original_teacher_id
      JOIN staff s_sub  ON s_sub.staff_id  = sa.substitute_teacher_id
      WHERE sa.leave_application_id = $1
      ORDER BY sa.assignment_date ASC, sa.period_number ASC
    `, [leave_application_id]);
    return rows;
  },

  // For "My Substitute Duties" section — teacher sees their upcoming duties
  async getAssignmentsBySubstituteTeacher(staff_id) {
    const { rows } = await db.query(`
      SELECT sa.*,
             s_orig.staff_first_name  AS original_first_name,
             s_orig.staff_last_name   AS original_last_name,
             la.from_date             AS leave_from_date,
             la.to_date               AS leave_to_date,
             lt.name                  AS leave_type_name,
             c.class_name
      FROM substitute_assignments sa
      JOIN staff s_orig          ON s_orig.staff_id  = sa.original_teacher_id
      JOIN leave_applications la ON la.id = sa.leave_application_id
      JOIN leave_types lt        ON lt.id = la.leave_type_id
      LEFT JOIN class c          ON c.class_id = sa.class_id
      WHERE sa.substitute_teacher_id = $1
        AND sa.assignment_date >= CURRENT_DATE
      ORDER BY sa.assignment_date ASC, sa.period_number ASC
    `, [staff_id]);
    return rows;
  },

  async getAssignmentById(id) {
    const { rows } = await db.query(`
      SELECT sa.*,
             s_orig.staff_first_name  AS original_first_name,
             s_orig.staff_last_name   AS original_last_name,
             s_sub.staff_first_name   AS substitute_first_name,
             s_sub.staff_last_name    AS substitute_last_name,
             s_sub.user_id            AS substitute_user_id
      FROM substitute_assignments sa
      JOIN staff s_orig ON s_orig.staff_id = sa.original_teacher_id
      JOIN staff s_sub  ON s_sub.staff_id  = sa.substitute_teacher_id
      WHERE sa.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async updateAssignmentStatus(id, status, client) {
    const q = client || db;
    const { rows } = await q.query(`
      UPDATE substitute_assignments
      SET status = $2
      WHERE id = $1
      RETURNING *
    `, [id, status]);
    return rows[0];
  },

  // Update ALL assignments for a given leave_application_id AND substitute_teacher_id
  async updateAllAssignmentsForSubstitute(leave_application_id, substitute_teacher_id, status, client) {
    const q = client || db;
    const { rows } = await q.query(`
      UPDATE substitute_assignments
      SET status = $3
      WHERE leave_application_id = $1 AND substitute_teacher_id = $2
      RETURNING *
    `, [leave_application_id, substitute_teacher_id, status]);
    return rows;
  },

  // Check if a substitute teacher already has an assignment for the same period+date
  async checkConflict(substitute_teacher_id, assignment_date, period_number) {
    const { rows } = await db.query(`
      SELECT id FROM substitute_assignments
      WHERE substitute_teacher_id = $1
        AND assignment_date = $2
        AND period_number = $3
        AND status != 'declined'
    `, [substitute_teacher_id, assignment_date, period_number]);
    return rows.length > 0;
  },

  // For fairness scoring — how many sub duties does this teacher have this month?
  async countSubDutiesThisMonth(staff_id) {
    const { rows } = await db.query(`
      SELECT COUNT(*) AS duty_count
      FROM substitute_assignments
      WHERE substitute_teacher_id = $1
        AND EXTRACT(month FROM assignment_date) = EXTRACT(month FROM CURRENT_DATE)
        AND EXTRACT(year  FROM assignment_date) = EXTRACT(year  FROM CURRENT_DATE)
        AND status != 'declined'
    `, [staff_id]);
    return parseInt(rows[0].duty_count, 10);
  },

  // Get pending duties for a leave application grouped by substitute teacher
  async getPendingDutiesByLeave(leave_application_id) {
    const { rows } = await db.query(`
      SELECT sa.*,
             s_sub.user_id AS substitute_user_id,
             s_sub.staff_first_name AS substitute_first_name,
             s_sub.staff_last_name  AS substitute_last_name
      FROM substitute_assignments sa
      JOIN staff s_sub ON s_sub.staff_id = sa.substitute_teacher_id
      WHERE sa.leave_application_id = $1 AND sa.status = 'declined'
      ORDER BY sa.assignment_date, sa.period_number
    `, [leave_application_id]);
    return rows;
  }
};
