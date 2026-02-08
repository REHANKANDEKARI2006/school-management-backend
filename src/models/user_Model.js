import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const UserModel = {
  async createUser(user) {
    const sql = `
      INSERT INTO "user" (
        user_name,
        institute_id,
        email,
        password_hash,
        role_id,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,true)
      RETURNING *;
    `;

    const values = [
      user.user_name,
      user.institute_id,
      user.email,
      user.password_hash,
      user.role_id,
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0];
  },
};
