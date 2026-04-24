import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

async function forceSeed() {
  try {
    const email = "masteradmin1@demo.edu.in";
    const password = "password123";
    const name = "Master Admin";

    console.log("🚀 Starting Force Seed for:", email);

    // 1. Get role_id
    const roleRes = await pool.query("SELECT role_id FROM user_role WHERE role_code = 'MASTER_ADMIN'");
    if (roleRes.rows.length === 0) throw new Error("MASTER_ADMIN role not found");
    const roleId = roleRes.rows[0].role_id;

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Upsert User
    const userRes = await pool.query(
      `INSERT INTO "user" (user_name, email, password_hash, role_id, institute_id, status, is_active)
       VALUES ($1, $2, $3, $4, 1, 'active', true)
       ON CONFLICT (email) 
       DO UPDATE SET password_hash = $3, status = 'active', is_active = true, role_id = $4
       RETURNING user_id`,
      [name, email, hashedPassword, roleId]
    );

    console.log("✅ Master Admin seeded/updated. User ID:", userRes.rows[0].user_id);
    process.exit(0);
  } catch (err) {
    console.error("❌ Force Seed Failed:", err);
    process.exit(1);
  }
}

forceSeed();
