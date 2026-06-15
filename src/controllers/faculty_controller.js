// controllers/faculty_controller.js
import { FacultyService } from "../services/faculty_Service.js";
import { emailService } from "../services/email_service.js";

export const FacultyController = {

  async getAllFaculty(req, res) {
    try {
      const authUser = { ...req.user, institute_id: req.instituteId };
      const data = await FacultyService.getAllFaculty(authUser);
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error("DEBUG: getAllFaculty - ERROR:", err);
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async getFacultyById(req, res) {
    try {
      const data = await FacultyService.getFacultyById(req.params.id, req.instituteId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async uploadPhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      res.status(200).json({
        success: true,
        message: "Photo uploaded successfully",
        data: { url: req.file.path },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createFaculty(req, res) {
    try {
      if (!req.user || !req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: institute missing",
        });
      }

      const authUser = { ...req.user, institute_id: req.instituteId };
      const data = await FacultyService.createFaculty(req.body, authUser);

      // ── Auto-send invitation email for new user accounts ──────────────
      let emailSent = false;
      let emailWarning = null;

      if (data.isNewUser && data.invite_token) {
        const roleLabel = req.body.role_id === 3 ? "Teacher" : "Staff";
        
        try {
          await emailService.sendInvitation({
            to: req.body.email,
            name: data.fullName || req.body.email,
            role: roleLabel,
            token: data.invite_token,
            instituteId: req.instituteId,
          });
          console.log(`✅ Invitation email sent to ${req.body.email} for new faculty.`);
          emailSent = true;
        } catch (emailErr) {
          emailWarning = emailErr.message;
          console.error("❌ Faculty invite email failed:", emailErr.message);
        }
      }

      // Strip internal fields before returning to client
      const { invite_token, isNewUser, fullName, ...staffData } = data;

      res.status(201).json({
        success: true,
        message: emailSent
          ? "Faculty created and invitation email sent successfully."
          : data.isNewUser
            ? `Faculty created. ${emailWarning || "Invitation email not sent."}`
            : "Faculty created successfully.",
        email_sent: emailSent,
        data: staffData,
      });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async updateFaculty(req, res) {
    try {
      const data = await FacultyService.updateFaculty(req.params.id, req.body, req.instituteId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error("❌ UPDATE FACULTY ERROR:", err);
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async deleteFaculty(req, res) {
    try {
      const data = await FacultyService.deleteFaculty(req.params.id, req.instituteId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },
};
