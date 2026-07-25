import pool from "../config/db.js";
import crypto from "crypto";
import { emailService } from "../services/email_service.js";

export const StudentModel = {
  /* =========================
     GET ALL
  ========================= */
  async getAll(instituteId, { classId = null, search = null, statusId = null, page = 1, limit = 50 } = {}) {
    let whereClauses = [`s.is_deleted = FALSE`, `u.institute_id = $1`];
    const params = [instituteId];
    let paramIdx = 2;

    if (classId) {
      whereClauses.push(`ce.class_id = $${paramIdx++}`);
      params.push(classId);
    }

    if (statusId) {
      whereClauses.push(`s.user_status_id = $${paramIdx++}`);
      params.push(statusId);
    }

    if (search && search.trim()) {
      whereClauses.push(`(s.stu_first_name ILIKE $${paramIdx} OR s.stu_last_name ILIKE $${paramIdx} OR s.email ILIKE $${paramIdx} OR g.email ILIKE $${paramIdx})`);
      params.push(`%${search.trim()}%`);
      paramIdx++;
    }

    const whereStr = `WHERE ${whereClauses.join(' AND ')}`;

    // Total count
    const countRes = await pool.query(`
      SELECT COUNT(DISTINCT s.student_id)
      FROM student s
      INNER JOIN "user" u ON u.user_id = s.student_user_id
      LEFT JOIN guardian g ON g.student_id = s.student_id
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      ${whereStr}
    `, params);

    const total = parseInt(countRes.rows[0].count, 10);
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const dataParams = [...params, limitNum, offset];

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
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN user_status ust ON ust.user_status_id = s.user_status_id
      ${whereStr}
      ORDER BY s.student_id DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, dataParams);

    return {
      rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
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
  async findById(id, instituteId) {
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
        ust.status_name,
        u.institute_id
      FROM student s
      INNER JOIN "user" u ON u.user_id = s.student_user_id
      LEFT JOIN blood_group bg ON bg.bg_id = s.bg_id
      LEFT JOIN guardian g ON g.student_id = s.student_id
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN user_status ust ON ust.user_status_id = s.user_status_id
      WHERE s.student_id = $1
        AND ($2::INTEGER IS NULL OR u.institute_id = $2::INTEGER)
        AND s.is_deleted = FALSE
      `,
      [id, instituteId]
    );
    const student = rows[0] || null;
    if (student && student.class_id) {
      const rollRes = await pool.query(
        `WITH enrolled_students AS (
          SELECT 
            st.student_id,
            ROW_NUMBER() OVER (ORDER BY st.stu_first_name, st.stu_last_name) as roll_number
          FROM student st
          JOIN class_enrollment ce ON ce.student_id = st.student_id AND ce.status_id = 1
          WHERE ce.class_id = $1 AND st.is_deleted = FALSE
        )
        SELECT roll_number FROM enrolled_students WHERE student_id = $2`,
        [student.class_id, student.student_id]
      );
      if (rollRes.rows.length > 0) {
        student.roll_number = String(rollRes.rows[0].roll_number);
      } else {
        student.roll_number = null;
      }
    } else if (student) {
      student.roll_number = null;
    }
    return student;
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

      const safeStudentEmail = email && email.trim() !== '' ? email.trim() : `${stu_first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}${Date.now().toString().slice(-4)}@student.com`;
      const safeGuardianEmail = parentEmail && parentEmail.trim() !== '' ? parentEmail.trim() : `guardian_${Date.now()}@temp.com`;

      const safeUserStatusId = (user_status_id && !isNaN(Number(user_status_id)) && Number(user_status_id) > 0)
        ? Number(user_status_id)
        : 1;
      const safeBgId = (bg_id && !isNaN(Number(bg_id)) && Number(bg_id) > 0)
        ? Number(bg_id)
        : null;
      const safeGenderId = (gender_id && !isNaN(Number(gender_id)) && Number(gender_id) > 0)
        ? Number(gender_id)
        : null;
      const safeClassId = (class_id && !isNaN(Number(class_id)) && Number(class_id) > 0)
        ? Number(class_id)
        : null;
      const safeDob = (date_of_birth && String(date_of_birth).trim() !== '')
        ? String(date_of_birth).trim()
        : null;
      const safeJoinedDate = (joined_date && String(joined_date).trim() !== '')
        ? String(joined_date).trim()
        : new Date().toISOString();

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      /* ---------- ENSURE UNIQUE STUDENT USERNAME ---------- */
      let studentUsername = safeStudentEmail;
      const existingUserCheck = await client.query(
        'SELECT user_id FROM "user" WHERE LOWER(user_name) = LOWER($1)',
        [studentUsername]
      );
      if (existingUserCheck.rows.length > 0) {
        studentUsername = `${stu_first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@student.com`;
      }

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
          studentUsername,
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
          address || null,
          safeDob,
          safeBgId,
          safeUserStatusId,
          safeJoinedDate,
          finalProfileUrl,
          safeGenderId,
        ]
      );

      const studentId = studentRes.rows[0].student_id;

      /* ==================================================
         CREATE CLASS ENROLLMENT
      ================================================== */
      if (safeClassId) {
        await client.query(
          `
            INSERT INTO class_enrollment (
              student_id,
              class_id,
              status_id
            )
            VALUES ($1, $2, 1)
            `,
          [studentId, safeClassId]
        );
      }

      /* ---------- GET OR CREATE GUARDIAN USER ---------- */
      let guardianUserId;
      const existingGuardianUser = await client.query(
        'SELECT user_id FROM "user" WHERE LOWER(email) = LOWER($1) AND role_id = 20 LIMIT 1',
        [safeGuardianEmail]
      );

      if (existingGuardianUser.rows.length > 0) {
        guardianUserId = existingGuardianUser.rows[0].user_id;
      } else {
        let guardianUsername = safeGuardianEmail;
        const existingGrdnNameCheck = await client.query(
          'SELECT user_id FROM "user" WHERE LOWER(user_name) = LOWER($1)',
          [guardianUsername]
        );
        if (existingGrdnNameCheck.rows.length > 0) {
          guardianUsername = `guardian_${Date.now()}_${Math.floor(Math.random() * 1000)}@temp.com`;
        }

        const guardianUserRes = await client.query(
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
            guardianUsername,
            authUser.institute_id,
            safeGuardianEmail,
            "PENDING",
            20,
            "pending",
            inviteToken,
            inviteTokenExpiry
          ]
        );
        guardianUserId = guardianUserRes.rows[0].user_id;
      }

      /* ---------- CREATE GUARDIAN ---------- */
      await client.query(
        `
        INSERT INTO guardian (
          guardian_user_id,
          grdn_first_name,
          grdn_last_name,
          student_id,
          phone,
          email,
          user_status_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          guardianUserId,
          fatherName,
          motherName,
          studentId,
          primaryContact,
          safeGuardianEmail,
          user_status_id || 13, // 13 = Pending Approval
        ]
      );

      await client.query("COMMIT");

      // ── NON-BLOCKING BACKGROUND EMAIL DISPATCH ──
      setImmediate(async () => {
        const startTime = Date.now();
        try {
          // 1. Send Invitation to Student via Guardian's Email
          await emailService.sendInvitation({
            to: safeGuardianEmail,
            name: `${stu_first_name} ${stu_last_name}`,
            role: "Student",
            token: inviteToken,
            loginEmail: safeGuardianEmail,
            instituteId: authUser.institute_id,
            frontendUrl: authUser.frontendUrl
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
            instituteId: authUser.institute_id,
            frontendUrl: authUser.frontendUrl
          });
          console.log(`⏱️ [BACKGROUND EMAIL] Student enrollment emails sent in ${Date.now() - startTime}ms`);
        } catch (emailErr) {
          console.error("❌ [BACKGROUND EMAIL ERROR] Student creation emails failed:", emailErr.message);
        }
      });

      return { student_id: studentId, email_sent: true };
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

      // Fetch old status and institute_id
      const oldStudentRes = await client.query(
        `SELECT s.user_status_id, u.institute_id 
         FROM student s 
         JOIN "user" u ON s.student_user_id = u.user_id 
         WHERE s.student_id = $1`,
        [id]
      );
      const oldStatusId = oldStudentRes.rows[0]?.user_status_id;
      const instituteId = oldStudentRes.rows[0]?.institute_id;

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
            statusName,
            instituteId
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
      await client.query("DELETE FROM class_enrollment WHERE student_id = $1", [id]).catch(() => {});
      await client.query("DELETE FROM attendance_record WHERE student_id = $1", [id]).catch(() => {});
      await client.query("DELETE FROM exam_grades WHERE student_id = $1", [id]).catch(() => {});
      await client.query("DELETE FROM fee_collection WHERE student_id = $1", [id]).catch(() => {});
      await client.query("DELETE FROM event_attendance WHERE student_id = $1", [id]).catch(() => {});
      await client.query("DELETE FROM promotion WHERE student_id = $1", [id]).catch(() => {});
      await client.query("DELETE FROM generated_documents WHERE student_id = $1", [id]).catch(() => {});
      
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
