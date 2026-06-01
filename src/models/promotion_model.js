import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const PromotionModel = {

  /* ─── Get students for promotion (admin sees all, class teacher sees own class) ─── */
  async getStudentsForPromotion(instituteId, restrictToClassId = null) {
    const params = [instituteId];
    let classFilter = "";

    if (restrictToClassId) {
      classFilter = `AND ce.class_id = $2`;
      params.push(restrictToClassId);
    }

    const { rows } = await pool.query(`
      SELECT
        s.student_id,
        s.stu_first_name,
        s.stu_last_name,
        s.profile_url,
        s.user_status_id,
        ust.status_name,
        c.class_id,
        c.class_name,
        sec.section_name,
        c.section_id
      FROM student s
      INNER JOIN "user" u ON u.user_id = s.student_user_id
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN user_status ust ON ust.user_status_id = s.user_status_id
      WHERE s.is_deleted = FALSE
        AND u.institute_id = $1
        ${classFilter}
      ORDER BY c.class_name NULLS LAST, s.stu_first_name, s.stu_last_name
    `, params);

    return rows;
  },

  /* ─── Get all classes ordered for dropdown selection ─── */
  async getAllClassesOrdered() {
    const { rows } = await pool.query(`
      SELECT
        c.class_id,
        c.class_name,
        s.section_name,
        c.section_id,
        COUNT(ce.enrollment_id) AS student_count
      FROM class c
      LEFT JOIN section s ON s.section_id = c.section_id
      LEFT JOIN class_enrollment ce ON ce.class_id = c.class_id AND ce.status_id = 1
      WHERE c.room_number IS NOT NULL
      GROUP BY c.class_id, c.class_name, s.section_name, c.section_id
      ORDER BY
        CASE WHEN c.class_name ~ '^[0-9]+$' THEN c.class_name::int ELSE 9999 END,
        c.class_name,
        s.section_name
    `);
    return rows;
  },

  /* ─── Promote students: bulk update class_enrollment in a transaction ─── */
  async promoteStudents(promotions) {
    // promotions = [{ studentId, targetClassId }]
    if (!promotions || promotions.length === 0) return { promoted: 0 };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let promoted = 0;

      for (const { studentId, targetClassId } of promotions) {
        // 1. Remove current active enrollment
        await client.query(
          `DELETE FROM class_enrollment WHERE student_id = $1 AND status_id = 1`,
          [studentId]
        );
        // 2. Insert new active enrollment in target class
        await client.query(
          `INSERT INTO class_enrollment (student_id, class_id, status_id) VALUES ($1, $2, 1)`,
          [studentId, targetClassId]
        );
        promoted++;
      }

      await client.query("COMMIT");
      return { promoted };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /* ─── Get class assigned to a class teacher by their user_id ─── */
  async getClassTeacherClassId(userId) {
    const { rows } = await pool.query(`
      SELECT c.class_id
      FROM class c
      JOIN staff st ON st.staff_id = c.staff_id
      WHERE st.user_id = $1
      LIMIT 1
    `, [userId]);
    return rows[0]?.class_id || null;
  },
};
