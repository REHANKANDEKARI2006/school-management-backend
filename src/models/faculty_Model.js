// models/faculty_Model.js
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const FacultyModel = {

  async getAll() {
    const sql = `SELECT * FROM staff ORDER BY staff_id DESC;`;
    const { rows } = await pool.query(sql);
    return rows;
  },

  async findById(id) {
    const sql = `SELECT * FROM staff WHERE staff_id = $1 LIMIT 1;`;
    const { rows } = await pool.query(sql, [id]);
    return rows[0] || null;
  },

  async create(faculty) {
    const sql = `
      INSERT INTO staff
        (first_name, last_name, email, phone, status, joined_date)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
    `;

    const values = [
      faculty.first_name,
      faculty.last_name,
      faculty.email,
      faculty.phone,
      faculty.status,
      faculty.joined_date,
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  async update(query, values) {
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

    async delete(id) {
    const sql = `
      UPDATE staff
      SET status = 'inactive'
      WHERE staff_id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(sql, [id]);
    return rows[0] || null;
  },

};
