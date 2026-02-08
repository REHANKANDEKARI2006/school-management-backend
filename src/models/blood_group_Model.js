import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const BloodGroupModel = {
  async getAll() {
    const { rows } = await pool.query("SELECT * FROM blood_group ORDER BY bg_id");
    return rows;
  }
};
