import { Pool } from "pg";
import dotenv from "dotenv";
import crypto from "crypto";
import { emailService } from "../services/email_service.js";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const StudentModel = {
  /* =========================
     GET ALL
  ========================= */
  async getAll(instituteId) {
    const { rows } = await pool.query(`
      SELECT 
        s.student_id,
        s.student_user_id,
        s.stu_first_name,
        s.stu_last_name,
        s.email,
        s.joined_date,
        s.user_status_id,
        s.profile_url,
        g.email AS parent_email,
        c.class_id,
        c.class_name,
        sec.section_name,
        ust.status_name
      FROM student s
      INNER JOIN "user" u ON u.user_id = s.student_user_id
      LEFT JOIN guardian g ON g.student_id = s.student_id
      LEFT JOIN class_enrollment ce
        ON ce.student_id = s.student_id
        AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN user_status ust ON ust.user_status_id = s.user_status_id
      WHERE s.is_deleted = FALSE
        AND u.institute_id = $1
      ORDER BY s.student_id DESC
    `, [instituteId]);
    return rows;
  },

  /* =========================
     GET BY CLASS ID (for grade entry)
  ========================= */
  async getByClassId(classId, instituteId) {
    console.log(`StudentModel.getByClassId called with classId: ${classId}, instituteId: ${instituteId}`);
    const { rows } = await pool.query(`
      SELECT
        s.student_id,
        s.student_user_id,
        s.stu_first_name,
        s.stu_last_name,
        s.email,
        s.user_status_id,
        s.profile_url,
        s.joined_date,
        g.grdn_first_name AS father_name,
        g.grdn_last_name  AS mother_name,
        g.phone           AS primary_contact,
        s.email           AS student_email
      FROM student s
      INNER JOIN "user" u ON u.user_id = s.student_user_id
      INNER JOIN class_enrollment ce
        ON ce.student_id = s.student_id
        AND ce.class_id = $1
        AND ce.status_id = 1
      LEFT JOIN guardian g ON g.student_id = s.student_id
      WHERE s.is_deleted = FALSE
        AND u.institute_id = $2
      ORDER BY s.stu_first_name, s.stu_last_name
    `, [classId, instituteId]);
    console.log(`StudentModel.getByClassId returned ${rows.length} rows`);
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
        s.profile_url,
        s.gender_id,
        bg.blood_group AS blood_group,
        g.grdn_first_name AS father_name,
        g.grdn_last_name  AS mother_name,
        g.phone           AS primary_contact,
        g.email           AS parent_email,
        c.class_id,
        c.class_name,
        sec.section_name,
        ust.status_name
      FROM student s
      LEFT JOIN blood_group bg ON bg.bg_id = s.bg_id
      LEFT JOIN guardian g ON g.student_id = s.student_id
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN user_status ust ON ust.user_status_id = s.user_status_id
      WHERE s.student_id = $1
        AND s.is_deleted = FALSE
      
      `,
      [id]
    );
    return rows[0] || null;
  },

  /* =========================
     FIND BY USER ID
  ========================= */
  async findByUserId(userId) {
    const { rows } = await pool.query(
      `
      SELECT
        s.student_id,
        ce.class_id,
        c.section_id
      FROM student s
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      WHERE s.student_user_id = $1
        AND s.is_deleted = FALSE
      `,
      [userId]
    );
    return rows[0] || null;
  },

  /* =========================
     CREATE STUDENT (UPDATED FOR CLASS)
  ========================= */
  async createStudent(data, authUser) {
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
        profile_url,
        avatar, // Fallback for frontend
        gender_id,
      } = data;

      const finalProfileUrl = profile_url || avatar;

      const safeStudentEmail = email || `${stu_first_name.toLowerCase().replace(/\s/g, '')}${Date.now().toString().slice(-4)}@student.com`;
      const safeGuardianEmail =
        parentEmail || `guardian_${Date.now()}@temp.com`;

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      /* ---------- CREATE STUDENT USER ---------- */
      const studentUserRes = await client.query(
        `
        INSERT INTO "user" (
          user_name,
          institute_id,
          email,
          password_hash,
          role_id,
          is_active,
          status,
          invite_token,
          invite_token_expiry
        )
        VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8)
        RETURNING user_id
        `,
        [
          safeStudentEmail,
          authUser.institute_id,
          safeStudentEmail,
          "PENDING",
          18,
          "pending",
          inviteToken,
          inviteTokenExpiry
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
          joined_date,
          profile_url,
          gender_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
          finalProfileUrl,
          gender_id ? Number(gender_id) : null,
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

      let emailSent = false;
      let emailError = null;

      try {
        // 1. Send Invitation to Student via Guardian's Email
        await emailService.sendInvitation({
          to: safeGuardianEmail,
          name: `${stu_first_name} ${stu_last_name}`,
          role: "Student",
          token: inviteToken,
          loginEmail: safeGuardianEmail
        });

        // 2. Send Confirmation to Guardian
        let className = "Assigned Class";
        if (class_id) {
          const classRes = await pool.query('SELECT class_name FROM class WHERE class_id = $1', [class_id]);
          if (classRes.rows.length > 0) className = classRes.rows[0].class_name;
        }

        await emailService.sendStudentEnrollmentConfirmation({
          to: safeGuardianEmail,
          guardianName: fatherName || "Guardian",
          studentName: `${stu_first_name} ${stu_last_name}`,
          className: className,
          enrollmentDate: new Date(joined_date || Date.now()).toLocaleDateString(),
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("❌ Student Creation Emails Failed:", emailErr.message);
        emailError = emailErr.message;
      }

      return { student_id: studentId, email_sent: emailSent, email_error: emailError };
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
        class_id,
        profile_url,
        avatar, // Handle 'avatar' from frontend
        gender_id,
      } = data;

      const finalProfileUrl = profile_url || avatar;

      // Fetch old status
      const oldStudentRes = await client.query(
        'SELECT user_status_id FROM student WHERE student_id = $1',
        [id]
      );
      const oldStatusId = oldStudentRes.rows[0]?.user_status_id;

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
          profile_url    = COALESCE($7, profile_url),
          gender_id      = $8,
          updated_at     = NOW()
        WHERE student_id = $9
          AND is_deleted = FALSE
        `,
        [
          stu_first_name,
          stu_last_name,
          address,
          date_of_birth,
          bg_id,
          user_status_id,
          finalProfileUrl,
          gender_id ? Number(gender_id) : null,
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

      /* ==================================================
         ✅ NEW: UPDATE CLASS ENROLLMENT
      ================================================== */
      if (class_id) {
        // Soft-delete or hard-delete old active enrollment
        await client.query(
          `
          DELETE FROM class_enrollment 
          WHERE student_id = $1 AND status_id = 1
          `,
          [id]
        );
        // Insert new active enrollment
        await client.query(
          `
          INSERT INTO class_enrollment (student_id, class_id, status_id)
          VALUES ($1, $2, 1)
          `,
          [id, class_id]
        );
      }

      await client.query("COMMIT");

      // Send notification if status changed and valid parent email is provided
      if (oldStatusId !== undefined && Number(oldStatusId) !== Number(user_status_id) && parentEmail) {
        try {
          const statusNameRes = await pool.query(
            'SELECT status_name FROM user_status WHERE user_status_id = $1',
            [user_status_id]
          );
          const statusName = statusNameRes.rows[0]?.status_name || `Status #${user_status_id}`;
          const studentName = `${stu_first_name} ${stu_last_name}`;

          await emailService.sendStudentStatusUpdateNotification({
            to: parentEmail,
            studentName,
            statusName
          });
        } catch (emailErr) {
          console.error("❌ Failed to send student status update email:", emailErr.message);
        }
      }

      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /* =========================
     HARD DELETE (REPLACING SOFT DELETE)
  ========================= */
  async softDeleteById(id) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Delete child records for student
      await client.query("DELETE FROM class_enrollment WHERE student_id = $1", [id]);
      await client.query("DELETE FROM attendance_record WHERE student_id = $1", [id]);
      await client.query("DELETE FROM exam_grades WHERE student_id = $1", [id]);
      await client.query("DELETE FROM fee_collection WHERE student_id = $1", [id]);
      await client.query("DELETE FROM event_attendance WHERE student_id = $1", [id]);
      await client.query("DELETE FROM promotion WHERE student_id = $1", [id]);
      await client.query("DELETE FROM generated_documents WHERE student_id = $1", [id]);
      
      // Delete guardian and its related user record
      const { rows } = await client.query("DELETE FROM guardian WHERE student_id = $1 RETURNING guardian_user_id", [id]);
      if (rows.length > 0 && rows[0].guardian_user_id) {
        await client.query("DELETE FROM \"user\" WHERE user_id = $1", [rows[0].guardian_user_id]);
      }

      // Delete student and its related user record
      const stuRes = await client.query("DELETE FROM student WHERE student_id = $1 RETURNING student_user_id", [id]);
      if (stuRes.rows.length > 0 && stuRes.rows[0].student_user_id) {
        await client.query("DELETE FROM \"user\" WHERE user_id = $1", [stuRes.rows[0].student_user_id]);
      }

      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
