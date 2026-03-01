import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const AttendanceModel = {

  async getDashboard(date) {
    const sql = `
      SELECT 
        c.class_id,
        c.class_name,
        s.section_id,
        s.section_name,
        sub.subject_id,
        sub.subject_name,
        ats.session_id,
        CASE 
          WHEN ats.session_id IS NULL THEN 'Not taken'
          ELSE 'Taken'
        END AS status,
        COALESCE(ar_stats.present_count, 0) as present_count,
        COALESCE(ar_stats.absent_count, 0) as absent_count
      FROM class c
      JOIN section s ON s.section_id = c.section_id
      JOIN schedule sch ON sch.class_id = c.class_id
      JOIN subject sub ON sub.subject_id = sch.subject_id
      LEFT JOIN attendance_session ats
        ON ats.class_id = c.class_id
        AND ats.section_id = s.section_id
        AND ats.subject_id = sub.subject_id
        AND ats.attendance_date = $1
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) FILTER (WHERE status_id = 1) as present_count,
          COUNT(*) FILTER (WHERE status_id = 2) as absent_count
        FROM attendance_record
        GROUP BY session_id
      ) ar_stats ON ar_stats.session_id = ats.session_id
      GROUP BY c.class_id, c.class_name, s.section_id, s.section_name, sub.subject_id, sub.subject_name, ats.session_id, ar_stats.present_count, ar_stats.absent_count
      ORDER BY c.class_id, sub.subject_id;
    `;
    const { rows } = await pool.query(sql, [date]);
    return rows;
  },

  async checkSession({ class_id, section_id, subject_id, attendance_date }) {
    let finalSectionId = section_id;
    if (!finalSectionId) {
      const classRes = await pool.query('SELECT section_id FROM class WHERE class_id = $1', [class_id]);
      if (classRes.rows.length > 0) finalSectionId = classRes.rows[0].section_id;
    }

    const sql = `
      SELECT session_id FROM attendance_session
      WHERE class_id = $1
        AND section_id = $2
        AND subject_id = $3
        AND attendance_date = $4
      LIMIT 1;
    `;
    const { rows } = await pool.query(sql, [
      class_id,
      finalSectionId,
      subject_id,
      attendance_date
    ]);
    return rows[0] || null;
  },

  async createSession(data) {
    let finalSectionId = data.section_id;
    if (!finalSectionId) {
      const classRes = await pool.query('SELECT section_id FROM class WHERE class_id = $1', [data.class_id]);
      if (classRes.rows.length > 0) finalSectionId = classRes.rows[0].section_id;
    }

    const sql = `
      INSERT INTO attendance_session
      (class_id, section_id, subject_id, attendance_date, created_by, faculty_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
    `;
    const values = [
      data.class_id,
      finalSectionId,
      data.subject_id,
      data.attendance_date,
      data.created_by,
      data.faculty_id
    ];
    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  async createRecords({ session_id, records }) {
    const sql = `
      INSERT INTO attendance_record
      (session_id, student_id, is_present, status_id, remarks)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *;
    `;

    const results = [];
    for (const r of records) {
      const { rows } = await pool.query(sql, [
        session_id,
        r.student_id,
        r.is_present ?? (r.status_id === 1),
        r.status_id,
        r.remarks || null
      ]);
      results.push(rows[0]);
    }
    return results;
  },

  async getStudentsByClass(classId) {
    const sql = `
      SELECT 
        s.student_id,
        s.student_first_name || ' ' || s.student_last_name as name,
        s.roll_number,
        c.class_name as class
      FROM student s
      JOIN class_enrollment ce ON ce.student_id = s.student_id
      JOIN class c ON c.class_id = ce.class_id
      WHERE ce.class_id = $1
      ORDER BY s.student_id;
    `;
    const { rows } = await pool.query(sql, [classId]);
    return rows;
  },

  async getAttendanceSummary(sessionId) {
    const sql = `
      SELECT 
        ar.student_id,
        s.student_first_name || ' ' || s.student_last_name as name,
        s.roll_number,
        ast.status_name as status,
        ar.remarks
      FROM attendance_record ar
      JOIN student s ON s.student_id = ar.student_id
      JOIN attendance_status ast ON ast.status_id = ar.status_id
      WHERE ar.session_id = $1
      ORDER BY s.student_id;
    `;
    const { rows } = await pool.query(sql, [sessionId]);
    return rows;
  },

  async updateRecord({ session_id, student_id, status_id, remarks }) {
    const sql = `
      UPDATE attendance_record 
      SET status_id = $3, remarks = $4, updated_at = now()
      WHERE session_id = $1 AND student_id = $2
      RETURNING *;
    `;
    const { rows } = await pool.query(sql, [session_id, student_id, status_id, remarks || null]);
    return rows[0];
  }

};
