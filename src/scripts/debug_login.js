import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

async function simulateLogin() {
  try {
    const email = "masteradmin1@demo.edu.in";
    const password = "password123";

    console.log("Simulating Login Controller...");
    
    // 1. Query
    const result = await pool.query(
      `
      SELECT 
        user_id,
        email,
        password_hash,
        role_id,
        institute_id,
        is_active
      FROM "user"
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      console.log("-> 401 Invalid email");
      return;
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      console.log("-> 403 Account is inactive");
      return;
    }

    // 2. Hash Compare
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log("-> 401 Invalid credentials");
      return;
    }

    console.log("✅ Credentials Match!");

    // 3. JWT Signing
    const accessToken = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        institute_id: user.institute_id,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_REFRESH_SECRET || "fallback_refresh",
      { expiresIn: "2h" }
    );

    console.log("✅ Tokens Generated!");
    console.log("Response payload:", {
      success: true,
      accessToken: accessToken.substring(0,20) + "...",
      refreshToken: refreshToken.substring(0,20) + "...",
      role_id: user.role_id,
    });

  } catch (err) {
    console.error("❌ Simulated Controller Error:", err);
  } finally {
    process.exit(0);
  }
}

simulateLogin();
