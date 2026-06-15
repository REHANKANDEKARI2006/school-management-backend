import { DashboardService } from "../services/dashboard_service.js";
import pool from "../config/db.js";

export const DashboardController = {
  async getDashboardSummary(req, res) {
    try {
      const { user_id, role_id } = req.user;
      const institute_id = req.instituteId;
      console.log(`DEBUG: Dashboard access - User: ${user_id}, Role: ${role_id}, Inst: ${institute_id}`);
      
      let summary;
      if ([3, 4, 5].includes(role_id)) { // Teacher roles (Teacher, Class Teacher, Mentor)
        // 1. Get staff_id for this user
        const staffRes = await pool.query(
          `SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1`,
          [user_id]
        );
        
        if (staffRes.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Staff profile not found for this user"
          });
        }
        
        const staffId = staffRes.rows[0].staff_id;
        summary = await DashboardService.getTeacherSummary(staffId, user_id, institute_id);
      } else if (role_id === 18) { // Student
        summary = await DashboardService.getStudentDashboardData(user_id);
      } else {
        // Default to Admin Summary for now (Admin/Master Admin)
        summary = await DashboardService.getAdminSummary(institute_id);
      }

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      console.error("DashboardController Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard summary",
        error: err.message
      });
    }
  },

  async getStudentDashboard(req, res) {
    try {
      const userId = req.user.user_id;
      const data = await DashboardService.getStudentDashboardData(userId);
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      console.error("DashboardController.getStudentDashboard Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student dashboard data",
        error: err.message
      });
    }
  }
};
