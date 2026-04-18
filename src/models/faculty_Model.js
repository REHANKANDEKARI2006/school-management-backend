import pool from "../config/db.js";

export const FacultyModel = {

  // ✅ FIXED: subject + department mapping
  async getAll() {
    const sql = `
      SELECT
        s.staff_id,
        s.staff_first_name,
        s.staff_last_name,
        s.email,
        s.contact,
        s.user_status_id,
        s.joining_date,
        s.qualification,
        s.profile_url,
        d.dept_name,
        sub.subject_name,
        ust.status_name
      FROM staff s
      LEFT JOIN department d ON d.dept_id = s.dept_id
      LEFT JOIN subject sub ON sub.subject_id = s.subject_id
      LEFT JOIN user_status ust ON ust.user_status_id = s.user_status_id
      ORDER BY s.staff_id DESC;
    `;
    const { rows } = await pool.query(sql);
    return rows;
  },

  // ✅ FIXED: details modal data
  async findById(id) {
    const { rows } = await pool.query(
      `
      SELECT
        s.*,
        d.dept_name,
        sub.subject_name,
        ust.status_name
      FROM staff s
      LEFT JOIN department d ON d.dept_id = s.dept_id
      LEFT JOIN subject sub ON sub.subject_id = s.subject_id
      LEFT JOIN user_status ust ON ust.user_status_id = s.user_status_id
      WHERE s.staff_id = $1
      LIMIT 1
      `,
      [id]
    );
    return rows[0] || null;
  },

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
        joining_date,
        user_status_id,
        qualification,
        profile_url,
        avatar, // Fallback
      } = data;

      const finalProfileUrl = profile_url || avatar;

      let userId;

      const existingUser = await client.query(
        `SELECT user_id FROM "user" WHERE email = $1 LIMIT 1`,
        [email]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].user_id;
      } else {
        const userRes = await client.query(
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
            email,
            authUser.institute_id,
            email,
            "TEMP_PASSWORD",
            role_id,
          ]
        );
        userId = userRes.rows[0].user_id;
      }

      const staffRes = await client.query(
        `
        INSERT INTO staff (
          user_id,
          staff_first_name,
          staff_last_name,
          email,
          contact,
          role_id,
          dept_id,
          subject_id,
          qualification,
          joining_date,
          user_status_id,
          profile_url
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *;
        `,
        [
          userId,
          staff_first_name,
          staff_last_name,
          email,
          contact || null,
          role_id,
          dept_id,
          subject_id || null,
          qualification || null,
          joining_date || new Date(),
          user_status_id || 1,
          finalProfileUrl || null,
        ]
      );

      await client.query("COMMIT");
      return staffRes.rows[0];

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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

      // Detach from classes
      await client.query("UPDATE class SET staff_id = NULL WHERE staff_id = $1", [id]);
      
      // Delete from schedule
      await client.query("DELETE FROM schedule WHERE staff_id = $1", [id]);

      // Delete the staff record and its associated user
      const { rows } = await client.query("DELETE FROM staff WHERE staff_id = $1 RETURNING user_id", [id]);
      if (rows.length > 0 && rows[0].user_id) {
        await client.query("DELETE FROM \"user\" WHERE user_id = $1", [rows[0].user_id]);
      }

      await client.query("COMMIT");
      return rows[0] || null;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
