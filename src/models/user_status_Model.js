import pool from "../config/db.js";

export const UserStatusModel = {
  async getAll() {
    const { rows } = await pool.query(`
      SELECT user_status_id, status_name, description
      FROM user_status
      ORDER BY user_status_id ASC
    `);
    return rows;
  },

  async findByName(name) {
    const { rows } = await pool.query(`
      SELECT * FROM user_status WHERE status_name = $1
    `, [name]);
    return rows[0] || null;
  }
};
