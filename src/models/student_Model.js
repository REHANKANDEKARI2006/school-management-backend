// models/student_Model.js
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const StudentModel = {
  async getAll() {
    const sql = `SELECT * FROM student ORDER BY student_id DESC;`;
    const { rows } = await pool.query(sql);
    return rows;
  },

  async findById(studentId) {
    const sql = `SELECT * FROM student WHERE student_id = $1 LIMIT 1;`;
    const { rows } = await pool.query(sql, [studentId]);
    return rows[0] || null;
  },

  async create(studentObj) {
    const sql = `
      INSERT INTO student
        (user_id, stu_first_name, stu_middle_name, stu_last_name, email, status, address, date_of_birth, bg_id, joined_date, gender_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;
    `;

    const values = [
      studentObj.user_id,
      studentObj.stu_first_name,
      studentObj.stu_middle_name,
      studentObj.stu_last_name,
      studentObj.email,
      studentObj.status,
      studentObj.address,
      studentObj.date_of_birth,
      studentObj.bg_id,
      studentObj.joined_date,
      studentObj.gender_id
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  async update(query, values) {
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  async delete(studentId) {
    const sql = `DELETE FROM student WHERE student_id = $1;`;
    const result = await pool.query(sql, [studentId]);
    return result.rowCount;
  }
};