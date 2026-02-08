import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const GuardianModel = {
  async create(g) {
    const sql = `
      INSERT INTO guardian (
        guardian_user_id,
        grdn_first_name,
        grdn_last_name,
        student_id,
        phone,
        email,
        address,
        gender_id,
        user_status_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
    `;

    const values = [
      g.guardian_user_id,
      g.grdn_first_name,
      g.grdn_last_name,
      g.student_id,
      g.phone,
      g.email,
      g.address,
      g.gender_id,
      g.user_status_id,
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0];
  },
};
