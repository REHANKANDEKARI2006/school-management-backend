import pool from './src/config/db.js';
import { emailService } from './src/services/email_service.js';
import crypto from "crypto";

async function simulateInvite() {
    try {
        const name = "Simulated Admin";
        const email = "simulated_admin@demo.edu.in";
        const role_code = "INSTITUTE_ADMIN";

        console.log("🔍 Checking role...");
        const roleRes = await pool.query("SELECT role_id FROM user_role WHERE role_code = $1", [role_code]);
        console.log("Role ID:", roleRes.rows[0]?.role_id);

        console.log("📝 Inserting user...");
        const invite_token = crypto.randomBytes(32).toString("hex");
        const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        const userRes = await pool.query(
          `INSERT INTO "user" (
            user_name, email, role_id, 
            institute_id, status, is_active,
            invite_token, invite_token_expiry
          ) VALUES ($1, $2, $3, 1, 'pending', false, $4, $5) RETURNING user_id`,
          [name, email, roleRes.rows[0].role_id, invite_token, invite_token_expiry]
        );
        console.log("✅ User created ID:", userRes.rows[0].user_id);

        console.log("✉️ Sending email...");
        await emailService.sendInvitation({
          to: email,
          name: name,
          role: "Admin",
          token: invite_token,
        });
        console.log("✅ Email sent");

    } catch (err) {
        console.error("❌ Simulation Failed:", err);
    } finally {
        process.exit();
    }
}

simulateInvite();
