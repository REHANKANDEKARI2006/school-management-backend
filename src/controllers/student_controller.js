import { StudentService } from "../services/student_Service.js";
import pool from "../config/db.js";

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
      const { user_id, role_id } = req.user;
      let { class_id } = req.query;

      // Isolation: If teacher, restrict to their class
      const isTeacher = [3, 4, 5].includes(role_id);
      if (isTeacher) {
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        
        if (staffRes.rows.length === 0 || !staffRes.rows[0].class_id) {
          return res.status(200).json({ success: true, data: [] });
        }
        class_id = staffRes.rows[0].class_id;
      }

      let data;
      if (class_id) {
        data = await StudentService.getStudentsByClassId(parseInt(class_id));
      } else {
        data = await StudentService.getAllStudents();
      }
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getStudentById(req, res) {
    try {
      const { user_id, role_id } = req.user;
      const studentId = req.params.id;

      const data = await StudentService.getStudentById(studentId);

      // Isolation Check
      const isTeacher = [3, 4, 5].includes(role_id);
      if (isTeacher) {
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;
        
        if (data.class_id !== assignedClassId) {
          return res.status(403).json({ success: false, message: "Unauthorized: Access restricted to students of your assigned class" });
        }
      }

      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async createStudent(req, res) {
    try {
      // ✅ REQUIRED FIX (correct & safe)
      if (!req.user || !req.user.user_id || !req.user.institute_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: user or institute not found",
        });
      }

      const data = await StudentService.createStudent(
        req.body,
        req.user   // ✅ FULL auth user (user_id + institute_id)
      );

      // Log activity
      const { DashboardService } = await import("../services/dashboard_service.js");
      await DashboardService.addActivityEntry(
        req.user.user_id, 
        'student_enrolled', 
        `New student enrolled: ${req.body.stu_first_name} ${req.body.stu_last_name}`
      );

      res.status(201).json({
        success: true,
        message: "Student created successfully",
        data,
      });
    } catch (err) {
      console.error(err);
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
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
        const student = await StudentService.getStudentById(studentId);
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;

        if (student.class_id !== assignedClassId) {
          return res.status(403).json({ success: false, message: "Unauthorized: You can only update students within your assigned class" });
        }
      }

      const data = await StudentService.updateStudent(studentId, req.body);
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
        const student = await StudentService.getStudentById(studentId);
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;

        if (student.class_id !== assignedClassId) {
          return res.status(403).json({ success: false, message: "Unauthorized: You can only manage students within your assigned class" });
        }
      }

      const data = await StudentService.deleteStudent(studentId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },
};
