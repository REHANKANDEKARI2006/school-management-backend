import { StudentService } from "../services/student_Service.js";

export const StudentController = {
  async getAllStudents(req, res) {
    try {
      const data = await StudentService.getAllStudents();
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
      const data = await StudentService.getStudentById(req.params.id);
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
      const data = await StudentService.updateStudent(req.params.id, req.body);
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
      const data = await StudentService.deleteStudent(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },
};
