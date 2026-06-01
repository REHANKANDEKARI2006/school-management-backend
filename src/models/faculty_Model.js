import pool from "../config/db.js";
import crypto from "crypto";

export const FacultyModel = {
  async getAll(instituteId) {
    const query = `
      SELECT s.*, us.status_name, d.dept_name, sub.subject_name
      FROM staff s
      JOIN "user" u ON s.user_id = u.user_id
      LEFT JOIN user_status us ON s.user_status_id = us.user_status_id
      LEFT JOIN department d ON s.dept_id = d.dept_id
      LEFT JOIN subject sub ON s.subject_id = sub.subject_id
      WHERE u.institute_id = $1 AND s.role_id = 3
      ORDER BY s.created_at DESC;
    `;
    const res = await pool.query(query, [instituteId]);
    return res.rows;
  },

  async findById(id) {
    const query = `
      SELECT s.*, us.status_name, d.dept_name, sub.subject_name
      FROM staff s
      LEFT JOIN user_status us ON s.user_status_id = us.user_status_id
      LEFT JOIN department d ON s.dept_id = d.dept_id
      LEFT JOIN subject sub ON s.subject_id = sub.subject_id
      WHERE s.staff_id = $1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0];
  },

  /**
   * Complex transaction: 
   * 1. Check/Create User account (pending status)
   * 2. Create Staff record
   */
  async createFacultyTransaction(data, authUser) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        staff_first_name,
        staff_last_name,
        email,
        contact,
        role_id,
        dept_id,
        subject_id,
        bg_id,
        gender_id,
        joining_date,
        user_status_id,
        qualification,
        profile_url,
        avatar,
      } = data;

      const finalProfileUrl = profile_url || avatar || null;
      const fullName = `${staff_first_name} ${staff_last_name}`.trim();

      // ── 1. Check if a user with this email already exists ──
      const existingUser = await client.query(
        `SELECT user_id, status FROM "user" WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      );

      let userId;
      let invite_token = null;
      let isNewUser = false;

      if (existingUser.rows.length > 0) {
        // User already exists — reuse the user_id (don't re-invite)
        userId = existingUser.rows[0].user_id;

        // ── Check if this user is ALREADY a staff member ──
        const existingStaff = await client.query(
          `SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        if (existingStaff.rows.length > 0) {
          throw Object.assign(new Error(`A faculty or staff member with the email ${email} already exists in the system.`), { status: 409 });
        }
      } else {
        // ── 2. New user — create with pending status + invite token ──
        invite_token = crypto.randomBytes(32).toString("hex");
        const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const userRes = await client.query(
          `INSERT INTO "user" (
            user_name, institute_id, email, role_id,
            status, is_active,
            invite_token, invite_token_expiry, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING user_id`,
          [
            fullName,
            authUser.institute_id,
            email,
            role_id || 3, // Default to Teacher if not specified
            "pending",
            false,
            invite_token,
            invite_token_expiry,
            authUser.user_id,
          ]
        );
        userId = userRes.rows[0].user_id;
        isNewUser = true;
      }

      // ── 3. Create staff record ──
      const staffRes = await client.query(
        `INSERT INTO staff (
          user_id,
          staff_first_name,
          staff_last_name,
          email,
          contact,
          role_id,
          dept_id,
          subject_id,
          bg_id,
          gender_id,
          qualification,
          joining_date,
          user_status_id,
          profile_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;`,
        [
          userId,
          staff_first_name,
          staff_last_name,
          email,
          contact || null,
          role_id || 3,
          dept_id,
          subject_id || null,
          bg_id || null,
          gender_id || null,
          qualification || null,
          joining_date || new Date(),
          user_status_id || 13, // 13 = Pending Approval until they set password
          finalProfileUrl,
        ]
      );

      await client.query("COMMIT");

      // Return staff data + invite info so the controller can send the email
      return {
        ...staffRes.rows[0],
        invite_token,       // null if user already existed
        isNewUser,
        fullName,
      };

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ CREATE FACULTY TRANSACTION ERROR:", err);
      throw err;
    } finally {
      client.release();
    }
  },

  async updateFacultyTransaction(staffId, data) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Get current staff info to find user_id
      const currentRes = await client.query(
        "SELECT user_id, email FROM staff WHERE staff_id = $1",
        [staffId]
      );
      if (currentRes.rows.length === 0) {
        throw Object.assign(new Error("Faculty not found"), { status: 404 });
      }
      const { user_id, email: oldEmail } = currentRes.rows[0];

      // 2. Update User table if email or name changed
      const fullName = `${data.staff_first_name || ""} ${data.staff_last_name || ""}`.trim();
      
      if (data.email && data.email.toLowerCase() !== oldEmail?.toLowerCase()) {
        // Check if new email is taken by ANOTHER user
        const emailCheck = await client.query(
          'SELECT user_id FROM "user" WHERE LOWER(email) = LOWER($1) AND user_id != $2',
          [data.email, user_id]
        );
        if (emailCheck.rows.length > 0) {
          throw Object.assign(new Error("This email is already in use by another account."), { status: 409 });
        }

        await client.query(
          'UPDATE "user" SET email = $1, user_name = $2 WHERE user_id = $3',
          [data.email, fullName, user_id]
        );
      } else if (fullName) {
        await client.query(
          'UPDATE "user" SET user_name = $1 WHERE user_id = $2',
          [fullName, user_id]
        );
      }

      // 3. Update Staff table
      const fields = Object.keys(data);
      if (fields.length > 0) {
        const set = fields.map((f, i) => `${f} = $${i + 1}`);
        const values = fields.map(f => data[f]);
        values.push(staffId);

        const updateQuery = `
          UPDATE staff
          SET ${set.join(", ")}
          WHERE staff_id = $${values.length}
          RETURNING *;
        `;
        const staffRes = await client.query(updateQuery, values);
        await client.query("COMMIT");
        return staffRes.rows[0];
      }

      await client.query("COMMIT");
      return currentRes.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ UPDATE FACULTY TRANSACTION ERROR:", err);
      throw err;
    } finally {
      client.release();
    }
  },

  async update(query, values) {
    const res = await pool.query(query, values);
    return res.rows[0];
  },

  async softDelete(id) {
    const query = "UPDATE staff SET user_status_id = 2 WHERE staff_id = $1 RETURNING *";
    const res = await pool.query(query, [id]);
    return res.rows[0];
  },
};
