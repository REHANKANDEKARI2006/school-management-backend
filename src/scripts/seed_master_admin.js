import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

export async function seedMasterAdmin() {
  try {
    const email = process.env.MASTER_ADMIN_EMAIL;
    const password = process.env.MASTER_ADMIN_PASSWORD;
    const name = process.env.MASTER_ADMIN_NAME;

    if (process.env.AUTO_SEED_MASTER_ADMIN !== "true") {
      console.log("ℹ️ Auto-seeding Master Admin is disabled. Skipping seed.");
      return;
    }

    if (!email || !password) {
      console.warn("⚠️ MASTER_ADMIN_EMAIL or MASTER_ADMIN_PASSWORD not set in environment variables. Skipping seed.");
      return;
    }

    // 1. Get MASTER_ADMIN role_id
    const roleRes = await pool.query(
      "SELECT role_id FROM user_role WHERE role_code = $1",
      ["MASTER_ADMIN"]
    );

    if (roleRes.rows.length === 0) {
      console.error("❌ Role 'MASTER_ADMIN' not found in database. Please run role migrations first.");
      return;
    }

    const masterAdminRoleId = roleRes.rows[0].role_id;

    // 2. Check if any MASTER_ADMIN exists
    const userRes = await pool.query(
      'SELECT user_id FROM "user" WHERE role_id = $1 LIMIT 1',
      [masterAdminRoleId]
    );

    if (userRes.rows.length > 0) {
      console.log("✅ Master Admin verified (at least one already exists).");
      return;
    }

    // 3. Create Master Admin
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // We also need an institute_id for the user. We'll pick the first one or a default.
    const instRes = await pool.query("SELECT institute_id FROM institute LIMIT 1");
    const instituteId = instRes.rows.length > 0 ? instRes.rows[0].institute_id : 1;

    await pool.query(
      `INSERT INTO "user" (
        user_name, 
        email, 
        password_hash, 
        role_id, 
        institute_id, 
        status, 
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, email, hashedPassword, masterAdminRoleId, instituteId, "active", true]
    );

    console.log("✅ Master Admin created successfully.");
  } catch (err) {
    console.error("❌ Failed to seed Master Admin:", err);
  }
}

// If run directly
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('seed_master_admin.js') || process.argv[1].endsWith('seed_master_admin'));
if (isDirectRun) {
    seedMasterAdmin().then(() => process.exit(0));
}
