/**
 * leave_Model.js — Leave Management System (Rebuilt)
 * Works with tables: leave_types, leave_balance, leave_applications
 */

import db from '../config/db.js';

export const LeaveModel = {

  // ── Leave Types ────────────────────────────────────────
  async getAllLeaveTypes() {
    const { rows } = await db.query(
      `SELECT id, name, max_days_per_year, is_paid, requires_document
       FROM leave_types ORDER BY id`
    );
    return rows;
  },

  // ── Leave Balance ──────────────────────────────────────
  async getLeaveBalance(teacher_id, academic_year = '2025-2026') {
    const { rows } = await db.query(
      `SELECT lb.id, lb.teacher_id, lb.leave_type_id, lb.academic_year,
              lb.total_days, lb.used_days, lb.remaining_days, lb.updated_at,
              lt.name AS leave_type_name, lt.is_paid, lt.max_days_per_year
       FROM leave_balance lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.teacher_id = $1 AND lb.academic_year = $2
       ORDER BY lb.leave_type_id`,
      [teacher_id, academic_year]
    );
    return rows;
  },

  async initBalancesForYear(academic_year = '2025-2026') {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const { rows: staffRows } = await client.query(
        `SELECT staff_id FROM staff WHERE user_status_id = 1`
      );
      const { rows: typeRows } = await client.query(
        `SELECT id, name, max_days_per_year FROM leave_types`
      );

      let inserted = 0;
      for (const staff of staffRows) {
        for (const lt of typeRows) {
          const maxDays = lt.max_days_per_year;
          const res = await client.query(`
            INSERT INTO leave_balance (teacher_id, leave_type_id, academic_year, total_days, used_days, remaining_days)
            VALUES ($1, $2, $3, $4, 0, $4)
            ON CONFLICT (teacher_id, leave_type_id, academic_year) DO NOTHING
            RETURNING id
          `, [staff.staff_id, lt.id, academic_year, maxDays]);
          if (res.rowCount > 0) inserted++;
        }
      }
      await client.query('COMMIT');
      return { inserted, staff_count: staffRows.length, type_count: typeRows.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deductBalance(teacher_id, leave_type_id, academic_year, days, client) {
    const q = client || db;
    const { rows } = await q.query(`
      UPDATE leave_balance
      SET used_days = used_days + $4,
          remaining_days = remaining_days - $4,
          updated_at = now()
      WHERE teacher_id = $1 AND leave_type_id = $2 AND academic_year = $3
      RETURNING *
    `, [teacher_id, leave_type_id, academic_year, days]);
    return rows[0];
  },

  async restoreBalance(teacher_id, leave_type_id, academic_year, days) {
    const { rows } = await db.query(`
      UPDATE leave_balance
      SET used_days = GREATEST(0, used_days - $4),
          remaining_days = remaining_days + $4,
          updated_at = now()
      WHERE teacher_id = $1 AND leave_type_id = $2 AND academic_year = $3
      RETURNING *
    `, [teacher_id, leave_type_id, academic_year, days]);
    return rows[0];
  },

  // ── Leave Applications ─────────────────────────────────
  async createApplication(data) {
    const { teacher_id, leave_type_id, from_date, to_date, total_days, reason, document_url } = data;
    const { rows } = await db.query(`
      INSERT INTO leave_applications
        (teacher_id, leave_type_id, from_date, to_date, total_days, reason, document_url, status, applied_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', now())
      RETURNING *
    `, [teacher_id, leave_type_id, from_date, to_date, total_days, reason || null, document_url || null]);
    return rows[0];
  },

  async getApplicationsByTeacher(teacher_id) {
    const { rows } = await db.query(`
      SELECT la.*,
             lt.name        AS leave_type_name,
             lt.is_paid,
             u.user_name    AS approver_name,
             s_app.staff_first_name  AS approver_first_name,
             s_app.staff_last_name   AS approver_last_name,
             ur.role_name   AS approver_role
      FROM leave_applications la
      JOIN leave_types lt ON lt.id = la.leave_type_id
      LEFT JOIN "user" u ON u.user_id = la.actioned_by_user_id
      LEFT JOIN staff s_app ON s_app.user_id = la.actioned_by_user_id
      LEFT JOIN user_role ur ON ur.role_id = u.role_id
      WHERE la.teacher_id = $1
      ORDER BY la.applied_at DESC
    `, [teacher_id]);
    return rows;
  },

  async getApplicationById(id) {
    const { rows } = await db.query(`
      SELECT la.*,
             lt.name           AS leave_type_name,
             lt.is_paid,
             lt.max_days_per_year,
             s.staff_first_name,
             s.staff_last_name,
             s.email           AS teacher_email,
             s.profile_url     AS teacher_photo,
             s.dept_id,
             s.subject_id,
             d.dept_name,
             sub.subject_name,
             u_app.user_name   AS approver_username,
             s_app.staff_first_name  AS approver_first_name,
             s_app.staff_last_name   AS approver_last_name,
             ur.role_name      AS approver_role
      FROM leave_applications la
      JOIN leave_types lt   ON lt.id = la.leave_type_id
      JOIN staff s          ON s.staff_id = la.teacher_id
      LEFT JOIN department d ON d.dept_id = s.dept_id
      LEFT JOIN subject sub  ON sub.subject_id = s.subject_id
      LEFT JOIN "user" u_app ON u_app.user_id = la.actioned_by_user_id
      LEFT JOIN staff s_app  ON s_app.user_id = la.actioned_by_user_id
      LEFT JOIN user_role ur ON ur.role_id = u_app.role_id
      WHERE la.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async getPendingApplications(institute_id) {
    const { rows } = await db.query(`
      SELECT la.*,
             lt.name           AS leave_type_name,
             lt.is_paid,
             s.staff_first_name,
             s.staff_last_name,
             s.profile_url     AS teacher_photo,
             s.dept_id,
             s.subject_id
      FROM leave_applications la
      JOIN leave_types lt ON lt.id = la.leave_type_id
      JOIN staff s        ON s.staff_id = la.teacher_id
      JOIN "user" u       ON u.user_id = s.user_id
      WHERE la.status = 'pending'
        AND u.institute_id = $1
      ORDER BY la.applied_at ASC
    `, [institute_id]);
    return rows;
  },

  async getAllApplications(institute_id, { teacher_name, leave_type_id, status, from_date, to_date } = {}) {
    let query = `
      SELECT la.*,
             lt.name            AS leave_type_name,
             s.staff_first_name, s.staff_last_name, s.profile_url AS teacher_photo
      FROM leave_applications la
      JOIN leave_types lt ON lt.id = la.leave_type_id
      JOIN staff s        ON s.staff_id = la.teacher_id
      JOIN "user" u       ON u.user_id = s.user_id
      WHERE u.institute_id = $1
    `;
    const values = [institute_id];
    let idx = 2;

    if (teacher_name) {
      query += ` AND (s.staff_first_name ILIKE $${idx} OR s.staff_last_name ILIKE $${idx})`;
      values.push(`%${teacher_name}%`);
      idx++;
    }
    if (leave_type_id) {
      query += ` AND la.leave_type_id = $${idx}`;
      values.push(leave_type_id);
      idx++;
    }
    if (status) {
      query += ` AND la.status = $${idx}`;
      values.push(status);
      idx++;
    }
    if (from_date) {
      query += ` AND la.from_date >= $${idx}`;
      values.push(from_date);
      idx++;
    }
    if (to_date) {
      query += ` AND la.to_date <= $${idx}`;
      values.push(to_date);
      idx++;
    }

    query += ' ORDER BY la.applied_at DESC LIMIT 200';
    const { rows } = await db.query(query, values);
    return rows;
  },

  async updateApplicationStatus(id, status, actioned_by_user_id, remarks = null, client) {
    const q = client || db;
    const { rows } = await q.query(`
      UPDATE leave_applications
      SET status = $2,
          actioned_by_user_id = $3,
          actioned_at = now(),
          admin_remarks = $4
      WHERE id = $1
      RETURNING *
    `, [id, status, actioned_by_user_id, remarks]);
    return rows[0];
  },

  async cancelApplication(id, teacher_id) {
    const { rows } = await db.query(`
      UPDATE leave_applications
      SET status = 'cancelled', actioned_at = now()
      WHERE id = $1 AND teacher_id = $2 AND status = 'pending'
      RETURNING *
    `, [id, teacher_id]);
    return rows[0] || null;
  },

  // ── Admin Stats ────────────────────────────────────────
  async getAdminStats(institute_id) {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM leave_applications la JOIN staff s ON s.staff_id = la.teacher_id JOIN "user" u ON u.user_id = s.user_id WHERE la.status = 'pending' AND u.institute_id = $1) AS pending_count,
        (SELECT COUNT(*) FROM leave_applications la JOIN staff s ON s.staff_id = la.teacher_id JOIN "user" u ON u.user_id = s.user_id
         WHERE la.status = 'approved' AND u.institute_id = $1
           AND EXTRACT(month FROM la.actioned_at) = EXTRACT(month FROM CURRENT_DATE)
           AND EXTRACT(year  FROM la.actioned_at) = EXTRACT(year  FROM CURRENT_DATE)
        ) AS approved_month,
        (SELECT COUNT(*) FROM leave_applications la JOIN staff s ON s.staff_id = la.teacher_id JOIN "user" u ON u.user_id = s.user_id
         WHERE la.status = 'rejected' AND u.institute_id = $1
           AND EXTRACT(month FROM la.actioned_at) = EXTRACT(month FROM CURRENT_DATE)
           AND EXTRACT(year  FROM la.actioned_at) = EXTRACT(year  FROM CURRENT_DATE)
        ) AS rejected_month,
        (SELECT COUNT(DISTINCT la.teacher_id) FROM leave_applications la JOIN staff s ON s.staff_id = la.teacher_id JOIN "user" u ON u.user_id = s.user_id
         WHERE la.status = 'approved' AND u.institute_id = $1
           AND la.from_date <= CURRENT_DATE
           AND la.to_date   >= CURRENT_DATE
        ) AS on_leave_today
    `, [institute_id]);
    return rows[0];
  },

  // ── Calendar ───────────────────────────────────────────
  async getApprovedLeavesForMonth(institute_id, year, month) {
    const { rows } = await db.query(`
      SELECT la.id, la.teacher_id, la.from_date, la.to_date, la.total_days,
             lt.name AS leave_type_name,
             s.staff_first_name, s.staff_last_name, s.profile_url AS teacher_photo
      FROM leave_applications la
      JOIN leave_types lt ON lt.id = la.leave_type_id
      JOIN staff s        ON s.staff_id = la.teacher_id
      JOIN "user" u       ON u.user_id = s.user_id
      WHERE la.status = 'approved'
        AND u.institute_id = $1
        AND (
          (EXTRACT(year FROM la.from_date) = $2 AND EXTRACT(month FROM la.from_date) = $3)
          OR
          (EXTRACT(year FROM la.to_date)   = $2 AND EXTRACT(month FROM la.to_date)   = $3)
        )
      ORDER BY la.from_date ASC
    `, [institute_id, year, month]);
    return rows;
  },

  // ── Approved leaves overlapping a date range (for suggestion engine) ──
  async getApprovedLeavesInRange(from_date, to_date) {
    const { rows } = await db.query(`
      SELECT teacher_id, from_date, to_date
      FROM leave_applications
      WHERE status = 'approved'
        AND from_date <= $2
        AND to_date   >= $1
    `, [from_date, to_date]);
    return rows;
  }
};
