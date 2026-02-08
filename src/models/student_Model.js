import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const StudentModel = {
  /* =========================
     GET ALL
  ========================= */
  async getAll() {
    const { rows } = await pool.query(`
      SELECT 
        s.student_id,
        s.student_user_id,
        s.stu_first_name,
        s.stu_last_name,
        s.email,
        s.joined_date,
        s.user_status_id,
        c.class_name,
        sec.section_name
      FROM student s
      LEFT JOIN class_enrollment ce
        ON ce.student_id = s.student_id
        AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      WHERE s.is_deleted = FALSE
      ORDER BY s.student_id DESC
    `);
    return rows;
  },

  /* =========================
     FIND BY ID
  ========================= */
  async findById(id) {
    const { rows } = await pool.query(
      `
      SELECT
        s.student_id,
        s.stu_first_name,
        s.stu_last_name,
        s.email,
        s.address,
        s.date_of_birth,
        s.joined_date,
        s.user_status_id,
        bg.blood_group AS blood_group,
        g.grdn_first_name AS father_name,
        g.grdn_last_name  AS mother_name,
        g.phone           AS primary_contact,
        g.email           AS parent_email,
        c.class_name,
        sec.section_name
      FROM student s
      LEFT JOIN blood_group bg ON bg.bg_id = s.bg_id
      LEFT JOIN guardian g ON g.student_id = s.student_id
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      WHERE s.student_id = $1
        AND s.is_deleted = FALSE
      
      `,
      [id]
    );
    return rows[0] || null;
  },

  /* =========================
     CREATE STUDENT (UPDATED FOR CLASS)
  ========================= */
  async createStudent(data, authUser) {
    
    console.log("CLASS ID RECEIVED:", class_id);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        stu_first_name,
        stu_last_name,
        email,
        address,
        date_of_birth,
        bg_id,
        user_status_id,
        joined_date,
        fatherName,
        motherName,
        primaryContact,
        parentEmail,
        class_id, 
      } = data;

      const safeStudentEmail = email || `student_${Date.now()}@temp.com`;
      const safeGuardianEmail =
        parentEmail || `guardian_${Date.now()}@temp.com`;

      /* ---------- CREATE STUDENT USER ---------- */
      const studentUserRes = await client.query(
        `
        INSERT INTO "user" (
          user_name,
          institute_id,
          email,
          password_hash,
          role_id,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,true)
        RETURNING user_id
        `,
        [
          safeStudentEmail,
          authUser.institute_id,
          safeStudentEmail,
          "TEMP_PASSWORD",
          18,
        ]
      );

      const studentUserId = studentUserRes.rows[0].user_id;

      /* ---------- CREATE STUDENT ---------- */
      const studentRes = await client.query(
        `
        INSERT INTO student (
          student_user_id,
          stu_first_name,
          stu_last_name,
          email,
          address,
          date_of_birth,
          bg_id,
          user_status_id,
          joined_date
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING student_id
        `,
        [
          studentUserId,
          stu_first_name,
          stu_last_name,
          safeStudentEmail,
          address,
          date_of_birth,
          bg_id,
          user_status_id,
          joined_date,
        ]
      );

      const studentId = studentRes.rows[0].student_id;

      /* ==================================================
         ✅ NEW: CREATE CLASS ENROLLMENT (NO LINE REMOVED)
      ================================================== */
        if (class_id) {
          await client.query(
            `
            INSERT INTO class_enrollment (
              student_id,
              class_id,
              status_id
            )
            VALUES ($1, $2, 1)
            `,
            [studentId, class_id]
          );
        }

      /* ---------- CREATE GUARDIAN USER ---------- */
      const guardianUserRes = await client.query(
        `
        INSERT INTO "user" (
          user_name,
          institute_id,
          email,
          password_hash,
          role_id,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,true)
        RETURNING user_id
        `,
        [
          safeGuardianEmail,
          authUser.institute_id,
          safeGuardianEmail,
          "TEMP_PASSWORD",
          20,
        ]
      );

      const guardianUserId = guardianUserRes.rows[0].user_id;

      /* ---------- CREATE GUARDIAN ---------- */
      await client.query(
        `
        INSERT INTO guardian (
          guardian_user_id,
          grdn_first_name,
          grdn_last_name,
          student_id,
          phone,
          email
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          guardianUserId,
          fatherName,
          motherName,
          studentId,
          primaryContact,
          safeGuardianEmail,
        ]
      );

      await client.query("COMMIT");
      return { student_id: studentId };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /* =========================
     UPDATE STUDENT + GUARDIAN
  ========================= */
  async updateById(id, data) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        stu_first_name,
        stu_last_name,
        address,
        date_of_birth,
        bg_id,
        user_status_id,
        fatherName,
        motherName,
        primaryContact,
        parentEmail,
      } = data;

      await client.query(
        `
        UPDATE student
        SET
          stu_first_name = $1,
          stu_last_name  = $2,
          address        = $3,
          date_of_birth  = $4,
          bg_id          = $5,
          user_status_id = $6,
          updated_at     = NOW()
        WHERE student_id = $7
          AND is_deleted = FALSE
        `,
        [
          stu_first_name,
          stu_last_name,
          address,
          date_of_birth,
          bg_id,
          user_status_id,
          id,
        ]
      );

      await client.query(
        `
        UPDATE guardian
        SET
          grdn_first_name = $1,
          grdn_last_name  = $2,
          phone           = $3,
          email           = $4,
          updated_at      = NOW()
        WHERE student_id = $5
        `,
        [
          fatherName,
          motherName,
          primaryContact,
          parentEmail,
          id,
        ]
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /* =========================
     SOFT DELETE
  ========================= */
  async softDeleteById(id) {
    const result = await pool.query(
      `
      UPDATE student
      SET is_deleted = TRUE,
          updated_at = NOW()
      WHERE student_id = $1
        AND is_deleted = FALSE
      `,
      [id]
    );
    return result.rowCount > 0;
  },
};
