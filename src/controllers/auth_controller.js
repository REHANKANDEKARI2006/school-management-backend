import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import crypto from "crypto";
import { emailService } from "../services/email_service.js";

import { StudentModel } from "../models/student_Model.js";

/* =========================
   LOGIN CONTROLLER
========================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    // 1. Rate Limiting Check
    const attemptRes = await pool.query('SELECT attempts, last_attempt FROM login_attempts WHERE ip_address = $1', [ip]);
    if (attemptRes.rows.length > 0) {
      const { attempts, last_attempt } = attemptRes.rows[0];
      const lockoutTime = 15 * 60 * 1000; // 15 mins
      if (attempts >= 5 && (new Date() - new Date(last_attempt)) < lockoutTime) {
        const remainingTime = Math.ceil((lockoutTime - (new Date() - new Date(last_attempt))) / (60 * 1000));
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Please try again in ${remainingTime} minutes.`,
        });
      }
    }

    const result = await pool.query(
      `
      SELECT 
        user_id,
        user_name,
        email,
        password_hash,
        role_id,
        institute_id,
        is_active,
        status
      FROM "user"
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    const user = result.rows[0];

    // Check status
    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your invitation is pending. Please set your password using the link sent to your email.",
      });
    }
    if (user.status === "deactivated" || !user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled. Please contact administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // 2. Log Failed Attempt
      await pool.query(
        `INSERT INTO login_attempts (ip_address, attempts, last_attempt) 
         VALUES ($1, 1, now())
         ON CONFLICT (ip_address) 
         DO UPDATE SET attempts = login_attempts.attempts + 1, last_attempt = now()`,
        [ip]
      );

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 3. Success -> Reset Attempts
    await pool.query('DELETE FROM login_attempts WHERE ip_address = $1', [ip]);

    // Role-based status check
    let statusId = 1; // Default to Active
    const roleId = Number(user.role_id);

    try {
      let statusQuery = "";
      if (roleId === 18) { // Student
        statusQuery = `SELECT user_status_id FROM student WHERE student_user_id = $1`;
      } else if (roleId === 20) { // Guardian
        statusQuery = `SELECT user_status_id FROM guardian WHERE guardian_user_id = $1`;
      } else if (roleId === 2) { // Institute Admin
        statusQuery = `SELECT user_status_id FROM admin WHERE user_id = $1`;
      } else if (roleId === 1) { // Master Admin
        statusQuery = `SELECT user_status_id FROM master_admin WHERE user_id = $1`;
      } else { // Staff (Teachers, etc.)
        statusQuery = `SELECT user_status_id FROM staff WHERE user_id = $1`;
      }

      if (statusQuery) {
        const statusRes = await pool.query(statusQuery, [user.user_id]);
        if (statusRes.rows.length > 0) {
          statusId = statusRes.rows[0].user_status_id;
        }
      }
    } catch (err) {
      console.error("Status check error:", err);
    }

    // Block if status is restricted (Allowed: 1:Active, 7:On Leave, 8:Probation)
    const allowedStatuses = [1, 7, 8];
    if (!allowedStatuses.includes(statusId)) {
      const statusNames = {
        2: "Inactive", 3: "Suspended", 4: "Rusticated", 5: "Alumni", 
        6: "Transferred", 9: "Resigned", 10: "Terminated", 11: "Retired", 
        12: "Banned", 13: "Pending Approval"
      };
      return res.status(403).json({
        success: false,
        message: `Account status is '${statusNames[statusId] || "Restricted"}'. Access denied.`,
      });
    }

    const accessToken = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        institute_id: user.institute_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    let studentDetails = null;
    if (Number(user.role_id) === 18) {
      studentDetails = await StudentModel.findByUserId(user.user_id);
    }

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      role_id: user.role_id,
      email: user.email,
      name: user.user_name,
      student_details: studentDetails
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   REFRESH TOKEN
========================= */
export const refreshToken = (req, res) => {
  try {
    const { refreshToken } = req.body;
    console.log("🔄 API: refreshToken called", refreshToken ? "Token received" : "No token");

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      try {
        // 🔍 Fetch user's current role and institute to ensure token is complete
        const userRes = await pool.query(
          'SELECT role_id, institute_id FROM "user" WHERE user_id = $1',
          [decoded.user_id]
        );

        if (userRes.rows.length === 0) {
          return res.status(401).json({ success: false, message: "User not found" });
        }

        const { role_id, institute_id } = userRes.rows[0];

        const newAccessToken = jwt.sign(
          { 
            user_id: decoded.user_id,
            role_id: Number(role_id),
            institute_id: institute_id
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        return res.json({
          success: true,
          accessToken: newAccessToken,
        });
      } catch (dbError) {
        console.error("❌ Refresh token DB error:", dbError);
        return res.status(500).json({
          success: false,
          message: "Database connection error during token refresh",
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET PROFILE
========================= */
export const getProfile = async (req, res) => {
  try {
    const { user_id, role_id } = req.user;

    // 1. Always fetch base user info first
    const userResult = await pool.query(
      `SELECT user_name, email, phone, is_active, email_verified, phone_verified, institute_id FROM "user" WHERE user_id = $1`, 
      [user_id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const u = userResult.rows[0];

    let profile = {
      name: u.user_name || u.email.split("@")[0],
      email: u.email,
      phone: u.phone || "",
      address: "",
      profile_url: null,
      role_id: Number(role_id),
      is_active: u.is_active,
      email_verified: u.email_verified,
      phone_verified: u.phone_verified,
      institute_id: u.institute_id
    };

    // 2. Fetch detailed info based on role
    const userEmail = u.email;

    if (role_id === 18) { // STUDENT
      const studentResult = await pool.query(
        `SELECT stu_first_name, stu_last_name, email, profile_url, address FROM student WHERE student_user_id = $1 OR LOWER(email) = LOWER($2)`,
        [user_id, userEmail]
      );
      if (studentResult.rows.length > 0) {
        const s = studentResult.rows[0];
        profile.name = `${s.stu_first_name || ""} ${s.stu_last_name || ""}`.trim() || profile.name;
        profile.email = s.email;
        profile.profile_url = s.profile_url;
        profile.address = s.address;
      }
    } else if (role_id === 20) { // GUARDIAN
      const guardianResult = await pool.query(
        `SELECT grdn_first_name, grdn_last_name, email, address, phone, profile_url FROM guardian WHERE guardian_user_id = $1 OR LOWER(email) = LOWER($2)`,
        [user_id, userEmail]
      );
      if (guardianResult.rows.length > 0) {
        const g = guardianResult.rows[0];
        profile.name = `${g.grdn_first_name || ""} ${g.grdn_last_name || ""}`.trim() || profile.name;
        profile.email = g.email;
        profile.address = g.address;
        profile.phone = g.phone || profile.phone;
        if (g.profile_url) profile.profile_url = g.profile_url;
      }
    } else if (role_id === 2) { // INSTITUTE_ADMIN
      const adminResult = await pool.query(
        `SELECT admin_first_name, admin_last_name, email, contact, profile_url FROM admin WHERE user_id = $1 OR LOWER(email) = LOWER($2)`,
        [user_id, userEmail]
      );
      if (adminResult.rows.length > 0) {
        const a = adminResult.rows[0];
        profile.name = `${a.admin_first_name || ""} ${a.admin_last_name || ""}`.trim() || profile.name;
        profile.email = a.email;
        profile.phone = a.contact || profile.phone;
        profile.profile_url = a.profile_url;
      }
    } else if (role_id === 1) { // MASTER_ADMIN
      const mAdminResult = await pool.query(
        `SELECT m_admin_first_name, m_admin_last_name, email, phone, profile_url FROM master_admin WHERE user_id = $1 OR LOWER(email) = LOWER($2)`,
        [user_id, userEmail]
      );
      if (mAdminResult.rows.length > 0) {
        const m = mAdminResult.rows[0];
        profile.name = `${m.m_admin_first_name || ""} ${m.m_admin_last_name || ""}`.trim() || profile.name;
        profile.email = m.email;
        profile.phone = m.phone || profile.phone;
        profile.profile_url = m.profile_url;
      }
    } else {
      // Default Staff lookup
      const staffResult = await pool.query(
        `SELECT 
          s.staff_id,
          s.staff_first_name, 
          s.staff_last_name, 
          s.email, 
          s.profile_url, 
          s.contact,
          s.qualification,
          s.subject_id,
          sub.subject_name,
          s.bg_id,
          bg.blood_group as blood_group_name,
          s.user_status_id,
          ust.status_name as status_name
        FROM staff s
        LEFT JOIN subject sub ON s.subject_id = sub.subject_id
        LEFT JOIN blood_group bg ON s.bg_id = bg.bg_id
        LEFT JOIN user_status ust ON s.user_status_id = ust.user_status_id
        WHERE s.user_id = $1 OR LOWER(s.email) = LOWER($2)`,
        [user_id, userEmail]
      );
      if (staffResult.rows.length > 0) {
        const s = staffResult.rows[0];
        profile.staff_id = s.staff_id;
        profile.name = `${s.staff_first_name || ""} ${s.staff_last_name || ""}`.trim() || profile.name;
        profile.email = s.email;
        profile.profile_url = s.profile_url;
        profile.phone = s.contact || profile.phone;
        // Staff specific fields
        profile.qualification = s.qualification || "";
        profile.subject_id = s.subject_id;
        profile.subject_name = s.subject_name || "";
        profile.bg_id = s.bg_id;
        profile.blood_group_name = s.blood_group_name || "";
        profile.user_status_id = s.user_status_id;
        profile.status_name = s.status_name || "Active";

        // Auto-Revert Logic: If status is 'On Leave' but no current leaves exist, set back to 'Active'
        if (profile.user_status_id === 7) {
          const leaveCheck = await pool.query(
            `SELECT 1 FROM leave_applications 
             WHERE teacher_id = $1 AND status = 'approved' 
             AND CURRENT_DATE BETWEEN from_date AND to_date`,
            [s.staff_id]
          );
          if (leaveCheck.rows.length === 0) {
             console.log(`Auto-Reverting staff_id ${s.staff_id} to Active status.`);
             await pool.query(`UPDATE staff SET user_status_id = 1 WHERE staff_id = $1`, [s.staff_id]);
             profile.user_status_id = 1;
             profile.status_name = 'Active';
          }
        }
      }
    }

    // 3. Fallback for Location (Address) - If empty, get from Institute
    if (!profile.address && profile.institute_id) {
      const instResult = await pool.query(`SELECT address FROM institute WHERE institute_id = $1`, [profile.institute_id]);
      if (instResult.rows.length > 0) {
        profile.address = instResult.rows[0].address;
      }
    }

    return res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error("❌ GET PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   UPDATE PROFILE
========================= */
export const updateProfile = async (req, res) => {
  try {
    const { user_id } = req.user;
    const role_id = Number(req.user.role_id);
    const { firstName, lastName, phone, address, profileUrl, qualification, subject_id, bg_id } = req.body;

    // 🛑 RESTRICTION: Students cannot update personal profile info
    if (role_id === 18) {
      return res.status(403).json({ 
        success: false, 
        message: "Students are not authorized to update personal information manually. Please contact administration." 
      });
    }

    console.log("DEBUG: Update Profile Request:", { user_id, role_id, body: req.body });

    // 1. Update user table (phone, user_name for search/consistency)
    let userUpdates = [];
    let userValues = [];
    if (phone) {
      userUpdates.push(`phone = $${userUpdates.length + 1}`);
      userValues.push(phone);
    }
    if (firstName || lastName) {
      const fullName = `${firstName || ""} ${lastName || ""}`.trim();
      userUpdates.push(`user_name = $${userUpdates.length + 1}`);
      userValues.push(fullName);
    }

    if (userUpdates.length > 0) {
      userValues.push(user_id);
      await pool.query(
        `UPDATE "user" SET ${userUpdates.join(", ")} WHERE user_id = $${userValues.length}`, 
        userValues
      );
    }

    // 2. Update role-specific table
    // We use user_id primarily, but emails in some tables might need sync if changed (not implementing email change yet)
    if (role_id === 18) { // STUDENT
      await pool.query(
        `UPDATE student SET stu_first_name = $1, stu_last_name = $2, address = $3, profile_url = $4 WHERE student_user_id = $5`,
        [firstName, lastName, address, profileUrl, user_id]
      );
    } else if (role_id === 20) { // GUARDIAN
      await pool.query(
        `UPDATE guardian 
         SET grdn_first_name = $1, 
             grdn_last_name = $2, 
             address = $3, 
             phone = $4,
             profile_url = $5
         WHERE guardian_user_id = $6`,
        [firstName, lastName, address, phone, profileUrl, user_id]
      );
    } else if (role_id === 2) { // INSTITUTE_ADMIN
      await pool.query(
        `UPDATE admin 
         SET admin_first_name = $1, 
             admin_last_name = $2, 
             contact = $3,
             profile_url = $4
         WHERE user_id = $5`,
        [firstName, lastName, phone, profileUrl, user_id]
      );
    } else if (role_id === 1) { // MASTER_ADMIN
      await pool.query(
        `UPDATE master_admin 
         SET m_admin_first_name = $1, 
             m_admin_last_name = $2, 
             phone = $3,
             profile_url = $4
         WHERE user_id = $5`,
        [firstName, lastName, phone, profileUrl, user_id]
      );
    } else {
      // Default Staff lookup
      await pool.query(
        `UPDATE staff 
         SET staff_first_name = $1, 
             staff_last_name = $2, 
             contact = $3, 
             profile_url = $4,
             qualification = $5,
             subject_id = $6,
             bg_id = $7
         WHERE user_id = $8`,
        [firstName, lastName, phone, profileUrl, qualification, subject_id, bg_id, user_id]
      );
    }

    return res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("❌ UPDATE PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   CHANGE PASSWORD
========================= */
export const changePassword = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { currentPassword, newPassword } = req.body;

    const userRes = await pool.query(`SELECT password_hash FROM "user" WHERE user_id = $1`, [user_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query(`UPDATE "user" SET password_hash = $1 WHERE user_id = $2`, [newHash, user_id]);

    return res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("❌ CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   UPLOAD AVATAR
========================= */
export const uploadAvatar = async (req, res) => {
  try {
    const { user_id } = req.user;
    const role_id = Number(req.user.role_id);
    
    // 🛑 RESTRICTION: Students cannot update profile photo
    if (role_id === 18) {
      return res.status(403).json({ 
        success: false, 
        message: "Students are not authorized to change profile photos. Please contact administration." 
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const imageUrl = req.file.path; // Cloudinary URL

    // No profile_url column in 'user' table

    console.log(`DEBUG: uploadAvatar for user_id=${user_id}, role_id=${role_id}, imageUrl=${imageUrl}`);

    // Update role-specific table
    let updateRes;
    if (role_id === 20) { // GUARDIAN
      updateRes = await pool.query(`UPDATE guardian SET profile_url = $1 WHERE guardian_user_id = $2`, [imageUrl, user_id]);
    } else if (role_id === 2) { // INSTITUTE_ADMIN
      updateRes = await pool.query(`UPDATE admin SET profile_url = $1 WHERE user_id = $2`, [imageUrl, user_id]);
    } else if (role_id === 1) { // MASTER_ADMIN
      updateRes = await pool.query(`UPDATE master_admin SET profile_url = $1 WHERE user_id = $2`, [imageUrl, user_id]);
    } else {
      // Default Staff lookup
      updateRes = await pool.query(`UPDATE staff SET profile_url = $1 WHERE user_id = $2`, [imageUrl, user_id]);
    }

    console.log("DEBUG: Update rowCount:", updateRes.rowCount);

    if (updateRes.rowCount === 0) {
      console.error(`ERROR: No row updated for user_id=${user_id} in role table. Trying fallback by email...`);
      const userEmailRes = await pool.query('SELECT email FROM "user" WHERE user_id = $1', [user_id]);
      if (userEmailRes.rows.length > 0) {
        const userEmail = userEmailRes.rows[0].email;
        if (role_id === 1) {
          await pool.query(`UPDATE master_admin SET profile_url = $1 WHERE LOWER(email) = LOWER($2)`, [imageUrl, userEmail]);
        } else if (role_id === 2) {
          await pool.query(`UPDATE admin SET profile_url = $1 WHERE LOWER(email) = LOWER($2)`, [imageUrl, userEmail]);
        }
      }
    }

    return res.json({
      success: true,
      message: "Profile photo updated successfully",
      profile_url: imageUrl
    });
  } catch (error) {
    console.error("❌ UPLOAD AVATAR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   INVITE USER (Admin/Teacher/Staff)
========================= */
export const inviteUser = async (req, res) => {
  try {
    const { name, email, phone, role_code, designation } = req.body;
    const inviter_id = req.user.user_id;
    const inviter_role = Number(req.user.role_id);

    if (!name || !email || !role_code) {
      return res.status(400).json({ success: false, message: "Name, email, and role are required" });
    }

    // 1. RBAC Check
    // Master Admin (1) can create Institute Admin
    // Institute Admin (2) can create Teachers, Staff, Students
    if (inviter_role === 1 && role_code !== "INSTITUTE_ADMIN") {
      return res.status(403).json({ success: false, message: "Master Admin can only invite Institute Admins" });
    }
    if (inviter_role === 2 && !["TEACHER", "OFFICE_STAFF", "STUDENT"].includes(role_code)) {
      return res.status(403).json({ success: false, message: "Admins can only invite Teachers, Staff, and Students" });
    }

    // 2. Check if user already exists
    const existing = await pool.query('SELECT user_id FROM "user" WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    // 3. Get Role ID
    const roleRes = await pool.query("SELECT role_id FROM user_role WHERE role_code = $1", [role_code]);
    if (roleRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid role code" });
    }
    const role_id = roleRes.rows[0].role_id;

    // 4. Generate Token
    const invite_token = crypto.randomBytes(32).toString("hex");
    const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 5. Create User Record
    const userRes = await pool.query(
      `INSERT INTO "user" (
        user_name, email, phone, role_id, 
        institute_id, status, is_active,
        invite_token, invite_token_expiry, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING user_id`,
      [
        name, email, phone || null, role_id, 
        req.user.institute_id, "pending", false,
        invite_token, invite_token_expiry, inviter_id
      ]
    );

    const userId = userRes.rows[0].user_id;

    // 6. Create Role-Specific Record (Staff/Admin/Student)
    // For now we assume they go into their respective tables
    if (role_code === "INSTITUTE_ADMIN") {
      await pool.query(
        `INSERT INTO admin (user_id, admin_first_name, email, contact, user_status_id) VALUES ($1, $2, $3, $4, 13)`,
        [userId, name, email, phone || "", 13] // 13 = Pending Approval
      );
    } else if (role_code === "TEACHER" || role_code === "OFFICE_STAFF") {
      await pool.query(
        `INSERT INTO staff (user_id, staff_first_name, email, contact, designation, user_status_id) VALUES ($1, $2, $3, $4, $5, 13)`,
        [userId, name, email, phone || "", designation || role_code, 13]
      );
    } else if (role_code === "STUDENT") {
      await pool.query(
        `INSERT INTO student (student_user_id, stu_first_name, email, user_status_id) VALUES ($1, $2, $3, 13)`,
        [userId, name, email, 13]
      );
    }

    // 7. Send Invitation Email
    await emailService.sendInvitation({
      to: email,
      name: name,
      role: role_code.replace("_", " "),
      token: invite_token,
    });

    return res.json({
      success: true,
      message: `Invitation sent successfully to ${email}`,
    });
  } catch (error) {
    console.error("❌ INVITE USER ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   RESEND INVITATION
========================= */
export const resendInvitation = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const userRes = await pool.query(
      'SELECT user_id, user_name, role_id, status FROM "user" WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = userRes.rows[0];
    if (user.status !== "pending") {
      return res.status(400).json({ success: false, message: "User is already active or deactivated" });
    }

    // Generate new token
    const invite_token = crypto.randomBytes(32).toString("hex");
    const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE "user" SET invite_token = $1, invite_token_expiry = $2 WHERE user_id = $3',
      [invite_token, invite_token_expiry, user.user_id]
    );

    // Get Role Code for email
    const roleRes = await pool.query("SELECT role_code FROM user_role WHERE role_id = $1", [user.role_id]);
    const role_code = roleRes.rows[0].role_code;

    await emailService.sendInvitation({
      to: email,
      name: user.user_name,
      role: role_code.replace("_", " "),
      token: invite_token,
    });

    return res.json({ success: true, message: "Invitation resent successfully" });
  } catch (error) {
    console.error("❌ RESEND INVITATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   VERIFY INVITE TOKEN
========================= */
export const verifyInviteToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: "Token required" });

    const userRes = await pool.query(
      'SELECT user_id, user_name, invite_token_expiry FROM "user" WHERE invite_token = $1',
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "This invitation link is invalid. Please contact your administrator." });
    }

    const user = userRes.rows[0];
    if (new Date() > new Date(user.invite_token_expiry)) {
      return res.status(400).json({ success: false, message: "This invitation link has expired. Please contact your administrator." });
    }

    return res.json({ success: true, name: user.user_name });
  } catch (error) {
    console.error("❌ VERIFY TOKEN ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   SET PASSWORD
========================= */
export const setPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required" });
    }

    const userRes = await pool.query(
      'SELECT user_id, user_name, email, invite_token_expiry FROM "user" WHERE invite_token = $1',
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid or expired token" });
    }

    const user = userRes.rows[0];
    if (new Date() > new Date(user.invite_token_expiry)) {
      return res.status(400).json({ success: false, message: "Token has expired" });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      'UPDATE "user" SET password_hash = $1, status = $2, is_active = $3, invite_token = NULL, invite_token_expiry = NULL WHERE user_id = $4',
      [hashedPassword, "active", true, user.user_id]
    );

    // Update role-specific status if needed (Active = 1)
    await pool.query('UPDATE admin SET user_status_id = 1 WHERE user_id = $1', [user.user_id]);
    await pool.query('UPDATE staff SET user_status_id = 1 WHERE user_id = $1', [user.user_id]);
    await pool.query('UPDATE student SET user_status_id = 1 WHERE student_user_id = $1', [user.user_id]);

    // Send confirmation email
    await emailService.sendPasswordChangedConfirmation({
      to: user.email,
      name: user.user_name,
    });

    return res.json({ success: true, message: "Password set successfully. You can now login." });
  } catch (error) {
    console.error("❌ SET PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   FORGOT PASSWORD
========================= */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Success response for security even if email doesn't exist
    const successMsg = "If this email exists, a reset link has been sent.";

    const userRes = await pool.query(
      'SELECT user_id, user_name FROM "user" WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.json({ success: true, message: successMsg });
    }

    const user = userRes.rows[0];
    const reset_token = crypto.randomBytes(32).toString("hex");
    const reset_token_expiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE "user" SET reset_token = $1, reset_token_expiry = $2 WHERE user_id = $3',
      [reset_token, reset_token_expiry, user.user_id]
    );

    await emailService.sendForgotPassword({
      to: email,
      name: user.user_name,
      token: reset_token,
    });

    return res.json({ success: true, message: successMsg });
  } catch (error) {
    console.error("❌ FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   RESET PASSWORD
========================= */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required" });
    }

    const userRes = await pool.query(
      'SELECT user_id, user_name, email, reset_token_expiry FROM "user" WHERE reset_token = $1',
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid or expired token" });
    }

    const user = userRes.rows[0];
    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ success: false, message: "Token has expired" });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      'UPDATE "user" SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = $2',
      [hashedPassword, user.user_id]
    );

    // Send confirmation
    await emailService.sendPasswordChangedConfirmation({
      to: user.email,
      name: user.user_name,
    });

    return res.json({ success: true, message: "Password reset successfully. You can now login." });
  } catch (error) {
    console.error("❌ RESET PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   GET USERS (For Management)
========================= */
export const getUsers = async (req, res) => {
  try {
    const { role_code } = req.query;
    const inviter_role = Number(req.user.role_id);

    let query = `
      SELECT 
        u.user_id, u.user_name, u.email, u.phone, u.status, u.is_active, 
        u.invite_token, u.invite_token_expiry, r.role_name, r.role_code
      FROM "user" u
      JOIN user_role r ON u.role_id = r.role_id
      WHERE u.institute_id = $1
    `;
    const params = [req.user.institute_id];

    if (role_code) {
      query += " AND r.role_code = $2";
      params.push(role_code);
    }

    // RBAC: Master Admin can see everyone. Admin can see Staff/Students.
    if (inviter_role === 2) {
      query += " AND r.role_code NOT IN ('MASTER_ADMIN', 'INSTITUTE_ADMIN')";
    }

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("❌ GET USERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   UPDATE USER STATUS (Deactivate/Delete)
========================= */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, is_active } = req.body;

    await pool.query(
      'UPDATE "user" SET status = COALESCE($1, status), is_active = COALESCE($2, is_active) WHERE user_id = $3',
      [status, is_active, id]
    );

    return res.json({ success: true, message: "User status updated" });
  } catch (error) {
    console.error("❌ UPDATE STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft delete or hard delete based on requirements. 
    // Usually we just deactivate, but the user asked for "Delete".
    // I'll implement soft delete by setting status to 'deactivated' and is_active to false.

    await pool.query('UPDATE "user" SET status = $1, is_active = $2 WHERE user_id = $3', ['deactivated', false, id]);
    
    return res.json({ success: true, message: "User deleted (deactivated)" });
  } catch (error) {
    console.error("❌ DELETE USER ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



