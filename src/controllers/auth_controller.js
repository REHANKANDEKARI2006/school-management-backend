import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

import { StudentModel } from "../models/student_Model.js";

/* =========================
   LOGIN CONTROLLER
========================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

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

    // Check base activity
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

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

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        institute_id: user.institute_id, // ✅ FIX
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    );

    let studentDetails = null;
    if (user.role_id === 18) { // Student Role ID
      studentDetails = await StudentModel.findByUserId(user.user_id);
    }

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      role_id: user.role_id,
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
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
      );

      return res.json({
        success: true,
        accessToken: newAccessToken,
      });
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
