import { PromotionModel } from "../models/promotion_model.js";

export const PromotionController = {

  /* ─── GET /api/promotion/students ─── */
  async getStudents(req, res) {
    try {
      const { user_id, role_id } = req.user;
      const instituteId = req.instituteId;

      let restrictToClassId = null;

      // Teacher (role 3) and Class Teacher (role 4) can only see their own class
      if (role_id === 3 || role_id === 4) {
        const classId = await PromotionModel.getClassTeacherClassId(user_id);
        if (!classId) {
          return res.json({ success: true, data: [] });
        }
        restrictToClassId = classId;
      }

      const students = await PromotionModel.getStudentsForPromotion(instituteId, restrictToClassId);
      res.json({ success: true, data: students });
    } catch (err) {
      console.error("[PromotionController] getStudents error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch students for promotion" });
    }
  },

  /* ─── GET /api/promotion/classes ─── */
  async getClasses(req, res) {
    try {
      const classes = await PromotionModel.getAllClassesOrdered(req.instituteId);
      res.json({ success: true, data: classes });
    } catch (err) {
      console.error("[PromotionController] getClasses error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch classes" });
    }
  },

  /* ─── POST /api/promotion/promote ─── */
  async promote(req, res) {
    try {
      const { user_id, role_id } = req.user;
      const instituteId = req.instituteId;
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
           JOIN class c ON c.class_id = ce.class_id
           WHERE ce.student_id = ANY($1) AND ce.class_id != $2 AND ce.status_id = 1 AND c.institute_id = $3`,
          [studentIds, classId, instituteId]
        );
        if (parseInt(check.rows[0].count) > 0) {
          return res.status(403).json({ success: false, message: "Unauthorized: Some students are not in your class" });
        }
      }

      // Enforce that the target classes and students belong to the active school
      const { Pool } = await import("pg");
      const { default: dotenv } = await import("dotenv");
      dotenv.config();
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

      const targetClassIds = [...new Set(promotions.map(p => p.targetClassId))];
      const classCheck = await pool.query(
        `SELECT COUNT(*) FROM class WHERE class_id = ANY($1) AND institute_id != $2`,
        [targetClassIds, instituteId]
      );
      if (parseInt(classCheck.rows[0].count) > 0) {
        return res.status(403).json({ success: false, message: "Unauthorized: One or more target classes do not belong to your school" });
      }

      const studentIds = promotions.map(p => p.studentId);
      const studentCheck = await pool.query(
        `SELECT COUNT(*) FROM student s
         JOIN "user" u ON s.student_user_id = u.user_id
         WHERE s.student_id = ANY($1) AND u.institute_id != $2`,
        [studentIds, instituteId]
      );
      if (parseInt(studentCheck.rows[0].count) > 0) {
        return res.status(403).json({ success: false, message: "Unauthorized: One or more students do not belong to your school" });
      }

      const result = await PromotionModel.promoteStudents(promotions);

      // Log activity
      try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
          user_id,
          "students_promoted",
          `${result.promoted} student${result.promoted !== 1 ? "s" : ""} promoted to new classes`,
          instituteId
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
