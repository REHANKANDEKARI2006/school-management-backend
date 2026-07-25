import pool from "../config/db.js";


export const BloodGroupModel = {
  async getAll() {
    const { rows } = await pool.query("SELECT * FROM blood_group ORDER BY bg_id");
    return rows;
  }
};
