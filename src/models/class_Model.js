import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const ClassModel = {

  async getAll() {
    const sql = `SELECT * FROM class ORDER BY class_id DESC;`;
    const { rows } = await pool.query(sql);
    return rows;
  },

  async findById(id) {
    const sql = `SELECT * FROM class WHERE class_id = $1 LIMIT 1;`;
    const { rows } = await pool.query(sql, [id]);
    return rows[0] || null;
  },

  // 🔥 YAHI MAIN FIX HAI
  async create(data) {
    const sql = `
      INSERT INTO class
        (class_name, section_id, staff_id, room_number)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [
      data.class_name,
      data.section_id,   // ❗ section ❌ nahi
      data.staff_id,
      data.room_number
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0];
  },

  async update(query, values) {
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  async delete(id) {
    const sql = `DELETE FROM class WHERE class_id = $1;`;
    await pool.query(sql, [id]);
  },
};
