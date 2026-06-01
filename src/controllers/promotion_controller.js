import { PromotionModel } from "../models/promotion_model.js";

export const PromotionController = {

  /* ─── GET /api/promotion/students ─── */
  async getStudents(req, res) {
    try {
      const { institute_id, user_id, role_id } = req.user;

      let restrictToClassId = null;

      // Teacher (role 3) and Class Teacher (role 4) can only see their own class
      if (role_id === 3 || role_id === 4) {
        const classId = await PromotionModel.getClassTeacherClassId(user_id);
        if (!classId) {
          return res.json({ success: true, data: [] });
        }
        restrictToClassId = classId;
      }

      const students = await PromotionModel.getStudentsForPromotion(institute_id, restrictToClassId);
      res.json({ success: true, data: students });
    } catch (err) {
      console.error("[PromotionController] getStudents error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch students for promotion" });
    }
  },

  /* ─── GET /api/promotion/classes ─── */
  async getClasses(req, res) {
    try {
      const classes = await PromotionModel.getAllClassesOrdered();
      res.json({ success: true, data: classes });
    } catch (err) {
      console.error("[PromotionController] getClasses error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch classes" });
    }
  },

  /* ─── POST /api/promotion/promote ─── */
  async promote(req, res) {
    try {
      const { user_id, role_id, institute_id } = req.user;
      const { promotions } = req.body;
      // promotions = [{ studentId, targetClassId }]

      if (!Array.isArray(promotions) || promotions.length === 0) {
        return res.status(400).json({ success: false, message: "No promotions provided" });
      }

      // Teacher/Class Teacher restriction: verify all students belong to their class
      if (role_id === 3 || role_id === 4) {
        const classId = await PromotionModel.getClassTeacherClassId(user_id);
        if (!classId) {
          return res.status(403).json({ success: false, message: "No class assigned to this teacher" });
        }

        const { Pool } = await import("pg");
        const { default: dotenv } = await import("dotenv");
        dotenv.config();
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

        const studentIds = promotions.map(p => p.studentId);
        const check = await pool.query(
          `SELECT COUNT(*) FROM class_enrollment ce
           WHERE ce.student_id = ANY($1) AND ce.class_id != $2 AND ce.status_id = 1`,
          [studentIds, classId]
        );
        if (parseInt(check.rows[0].count) > 0) {
          return res.status(403).json({ success: false, message: "Unauthorized: Some students are not in your class" });
        }
      }

      const result = await PromotionModel.promoteStudents(promotions);

      // Log activity
      try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
          user_id,
          "students_promoted",
          `${result.promoted} student${result.promoted !== 1 ? "s" : ""} promoted to new classes`
        );
      } catch (e) { console.error(e); }

      res.json({
        success: true,
        message: `${result.promoted} student${result.promoted !== 1 ? "s" : ""} promoted successfully`,
        promoted: result.promoted,
      });
    } catch (err) {
      console.error("[PromotionController] promote error:", err);
      res.status(500).json({ success: false, message: "Failed to process promotions" });
    }
  },
};
