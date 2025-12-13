import { StudentService } from "../services/student_Service.js";

export const StudentController = {
  async getAllStudents(req, res) {
    try {
      const data = await StudentService.getAllStudents();
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async getStudentById(req, res) {
    try {
      const data = await StudentService.getStudentById(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async createStudent(req, res) {
    try {
      const data = await StudentService.createStudent(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async updateStudent(req, res) {
    try {
      const data = await StudentService.updateStudent(req.params.id, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  },

  async deleteStudent(req, res) {
    try {
      const data = await StudentService.deleteStudent(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }
};
