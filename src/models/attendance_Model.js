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
        s.section_name,
        sub.subject_name,
        CASE 
          WHEN ats.session_id IS NULL THEN 'Not taken'
          ELSE 'Taken'
        END AS status
      FROM class c
      JOIN section s ON s.section_id = c.section_id
      JOIN subject sub ON sub.class_id = c.class_id
      LEFT JOIN attendance_session ats
        ON ats.class_id = c.class_id
        AND ats.section_id = s.section_id
        AND ats.subject_id = sub.subject_id
        AND ats.attendance_date = $1
      ORDER BY c.class_id;
    `;
    const { rows } = await pool.query(sql, [date]);
    return rows;
  },

  async checkSession({ class_id, section_id, subject_id, attendance_date }) {
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
      section_id,
      subject_id,
      attendance_date
    ]);
    return rows[0] || null;
  },

  async createSession(data) {
    const sql = `
      INSERT INTO attendance_session
      (class_id, section_id, subject_id, attendance_date, created_by, faculty_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
    `;
    const values = [
      data.class_id,
      data.section_id,
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
        r.is_present,
        r.status_id,
        r.remarks || null
      ]);
      results.push(rows[0]);
    }
    return results;
  }

};
