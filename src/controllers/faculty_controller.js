// controllers/faculty_controller.js
import { FacultyService } from "../services/faculty_Service.js";
import { emailService } from "../services/email_service.js";
import { getFrontendUrl } from "../utils/url_helpers.js";

export const FacultyController = {

  async getAllFaculty(req, res) {
    try {
      const authUser = { ...req.user, institute_id: req.instituteId };
      const { search, dept_id, page, limit } = req.query;

      const result = await FacultyService.getAllFaculty(authUser, {
        search,
        deptId: dept_id ? parseInt(dept_id, 10) : null,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50
      });

      if (page || limit || search || dept_id) {
        return res.status(200).json({
          success: true,
          data: result.rows,
          pagination: result.pagination
        });
      }

      res.status(200).json({ success: true, data: result.rows });
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
    const startTime = Date.now();
    try {
      if (!req.user || !req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: institute missing",
        });
      }

      const { staff_first_name, email } = req.body;
      if (!staff_first_name || !staff_first_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "First name is required to create faculty",
        });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email is required to create faculty",
        });
      }

      const authUser = { ...req.user, institute_id: req.instituteId };
      const dbStartTime = Date.now();
      const data = await FacultyService.createFaculty(req.body, authUser);
      const dbDuration = Date.now() - dbStartTime;

      // ── Auto-send invitation email for new user accounts (NON-BLOCKING BACKGROUND DISPATCH) ──
      if (data.isNewUser && data.invite_token) {
        const roleLabel = req.body.role_id === 3 ? "Teacher" : "Staff";
        const emailTo = req.body.email;
        const nameTo = data.fullName || req.body.email;
        const tokenTo = data.invite_token;
        const instId = req.instituteId;

        setImmediate(async () => {
          const emailStartTime = Date.now();
          try {
            await emailService.sendInvitation({
              to: emailTo,
              name: nameTo,
              role: roleLabel,
              token: tokenTo,
              instituteId: instId,
              frontendUrl: getFrontendUrl(req),
            });
            console.log(`⏱️ [BACKGROUND EMAIL] Faculty invitation sent to ${emailTo} in ${Date.now() - emailStartTime}ms`);
          } catch (emailErr) {
            console.error("❌ [BACKGROUND EMAIL ERROR] Faculty invite email failed:", emailErr.message);
          }
        });
      }

      // Strip internal fields before returning to client
      const { invite_token, isNewUser, fullName, ...staffData } = data;

      const totalDuration = Date.now() - startTime;
      console.log(`⚡ [ADD FACULTY PERF] Total API Response Time: ${totalDuration}ms (DB Tx: ${dbDuration}ms, Email: Non-blocking background)`);

      res.status(201).json({
        success: true,
        message: "Faculty created successfully. Invitation email is being sent.",
        email_sent: true,
        data: staffData,
        execution_time_ms: totalDuration
      });
    } catch (err) {
      console.error("❌ Faculty creation error:", err);
      if (err.code === '23505') {
        return res.status(409).json({
          success: false,
          message: `A faculty member with the email ${req.body.email} or details already exists.`,
        });
      }
      res.status(err.status || 500).json({ success: false, message: err.message || "Error creating faculty" });
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
