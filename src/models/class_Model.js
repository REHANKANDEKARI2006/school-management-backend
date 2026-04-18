import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const SectionModel = {

  // ✅ EXISTING (DO NOT TOUCH)
  async getByClass(classId) {
    const { rows } = await pool.query(`
      SELECT 
        sec.section_id,
        sec.section_name
      FROM class_section cs
      JOIN section sec 
        ON sec.section_id = cs.section_id
      WHERE cs.class_id = $1
      ORDER BY sec.section_name
    `, [classId]);

    return rows;
  },

  // ✅ EXISTING (OPTION A)
  async getAll() {
    const { rows } = await pool.query(`
      SELECT section_id, section_name
      FROM section
      ORDER BY section_name
    `);
    return rows;
  }
};

export const ClassModel = {

  async getAll() {
    const sql = `
      SELECT c.*, s.section_name 
      FROM class c
      LEFT JOIN section s ON s.section_id = c.section_id
      ORDER BY c.class_id DESC;
    `;
    const { rows } = await pool.query(sql);
    return rows;
  },

  async findById(id) {
    const sql = `
      SELECT c.*, s.section_name 
      FROM class c
      LEFT JOIN section s ON s.section_id = c.section_id
      WHERE c.class_id = $1 LIMIT 1;
    `;
    const { rows } = await pool.query(sql, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const sql = `
      INSERT INTO class
        (class_name, section_id, staff_id, room_number)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [
      data.class_name,
      data.section_id,
      data.staff_id,
      data.room_number,
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  // ✅ NEW — REQUIRED FOR DB CONSISTENCY
  async attachSection(classId, sectionId) {
    const sql = `
      INSERT INTO class_section (class_id, section_id)
      VALUES ($1, $2)
    `;
    await pool.query(sql, [classId, sectionId]);
  },

  async update(query, values) {
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  // ✅ HARD DELETE (REPLACING SOFT DELETE)
  async softDelete(id) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Delete from child tables to avoid foreign key constraints
      await client.query("DELETE FROM class_section WHERE class_id = $1", [id]);
      await client.query("DELETE FROM class_enrollment WHERE class_id = $1", [id]);
      
      // Attendance
      await client.query("DELETE FROM attendance_record WHERE session_id IN (SELECT session_id FROM attendance_session WHERE class_id = $1)", [id]);
      await client.query("DELETE FROM attendance_session WHERE class_id = $1", [id]);
      
      // Materials, Schedule, Events, Notices, Grade Boundary
      await client.query("DELETE FROM materials WHERE class_id = $1", [id]);
      await client.query("DELETE FROM schedule WHERE class_id = $1", [id]);
      await client.query("DELETE FROM events WHERE class_id = $1", [id]);
      await client.query("DELETE FROM notice_audience WHERE class_id = $1", [id]);
      await client.query("DELETE FROM notices WHERE class_id = $1", [id]);
      await client.query("DELETE FROM grade_boundary WHERE class_id = $1", [id]);
      
      // Exams and its children
      await client.query(`
        DELETE FROM exam_grades 
        WHERE exam_id IN (SELECT exam_id FROM exam WHERE class_id = $1)
      `, [id]);
      await client.query("DELETE FROM exam WHERE class_id = $1", [id]);
      
      // Fees and its children
      await client.query(`
        DELETE FROM fee_collection 
        WHERE fee_struct_id IN (SELECT fee_struct_id FROM fee_structure WHERE class_id = $1)
      `, [id]);
      await client.query(`
        DELETE FROM fee_installment 
        WHERE fee_struct_id IN (SELECT fee_struct_id FROM fee_structure WHERE class_id = $1)
      `, [id]);
      await client.query("DELETE FROM fee_structure WHERE class_id = $1", [id]);
      
      const sql = `
        DELETE FROM class
        WHERE class_id = $1
        RETURNING *;
      `;
      const { rows } = await client.query(sql, [id]);
      
      await client.query("COMMIT");
      return rows[0] || null;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // ✅ ADMIN LIST (UNCHANGED)
  async getAllForAdmin() {
    const sql = `
        SELECT
          c.class_id,
          c.class_name,
          c.room_number,
          c.section_id,
          c.staff_id,
          s.section_name,
          st.staff_first_name,
          st.staff_last_name,
          COUNT(ce.enrollment_id) AS students_count
        FROM class c
        LEFT JOIN section s ON s.section_id = c.section_id
        LEFT JOIN staff st ON st.staff_id = c.staff_id
        LEFT JOIN class_enrollment ce ON ce.class_id = c.class_id
        WHERE c.room_number IS NOT NULL
        GROUP BY
          c.class_id,
          c.section_id,
          c.staff_id,
          s.section_name,
          st.staff_first_name,
          st.staff_last_name
        ORDER BY c.class_id DESC;
      `;

    const { rows } = await pool.query(sql);
    return rows;
  },
};
