import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import crypto from "crypto";
import { emailService } from "../services/email_service.js";

import { StudentModel } from "../models/student_Model.js";

const getFrontendUrl = (req) => {
  if (req.headers.origin) return req.headers.origin;
  if (req.headers.referer) {
    try {
      return new URL(req.headers.referer).origin;
    } catch (e) {}
  }
  return null;
};

/* =========================
   LOGIN CONTROLLER
========================= */
export const login = async (req, res) => {
  console.log(`🔑 Login attempt for: ${req.body.email}`);
  try {
    const { password } = req.body;
    const email = req.body.email ? req.body.email.trim() : "";
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
      console.log(`❌ Login Failed: User not found for email ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    const user = result.rows[0];

    // Check status
    if (user.status === "pending") {
      console.log(`❌ Login Failed: Status is pending for user ${email}`);
      return res.status(403).json({
        success: false,
        message: "Your invitation is pending. Please set your password using the link sent to your email.",
      });
    }
    if (user.status === "deactivated" || !user.is_active) {
      console.log(`❌ Login Failed: Status deactivated (${user.status}, is_active: ${user.is_active}) for user ${email}`);
      return res.status(403).json({
        success: false,
        deactivated: true,
        message: "Your account is deactivated!",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log(`❌ Login Failed: Password mismatch for user ${email}`);
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
      console.log(`❌ Login Failed: Restricted status ${statusId} for user ${email}`);
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
        // 🔍 Fetch user's current role, institute, status, and is_active to ensure token is complete
        const userRes = await pool.query(
          'SELECT role_id, institute_id, status, is_active FROM "user" WHERE user_id = $1',
          [decoded.user_id]
        );

        if (userRes.rows.length === 0) {
          return res.status(401).json({ success: false, message: "User not found" });
        }

        const { role_id, institute_id, status, is_active } = userRes.rows[0];

        if (status === "deactivated" || !is_active) {
          return res.status(401).json({
            success: false,
            deactivated: true,
            message: "Your account is deactivated!",
          });
        }

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
        `SELECT 
          s.student_id,
          s.stu_first_name, 
          s.stu_last_name, 
          s.email, 
          s.profile_url, 
          s.address, 
          s.bg_id, 
          bg.blood_group as blood_group_name,
          c.class_name,
          sec.section_name,
          ce.class_id
         FROM student s
         LEFT JOIN blood_group bg ON s.bg_id = bg.bg_id
         LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
         LEFT JOIN class c ON c.class_id = ce.class_id
         LEFT JOIN section sec ON sec.section_id = c.section_id
         WHERE s.student_user_id = $1 AND s.is_deleted = FALSE`,
        [user_id]
      );
      if (studentResult.rows.length > 0) {
        const s = studentResult.rows[0];
        profile.name = `${s.stu_first_name || ""} ${s.stu_last_name || ""}`.trim() || profile.name;
        profile.email = s.email;
        profile.profile_url = s.profile_url;
        profile.photo = s.profile_url || "/avatars/default.png";
        profile.address = s.address;
        profile.bg_id = s.bg_id;
        profile.blood_group_name = s.blood_group_name || "";
        profile.class = s.class_name || "";
        profile.section = s.section_name || "";
        
        let rollNo = "N/A";
        if (s.class_id) {
          const rollRes = await pool.query(
            `WITH enrolled_students AS (
              SELECT 
                st.student_id,
                ROW_NUMBER() OVER (ORDER BY st.stu_first_name, st.stu_last_name) as roll_number
              FROM student st
              JOIN class_enrollment ce ON ce.student_id = st.student_id AND ce.status_id = 1
              WHERE ce.class_id = $1 AND st.is_deleted = FALSE
            )
            SELECT roll_number FROM enrolled_students WHERE student_id = $2`,
            [s.class_id, s.student_id]
          );
          if (rollRes.rows.length > 0) {
            rollNo = String(rollRes.rows[0].roll_number);
          }
        }
        profile.rollNo = rollNo;
      }
    } else if (role_id === 20) { // GUARDIAN
      const guardianResult = await pool.query(
        `SELECT g.grdn_first_name, g.grdn_last_name, g.email, g.address, g.phone, g.profile_url, g.bg_id, bg.blood_group as blood_group_name 
         FROM guardian g
         LEFT JOIN blood_group bg ON g.bg_id = bg.bg_id
         WHERE g.guardian_user_id = $1`,
        [user_id]
      );
      if (guardianResult.rows.length > 0) {
        const g = guardianResult.rows[0];
        profile.name = `${g.grdn_first_name || ""} ${g.grdn_last_name || ""}`.trim() || profile.name;
        profile.email = g.email;
        profile.address = g.address;
        profile.phone = g.phone || profile.phone;
        profile.bg_id = g.bg_id;
        profile.blood_group_name = g.blood_group_name || "";
        if (g.profile_url) profile.profile_url = g.profile_url;
      }
    } else if (role_id === 2) { // INSTITUTE_ADMIN
      const adminResult = await pool.query(
        `SELECT a.admin_first_name, a.admin_last_name, a.email, a.contact, a.profile_url, a.bg_id, bg.blood_group as blood_group_name 
         FROM admin a
         LEFT JOIN blood_group bg ON a.bg_id = bg.bg_id
         WHERE a.user_id = $1`,
        [user_id]
      );
      if (adminResult.rows.length > 0) {
        const a = adminResult.rows[0];
        profile.name = `${a.admin_first_name || ""} ${a.admin_last_name || ""}`.trim() || profile.name;
        profile.email = a.email;
        profile.phone = a.contact || profile.phone;
        profile.profile_url = a.profile_url;
        profile.bg_id = a.bg_id;
        profile.blood_group_name = a.blood_group_name || "";
      }
    } else if (role_id === 1) { // MASTER_ADMIN
      const mAdminResult = await pool.query(
        `SELECT m.m_admin_first_name, m.m_admin_last_name, m.email, m.phone, m.profile_url, m.bg_id, bg.blood_group as blood_group_name 
         FROM master_admin m
         LEFT JOIN blood_group bg ON m.bg_id = bg.bg_id
         WHERE m.user_id = $1`,
        [user_id]
      );
      if (mAdminResult.rows.length > 0) {
        const m = mAdminResult.rows[0];
        profile.name = `${m.m_admin_first_name || ""} ${m.m_admin_last_name || ""}`.trim() || profile.name;
        profile.email = m.email;
        profile.phone = m.phone || profile.phone;
        profile.profile_url = m.profile_url;
        profile.bg_id = m.bg_id;
        profile.blood_group_name = m.blood_group_name || "";
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
          ust.status_name as status_name,
          c.class_id as assigned_class_id
        FROM staff s
        LEFT JOIN subject sub ON s.subject_id = sub.subject_id
        LEFT JOIN blood_group bg ON s.bg_id = bg.bg_id
        LEFT JOIN user_status ust ON s.user_status_id = ust.user_status_id
        LEFT JOIN class c ON c.staff_id = s.staff_id
        WHERE s.user_id = $1`,
        [user_id]
      );
      if (staffResult.rows.length > 0) {
        const s = staffResult.rows[0];
        profile.staff_id = s.staff_id;
        profile.assigned_class_id = s.assigned_class_id;
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

        // Dynamic "On Leave" Logic: Dynamically check if today is within an approved leave period
        const leaveCheck = await pool.query(
          `SELECT 1 FROM leave_applications 
           WHERE teacher_id = $1 AND status = 'approved' 
           AND CURRENT_DATE BETWEEN from_date::date AND to_date::date`,
          [s.staff_id]
        );
        
        if (leaveCheck.rows.length > 0) {
           if (profile.user_status_id !== 7) {
              await pool.query(`UPDATE staff SET user_status_id = 7 WHERE staff_id = $1`, [s.staff_id]);
              profile.user_status_id = 7;
           }
           profile.status_name = 'On Leave';
        } else if (profile.user_status_id === 7) {
           console.log(`Auto-Reverting staff_id ${s.staff_id} to Active status as leave period ended.`);
           await pool.query(`UPDATE staff SET user_status_id = 1 WHERE staff_id = $1`, [s.staff_id]);
           profile.user_status_id = 1;
           profile.status_name = 'Active';
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
    if (role_id === 18) { // STUDENT
      await pool.query(
        `UPDATE student SET stu_first_name = $1, stu_last_name = $2, address = $3, profile_url = $4, bg_id = $5 WHERE student_user_id = $6`,
        [firstName, lastName, address, profileUrl, bg_id, user_id]
      );
    } else if (role_id === 20) { // GUARDIAN
      await pool.query(
        `UPDATE guardian 
         SET grdn_first_name = $1, 
             grdn_last_name = $2, 
             address = $3, 
             phone = $4,
             profile_url = $5,
             bg_id = $6
         WHERE guardian_user_id = $7`,
        [firstName, lastName, address, phone, profileUrl, bg_id, user_id]
      );
    } else if (role_id === 2) { // INSTITUTE_ADMIN
      await pool.query(
        `UPDATE admin 
         SET admin_first_name = $1, 
             admin_last_name = $2, 
             contact = $3,
             profile_url = $4,
             bg_id = $5
         WHERE user_id = $6`,
        [firstName, lastName, phone, profileUrl, bg_id, user_id]
      );
    } else if (role_id === 1) { // MASTER_ADMIN
      await pool.query(
        `UPDATE master_admin 
         SET m_admin_first_name = $1, 
             m_admin_last_name = $2, 
             phone = $3,
             profile_url = $4,
             bg_id = $5
         WHERE user_id = $6`,
        [firstName, lastName, phone, profileUrl, bg_id, user_id]
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
  const client = await pool.connect();
  try {
    const { name, phone, role_code, designation } = req.body;
    const email = req.body.email ? req.body.email.trim() : "";
    const inviter_id = req.user.user_id;
    const inviter_role = Number(req.user.role_id);
    const institute_id = req.instituteId || req.user.institute_id;

    if (!name || !email || !role_code) {
      return res.status(400).json({ success: false, message: "Name, email, and role are required" });
    }

    // 1. RBAC Check
    // Master Admin (1) can invite anyone.
    // Institute Admin (2) can invite anyone except Master Admin.
    if (inviter_role === 2 && role_code === "MASTER_ADMIN") {
      return res.status(403).json({ success: false, message: "Admins are not authorized to invite a Master Admin." });
    }
    
    if (inviter_role === 2 && !["TEACHER", "OFFICE_STAFF", "STUDENT", "PRINCIPAL", "VICE_PRINCIPAL", "CASHIER", "ACCOUNTANT", "ADMISSION_OFFICER", "MANAGEMENT_MEMBER", "HR_MANAGER", "IT_SUPPORT", "LIBRARIAN", "LAB_ASSISTANT", "SPORTS_MANAGER", "COUNSELLOR", "LIBRARY_ASSISTANT", "INSTITUTE_ADMIN"].includes(role_code)) {
      return res.status(403).json({ success: false, message: "Admins are not authorized to invite this role type." });
    }

    // 2. Lookup role_id
    const roleRes = await client.query("SELECT role_id FROM user_role WHERE role_code = $1", [role_code]);
    if (roleRes.rows.length === 0) {
      throw Object.assign(new Error("Invalid role code"), { status: 400 });
    }
    const role_id = roleRes.rows[0].role_id;

    await client.query("BEGIN");

    // 3. Check if user already exists
    const userCheck = await client.query('SELECT user_id, status FROM "user" WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    
    let userId;
    let invite_token = null;
    let isNewUser = false;

    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].user_id;
      
      // ── Check for Role-Specific Duplication ──
      if (role_code === "INSTITUTE_ADMIN") {
        const adminCheck = await client.query('SELECT admin_id FROM admin WHERE user_id = $1 LIMIT 1', [userId]);
        if (adminCheck.rows.length > 0) {
          throw Object.assign(new Error(`A user with the email ${email} is already an Admin in the system.`), { status: 409 });
        }
      } else if (role_code === "TEACHER" || role_code === "OFFICE_STAFF") {
        const staffCheck = await client.query('SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1', [userId]);
        if (staffCheck.rows.length > 0) {
          throw Object.assign(new Error(`A user with the email ${email} is already a Faculty or Staff member.`), { status: 409 });
        }
      } else if (role_code === "STUDENT") {
        const studentCheck = await client.query('SELECT student_id FROM student WHERE student_user_id = $1 LIMIT 1', [userId]);
        if (studentCheck.rows.length > 0) {
          throw Object.assign(new Error(`A user with the email ${email} is already registered as a Student.`), { status: 409 });
        }
      }
    } else {
      // 4. New User Account
      invite_token = crypto.randomBytes(32).toString("hex");
      const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const userRes = await client.query(
        `INSERT INTO "user" (
          user_name, email, phone, role_id, 
          institute_id, status, is_active,
          invite_token, invite_token_expiry, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING user_id`,
        [
          name, email, phone || null, role_id, 
          institute_id, "pending", false,
          invite_token, invite_token_expiry, inviter_id
        ]
      );
      userId = userRes.rows[0].user_id;
      isNewUser = true;
    }

    // 4. Create Role-Specific Record
    if (role_code === "INSTITUTE_ADMIN") {
      await client.query(
        `INSERT INTO admin (user_id, admin_first_name, email, contact, user_status_id) VALUES ($1, $2, $3, $4, $5)`,
        [userId, name, email, phone || "", 13]
      );
    } else if (role_code === "TEACHER" || role_code === "OFFICE_STAFF") {
      await client.query(
        `INSERT INTO staff (user_id, staff_first_name, email, contact, role_id, title, user_status_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, name, email, phone || "", role_code === "TEACHER" ? 3 : 12, designation || role_code, 13]
      );
    } else if (role_code === "STUDENT") {
      await client.query(
        `INSERT INTO student (student_user_id, stu_first_name, email, user_status_id) VALUES ($1, $2, $3, $4)`,
        [userId, name, email, 13]
      );
    } else {
      // Fallback for all other Staff/Admin roles
      await client.query(
        `INSERT INTO staff (user_id, staff_first_name, email, contact, role_id, title, user_status_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, name, email, phone || "", roleRes.rows[0].role_id, designation || role_code, 13]
      );
    }

    await client.query("COMMIT");

    // 5. Send Invitation Email (non-blocking)
    let emailSent = false;
    let emailError = null;

    // We only send invitation if it's a new user OR if they were already pending (re-invite)
    const isPending = isNewUser || (userCheck.rows[0]?.status === "pending");
    
    // If user already exists and is active, we don't need a token, they can just login
    // BUT usually the admin wants to notify them. For now, let's follow the token flow if pending.
    if (isPending) {
      // If they were already pending, we need a token. If we didn't generate one above (reuse case), generate it now.
      if (!invite_token) {
        invite_token = crypto.randomBytes(32).toString("hex");
        const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await pool.query('UPDATE "user" SET invite_token = $1, invite_token_expiry = $2 WHERE user_id = $3', [invite_token, invite_token_expiry, userId]);
      }

      try {
        await emailService.sendInvitation({
          to: email,
          name: name,
          role: role_code.replace(/_/g, " "),
          token: invite_token,
          instituteId: req.instituteId,
          frontendUrl: getFrontendUrl(req),
        });
        emailSent = true;
      } catch (emailErr) {
        emailError = emailErr.message;
        console.error("❌ Invitation email failed:", emailErr.message);
      }
    }

    return res.json({
      success: true,
      message: emailSent
        ? `Invitation sent successfully to ${email}`
        : isNewUser
          ? `User created but email delivery failed. Error: ${emailError}`
          : `User was already in the system. They have been added to ${role_code} and can log in with their existing credentials.`,
      email_sent: emailSent,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ INVITE USER ERROR:", error);
    return res.status(error.status || 500).json({ 
      success: false, 
      message: error.message || "Server error" 
    });
  } finally {
    client.release();
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

    let emailSent = false;
    let emailError = null;
    try {
      await emailService.sendInvitation({
        to: email,
        name: user.user_name,
        role: role_code.replace("_", " "),
        token: invite_token,
        instituteId: req.instituteId,
        frontendUrl: getFrontendUrl(req),
      });
      emailSent = true;
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error("❌ Failed to send resend invitation email:", emailErr.message);
    }

    return res.json({ 
      success: true, 
      message: emailSent
        ? "Invitation resent successfully" 
        : `Invitation token regenerated, but email delivery failed. Error: ${emailError}`
    });
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
    const cleanToken = token.trim();

    const userRes = await pool.query(
      'SELECT user_id, user_name, email, invite_token_expiry FROM "user" WHERE invite_token = $1',
      [cleanToken]
    );

    if (userRes.rows.length === 0) {
      // Check if it was already used
      const usedRes = await pool.query('SELECT 1 FROM used_tokens WHERE token = $1 AND token_type = \'invite\'', [cleanToken]);
      if (usedRes.rows.length > 0) {
        return res.json({ success: false, message: "You have already set your password using this link. Please log in.", isExpired: false });
      }
      return res.json({ success: false, message: "This invitation link is invalid. Please contact your administrator.", isExpired: false });
    }

    const user = userRes.rows[0];
    if (new Date() > new Date(user.invite_token_expiry)) {
      return res.json({ success: false, message: "This invitation link has expired. Please contact your administrator.", isExpired: true });
    }

    return res.json({ success: true, name: user.user_name, email: user.email });
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
    const cleanToken = token.trim();

    const userRes = await pool.query(
      'SELECT user_id, user_name, email, invite_token_expiry, institute_id FROM "user" WHERE invite_token = $1',
      [cleanToken]
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
      'INSERT INTO used_tokens (token, token_type, user_id) VALUES ($1, \'invite\', $2)',
      [cleanToken, user.user_id]
    );

    await pool.query(
      'UPDATE "user" SET password_hash = $1, status = $2, is_active = $3, invite_token = NULL, invite_token_expiry = NULL WHERE user_id = $4',
      [hashedPassword, "active", true, user.user_id]
    );

    // Update role-specific status if needed (Active = 1)
    await pool.query('UPDATE admin SET user_status_id = 1 WHERE user_id = $1', [user.user_id]);
    await pool.query('UPDATE staff SET user_status_id = 1 WHERE user_id = $1', [user.user_id]);
    await pool.query('UPDATE student SET user_status_id = 1 WHERE student_user_id = $1', [user.user_id]);
    await pool.query('UPDATE master_admin SET user_status_id = 1 WHERE user_id = $1', [user.user_id]);
    await pool.query('UPDATE guardian SET user_status_id = 1 WHERE guardian_user_id = $1', [user.user_id]);

    // Send confirmation email (non-blocking)
    try {
      await emailService.sendPasswordChangedConfirmation({
        to: user.email,
        name: user.user_name,
        instituteId: user.institute_id,
        frontendUrl: getFrontendUrl(req),
      });
    } catch (emailErr) {
      console.error("❌ Failed to send password changed confirmation email:", emailErr.message);
    }

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
      'SELECT user_id, user_name, institute_id FROM "user" WHERE LOWER(email) = LOWER($1)',
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
      instituteId: user.institute_id,
      frontendUrl: getFrontendUrl(req),
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
      'SELECT user_id, user_name, email, reset_token_expiry, institute_id FROM "user" WHERE reset_token = $1',
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
      'INSERT INTO used_tokens (token, token_type, user_id) VALUES ($1, \'reset\', $2)',
      [token, user.user_id]
    );

    await pool.query(
      'UPDATE "user" SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = $2',
      [hashedPassword, user.user_id]
    );

    // Send confirmation (non-blocking)
    try {
      await emailService.sendPasswordChangedConfirmation({
        to: user.email,
        name: user.user_name,
        instituteId: user.institute_id,
        frontendUrl: getFrontendUrl(req),
      });
    } catch (emailErr) {
      console.error("❌ Failed to send password reset confirmation email:", emailErr.message);
    }

    return res.json({ success: true, message: "Password reset successfully. You can now login." });
  } catch (error) {
    console.error("❌ RESET PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   VERIFY RESET TOKEN
 ========================= */
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: "Token required" });

    const userRes = await pool.query(
      'SELECT user_id, user_name, email, reset_token_expiry FROM "user" WHERE reset_token = $1',
      [token]
    );

    if (userRes.rows.length === 0) {
      const usedRes = await pool.query('SELECT 1 FROM used_tokens WHERE token = $1 AND token_type = \'reset\'', [token]);
      if (usedRes.rows.length > 0) {
        return res.json({ success: false, message: "You have already reset your password using this link. Please log in." });
      }
      return res.json({ 
        success: false, 
        message: "This password reset link is invalid or has already been used." 
      });
    }

    const user = userRes.rows[0];
    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.json({ success: false, message: "This password reset link has expired." });
    }

    return res.json({ success: true, name: user.user_name, email: user.email });
  } catch (error) {
    console.error("❌ VERIFY RESET TOKEN ERROR:", error);
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
    const params = [req.instituteId || req.user.institute_id];

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

    const userRes = await pool.query(
      `SELECT u.email, u.user_name, u.role_id, r.role_code, u.status, u.is_active, u.institute_id 
       FROM "user" u
       LEFT JOIN user_role r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const oldUser = userRes.rows[0];
    if (Number(oldUser.institute_id) !== Number(req.instituteId)) {
      return res.status(403).json({ success: false, message: "Forbidden: User belongs to another school" });
    }
    const isDeactivating = (status === 'deactivated' && oldUser.status !== 'deactivated') || 
                           (is_active === false && oldUser.is_active !== false);

    const isReactivating = (status === 'active' && oldUser.status === 'deactivated') || 
                           (is_active === true && oldUser.is_active === false) ||
                           (is_active === true && oldUser.status === 'deactivated');

    if (isReactivating) {
      const invite_token = crypto.randomBytes(32).toString("hex");
      const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await pool.query(
        'UPDATE "user" SET status = $1, is_active = $2, invite_token = $3, invite_token_expiry = $4 WHERE user_id = $5',
        ['pending', false, invite_token, invite_token_expiry, id]
      );

      // Pending user status in sub-tables (13 = Pending)
      await pool.query('UPDATE admin SET user_status_id = 13 WHERE user_id = $1', [id]);
      await pool.query('UPDATE staff SET user_status_id = 13 WHERE user_id = $1', [id]);
      await pool.query('UPDATE student SET user_status_id = 13 WHERE student_user_id = $1', [id]);
      await pool.query('UPDATE master_admin SET user_status_id = 13 WHERE user_id = $1', [id]);
      await pool.query('UPDATE guardian SET user_status_id = 13 WHERE guardian_user_id = $1', [id]);

      try {
        await emailService.sendInvitation({
          to: oldUser.email,
          name: oldUser.user_name,
          role: oldUser.role_code.replace(/_/g, " "),
          token: invite_token,
          instituteId: oldUser.institute_id,
          frontendUrl: getFrontendUrl(req),
        });
      } catch (emailErr) {
        console.error("❌ Failed to send reactivation invitation email:", emailErr);
      }
    } else {
      await pool.query(
        'UPDATE "user" SET status = COALESCE($1, status), is_active = COALESCE($2, is_active) WHERE user_id = $3',
        [status, is_active, id]
      );

      if (is_active !== undefined) {
        const statusId = is_active ? 1 : 2;
        await pool.query('UPDATE admin SET user_status_id = $1 WHERE user_id = $2', [statusId, id]);
        await pool.query('UPDATE staff SET user_status_id = $1 WHERE user_id = $2', [statusId, id]);
        await pool.query('UPDATE student SET user_status_id = $1 WHERE student_user_id = $2', [statusId, id]);
        await pool.query('UPDATE master_admin SET user_status_id = $1 WHERE user_id = $2', [statusId, id]);
        await pool.query('UPDATE guardian SET user_status_id = $1 WHERE guardian_user_id = $2', [statusId, id]);
      }

      if (isDeactivating && oldUser.role_code === 'INSTITUTE_ADMIN') {
        try {
          await emailService.sendDeactivationNotification({
            to: oldUser.email,
            name: oldUser.user_name,
            instituteId: oldUser.institute_id,
          });
        } catch (emailErr) {
          console.error("❌ Failed to send deactivation email:", emailErr);
        }
      }
    }

    // Send status update notification if student's status was updated
    if (oldUser.role_id === 18 || oldUser.role_code === 'STUDENT') {
      let newStatusId = null;
      if (isReactivating) {
        newStatusId = 13; // Pending
      } else if (is_active !== undefined) {
        newStatusId = is_active ? 1 : 2; // Active or Suspended/Inactive
      } else if (status === 'deactivated') {
        newStatusId = 2; // Suspended/Inactive
      }

      if (newStatusId !== null) {
        try {
          const studentRes = await pool.query(
            `SELECT s.stu_first_name, s.stu_last_name, g.email AS parent_email, ust.status_name
             FROM student s
             LEFT JOIN guardian g ON g.student_id = s.student_id
             LEFT JOIN user_status ust ON ust.user_status_id = $1
             WHERE s.student_user_id = $2`,
            [newStatusId, id]
          );
          if (studentRes.rows.length > 0) {
            const { stu_first_name, stu_last_name, parent_email, status_name } = studentRes.rows[0];
            const recipientEmail = parent_email || oldUser.email;
            if (recipientEmail) {
              const studentName = `${stu_first_name} ${stu_last_name}`;
              await emailService.sendStudentStatusUpdateNotification({
                to: recipientEmail,
                studentName,
                statusName: status_name || `Status #${newStatusId}`,
                instituteId: oldUser.institute_id,
              });
            }
          }
        } catch (emailErr) {
          console.error("❌ Failed to send student status update email via updateUserStatus:", emailErr.message);
        }
      }
    }

    return res.json({ success: true, message: "User status updated" });
  } catch (error) {
    console.error("❌ UPDATE STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const currentUserId = req.user.user_id;

    if (Number(id) === Number(currentUserId)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    const userCheck = await client.query('SELECT institute_id FROM "user" WHERE user_id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (Number(userCheck.rows[0].institute_id) !== Number(req.instituteId)) {
      return res.status(403).json({ success: false, message: "Forbidden: User belongs to another school" });
    }

    await client.query("BEGIN");

    // 1. Delete from role-specific tables
    await client.query('DELETE FROM admin WHERE user_id = $1', [id]);
    await client.query('DELETE FROM staff WHERE user_id = $1', [id]);
    await client.query('DELETE FROM student WHERE student_user_id = $1', [id]);
    await client.query('DELETE FROM guardian WHERE guardian_user_id = $1', [id]);
    
    // 2. Delete from login_attempts (cleanup)
    const userEmailRes = await client.query('SELECT email FROM "user" WHERE user_id = $1', [id]);
    if (userEmailRes.rows.length > 0) {
       // We don't have IP here, but we can't easily delete by email from login_attempts anyway as it's IP based.
    }

    // 3. Delete from main user table
    const result = await client.query('DELETE FROM "user" WHERE user_id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await client.query("COMMIT");
    return res.json({ success: true, message: "User account permanently deleted" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ DELETE USER ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

/* ==================================================
   SETUP & MULTI-SCHOOL SWITCHER CONTROLLERS
================================================== */

export const getSetupStatus = async (req, res) => {
  try {
    const roleRes = await pool.query("SELECT role_id FROM user_role WHERE role_code = 'MASTER_ADMIN'");
    let hasMasterAdmin = false;
    if (roleRes.rows.length > 0) {
      const roleId = roleRes.rows[0].role_id;
      const userRes = await pool.query('SELECT user_id FROM "user" WHERE role_id = $1 LIMIT 1', [roleId]);
      hasMasterAdmin = userRes.rows.length > 0;
    }

    const instRes = await pool.query("SELECT institute_id FROM institute WHERE name != 'Setup Placeholder School' LIMIT 1");
    const hasSchool = instRes.rows.length > 0;

    res.json({
      success: true,
      hasMasterAdmin,
      hasSchool
    });
  } catch (error) {
    console.error("❌ SETUP STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Server error checking setup status" });
  }
};

export const setupMasterAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const roleRes = await client.query("SELECT role_id FROM user_role WHERE role_code = 'MASTER_ADMIN'");
    if (roleRes.rows.length === 0) {
      return res.status(500).json({ success: false, message: "MASTER_ADMIN role not seeded" });
    }
    const roleId = roleRes.rows[0].role_id;

    const userRes = await client.query('SELECT user_id FROM "user" WHERE role_id = $1 LIMIT 1', [roleId]);
    if (userRes.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Master Admin already exists" });
    }

    // Check if email already exists
    const emailCheck = await client.query('SELECT user_id FROM "user" WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: "A user with this email already exists" });
    }

    await client.query("BEGIN");

    const placeholderInstRes = await client.query(
      `INSERT INTO institute (name, short_name, address, status_id) 
       VALUES ('Setup Placeholder School', 'SPS_TEMP', 'System Setup Placeholder', 1) 
       RETURNING institute_id`
    );
    const instituteId = placeholderInstRes.rows[0].institute_id;

    // Generate invite token (same pattern as inviteUser)
    const invite_token = crypto.randomBytes(32).toString("hex");
    const invite_token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user as PENDING (no password yet — they'll set it via email link)
    const newUserRes = await client.query(
      `INSERT INTO "user" (
        user_name, email, phone, role_id, institute_id, 
        is_active, status, invite_token, invite_token_expiry
      ) VALUES ($1, $2, $3, $4, $5, false, 'pending', $6, $7) 
      RETURNING user_id, user_name, email, role_id, institute_id`,
      [name, email, phone || null, roleId, instituteId, invite_token, invite_token_expiry]
    );
    const newUser = newUserRes.rows[0];

    const statusRes = await client.query("SELECT user_status_id FROM user_status WHERE status_name = 'Pending Approval'");
    const pendingStatusId = statusRes.rows.length > 0 ? statusRes.rows[0].user_status_id : 13;

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "Admin";

    await client.query(
      `INSERT INTO master_admin (
        user_id, m_admin_first_name, m_admin_last_name, email, phone, user_status_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [newUser.user_id, firstName, lastName, email, phone || null, pendingStatusId]
    );

    await client.query(
      `INSERT INTO school_profile (id, school_name, email, phone, address, academic_year)
       VALUES ($1, 'Setup Placeholder School', $2, $3, 'System Setup Placeholder', '2026-27')`,
      [instituteId, email, phone || null]
    );

    await client.query("COMMIT");

    // Send confirmation email with set-password link (non-blocking for response)
    let emailSent = false;
    try {
      await emailService.sendMasterAdminSetup({
        to: email,
        name: name,
        token: invite_token,
        instituteId,
        frontendUrl: getFrontendUrl(req),
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("❌ Master Admin setup email failed:", emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? `Master Admin account created! A confirmation email has been sent to ${email}. Please check your inbox to set your password.`
        : `Master Admin account created, but email delivery failed. Please contact support.`,
      email_sent: emailSent,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ SETUP MASTER ADMIN ERROR:", error);
    res.status(500).json({ success: false, message: "Server error setting up Master Admin" });
  } finally {
    client.release();
  }
};

export const setupSchool = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, role_id, institute_id: currentInstituteId } = req.user;

    if (Number(role_id) !== 1) {
      return res.status(403).json({ success: false, message: "Only Master Admin can create schools" });
    }

    const {
      school_name, organization_name, school_code,
      school_email, school_phone, school_address,
      principal_name, academic_year, logo_url
    } = req.body;

    if (!school_name || !organization_name || !school_code || !school_email || !school_phone || !school_address || !principal_name || !academic_year) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const finalLogoUrl = req.file ? req.file.path : (logo_url || "");

    await client.query("BEGIN");

    const newInstRes = await client.query(
      `INSERT INTO institute (
        name, short_name, address, phone, email, logo_url, status_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW()) 
      RETURNING institute_id`
    );
    const newInstituteId = newInstRes.rows[0].institute_id;

    await client.query(
      `INSERT INTO school_profile (
        id, school_name, organization_name, affiliation_number, school_type,
        email, phone, address, principal_name, logo_url, academic_year
      ) VALUES ($1, $2, $3, $4, 'K-12', $5, $6, $7, $8, $9, $10)`,
      [
        newInstituteId, school_name, organization_name, school_code,
        school_email, school_phone, school_address, principal_name, finalLogoUrl, academic_year
      ]
    );

    const currentInstRes = await client.query(
      "SELECT name FROM institute WHERE institute_id = $1",
      [currentInstituteId]
    );

    const isPlaceholder = currentInstRes.rows.length > 0 && currentInstRes.rows[0].name === "Setup Placeholder School";

    if (isPlaceholder) {
      await client.query(
        'UPDATE "user" SET institute_id = $1 WHERE user_id = $2',
        [newInstituteId, user_id]
      );

      await client.query("DELETE FROM school_profile WHERE id = $1", [currentInstituteId]);
      await client.query("DELETE FROM institute WHERE institute_id = $1", [currentInstituteId]);
    }

    await client.query("COMMIT");

    const accessToken = jwt.sign(
      {
        user_id,
        role_id,
        institute_id: newInstituteId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      success: true,
      message: "School created successfully",
      accessToken,
      institute_id: newInstituteId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ SETUP SCHOOL ERROR:", error);
    res.status(500).json({ success: false, message: "Server error setting up school" });
  } finally {
    client.release();
  }
};

export const switchSchool = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, role_id } = req.user;
    const { institute_id } = req.body;

    if (Number(role_id) !== 1) {
      return res.status(403).json({ success: false, message: "Only Master Admin can switch schools" });
    }

    if (!institute_id) {
      return res.status(400).json({ success: false, message: "Institute ID is required" });
    }

    const instRes = await client.query(
      "SELECT institute_id FROM institute WHERE institute_id = $1 AND name != 'Setup Placeholder School'",
      [institute_id]
    );

    if (instRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

    await client.query("BEGIN");

    await client.query(
      'UPDATE "user" SET institute_id = $1 WHERE user_id = $2',
      [institute_id, user_id]
    );

    await client.query("COMMIT");

    const accessToken = jwt.sign(
      {
        user_id,
        role_id,
        institute_id: Number(institute_id),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      success: true,
      message: "Switched school successfully",
      accessToken,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ SWITCH SCHOOL ERROR:", error);
    res.status(500).json({ success: false, message: "Server error switching school" });
  } finally {
    client.release();
  }
};

export const getMySchools = async (req, res) => {
  try {
    const { role_id } = req.user;

    if (Number(role_id) !== 1) {
      return res.status(403).json({ success: false, message: "Only Master Admin can list all schools" });
    }

    const { rows } = await pool.query(
      `SELECT i.institute_id, COALESCE(sp.school_name, i.name) AS name, i.short_name, COALESCE(sp.logo_url, i.logo_url) AS logo_url, i.email, i.phone, i.address 
       FROM institute i
       LEFT JOIN school_profile sp ON i.institute_id = sp.id
       WHERE i.name != 'Setup Placeholder School' 
       ORDER BY i.institute_id ASC`
    );

    res.status(200).json({
      success: true,
      schools: rows,
    });
  } catch (error) {
    console.error("❌ GET MY SCHOOLS ERROR:", error);
    res.status(500).json({ success: false, message: "Server error fetching schools" });
  }
};



