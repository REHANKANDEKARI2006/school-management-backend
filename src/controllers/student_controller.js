import { StudentService } from "../services/student_Service.js";
import pool from "../config/db.js";
import { getFrontendUrl } from "../utils/url_helpers.js";

export const StudentController = {
  async uploadPhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      
      const fileUrl = req.file.path;
      
      res.status(200).json({
        success: true,
        message: "Photo uploaded successfully",
        data: {
          url: fileUrl
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error uploading file" });
    }
  },

  async getAllStudents(req, res) {
    try {
      const institute_id = req.instituteId;
      const { class_id, search, status_id, page, limit } = req.query;

      const result = await StudentService.getAllStudents(institute_id, {
        classId: class_id ? parseInt(class_id, 10) : null,
        search,
        statusId: status_id ? parseInt(status_id, 10) : null,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50
      });

      // If page or search parameter was provided, return with pagination object
      if (page || limit || search || status_id) {
        return res.json({
          success: true,
          data: result.rows,
          pagination: result.pagination
        });
      }

      // Backward compatibility for existing UI components that read data directly as an array
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Server error fetching students",
      });
    }
  },

  async getStudentById(req, res) {
    try {
      const studentId = req.params.id;

      const data = await StudentService.getStudentById(studentId, req.instituteId);

      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async createStudent(req, res) {
    const startTime = Date.now();
    try {
      if (!req.user || !req.user.user_id || !req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: user or institute not found",
        });
      }

      const { stu_first_name, class_id } = req.body;
      if (!stu_first_name || !stu_first_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "First name is required to enroll a student",
        });
      }

      const authUser = { ...req.user, institute_id: req.instituteId, frontendUrl: getFrontendUrl(req) };

      const dbStartTime = Date.now();
      const data = await StudentService.createStudent(
        req.body,
        authUser
      );
      const dbDuration = Date.now() - dbStartTime;

      // Log activity
      try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
          req.user.user_id, 
          'student_enrolled', 
          `New student enrolled: ${req.body.stu_first_name} ${req.body.stu_last_name || ''}`,
          req.instituteId
        );
      } catch (actErr) { console.error(actErr); }

      const totalDuration = Date.now() - startTime;
      console.log(`⚡ [ADD STUDENT PERF] Total API Response Time: ${totalDuration}ms (DB Tx: ${dbDuration}ms, Email: Non-blocking background)`);

      res.status(201).json({
        success: true,
        message: "Student created successfully. Invitation email is being sent.",
        data: { student_id: data.student_id },
        email_sent: true,
        execution_time_ms: totalDuration
      });
    } catch (err) {
      console.error("❌ Student creation error:", err);
      if (err.code === '23505') {
        return res.status(400).json({
          success: false,
          message: "A student or guardian account with this email/details already exists.",
        });
      }
      if (err.code === '22007' || err.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: "Invalid date or numeric input provided for student fields.",
        });
      }
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Server error creating student",
      });
    }
  },

  async updateStudent(req, res) {
    try {
      const { user_id, role_id } = req.user;
      const studentId = req.params.id;

      // Isolation Check
      const isTeacher = [3, 4, 5].includes(role_id);
      if (isTeacher) {
        const student = await StudentService.getStudentById(studentId, req.instituteId);
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;

        if (Number(student.class_id) !== Number(assignedClassId)) {
          return res.status(403).json({ success: false, message: "Unauthorized: You can only update students within your assigned class" });
        }
      } else {
        // Double check student exists in this school
        await StudentService.getStudentById(studentId, req.instituteId);
      }

      const data = await StudentService.updateStudent(studentId, req.body, req.instituteId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async deleteStudent(req, res) {
    try {
      const { user_id, role_id } = req.user;
      const studentId = req.params.id;

      // Isolation Check
      const isTeacher = [3, 4, 5].includes(role_id);
      if (isTeacher) {
        const student = await StudentService.getStudentById(studentId, req.instituteId);
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;

        if (Number(student.class_id) !== Number(assignedClassId)) {
          return res.status(403).json({ success: false, message: "Unauthorized: You can only manage students within your assigned class" });
        }
      } else {
        // Double check student exists in this school
        await StudentService.getStudentById(studentId, req.instituteId);
      }

      const data = await StudentService.deleteStudent(studentId, req.instituteId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },
};
