import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const StudentModel = {
  async getAll() {
    const { rows } = await pool.query(
      "SELECT * FROM student ORDER BY student_id DESC"
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      "SELECT * FROM student WHERE student_id = $1",
      [id]
    );
    return rows[0] || null;
  },

  async create(s) {
    const sql = `
      INSERT INTO student (
        student_user_id,
        stu_first_name,
        stu_middle_name,
        stu_last_name,
        email,
        address,
        date_of_birth,
        gender_id,
        bg_id,
        joined_date,
        access_id,
        user_status_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `;

    const values = [
      s.student_user_id,
      s.stu_first_name,
      s.stu_middle_name,
      s.stu_last_name,
      s.email,
      s.address,
      s.date_of_birth,
      s.gender_id,
      s.bg_id,
      s.joined_date,
      s.access_id,
      s.user_status_id
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  async updateById(id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;

    const setQuery = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");
    const values = keys.map(k => data[k]);

    const { rows } = await pool.query(
      `UPDATE student SET ${setQuery} WHERE student_id=$${values.length + 1} RETURNING *`,
      [...values, id]
    );

    return rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query(
      "DELETE FROM student WHERE student_id = $1",
      [id]
    );
    return result.rowCount > 0;
  }
};
