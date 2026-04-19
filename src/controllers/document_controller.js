import { DocumentService } from "../services/document_service.js";
import pool from "../config/db.js";

export const DocumentController = {
  async generateIdCard(req, res) {
    try {
      const studentId = req.params.studentId;
      const { user_id, role_id } = req.user;

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const studentRes = await pool.query(`SELECT class_id FROM student WHERE student_id = $1`, [studentId]);
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        if (studentRes.rows[0]?.class_id !== staffRes.rows[0]?.class_id) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateIdCard(studentId, user_id);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              user_id,
              'id_card_generated',
              `ID Card generated for Student ID: ${studentId}`
          );
      } catch (e) { console.error(e); }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ID_Card_${studentId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating ID Card PDF" });
    }
  },

  async generateBonafide(req, res) {
    try {
      const studentId = req.params.studentId;
      const { user_id, role_id } = req.user;

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const studentRes = await pool.query(`SELECT class_id FROM student WHERE student_id = $1`, [studentId]);
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        if (studentRes.rows[0]?.class_id !== staffRes.rows[0]?.class_id) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateBonafide(studentId, user_id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bonafide_${studentId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating Bonafide PDF" });
    }
  },

  async generateBulkIdCards(req, res) {
    try {
      const { studentIds } = req.body;
      const { user_id, role_id } = req.user;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: "No student IDs provided" });
      }

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;
        
        const countRes = await pool.query(
          `SELECT COUNT(*) FROM student WHERE student_id = ANY($1) AND class_id != $2`,
          [studentIds, assignedClassId]
        );
        
        if (parseInt(countRes.rows[0].count) > 0) {
          return res.status(403).json({ success: false, message: "Unauthorized: One or more students are not in your class" });
        }
      }

      const pdfBuffer = await DocumentService.generateBulkIdCards(studentIds, user_id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bulk_ID_Cards.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating bulk ID Cards PDF" });
    }
  },

  async generateBulkBonafide(req, res) {
    try {
      const { studentIds } = req.body;
      const { user_id, role_id } = req.user;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: "No student IDs provided" });
      }

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;
        
        const countRes = await pool.query(
          `SELECT COUNT(*) FROM student WHERE student_id = ANY($1) AND class_id != $2`,
          [studentIds, assignedClassId]
        );
        
        if (parseInt(countRes.rows[0].count) > 0) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateBulkBonafide(studentIds, user_id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bulk_Bonafide.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating bulk Bonafide PDF" });
    }
  },

  async getDocumentHistory(req, res) {
    try {
      const { student_id } = req.params;
      const data = await DocumentService.getDocumentHistory(student_id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async previewTemplate(req, res) {
    try {
      const { type, templateId } = req.params;
      const pdfBuffer = await DocumentService.getTemplatePreview(type, templateId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=preview_${templateId}.pdf`);
      res.send(pdfBuffer);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async generateMarkSheet(req, res) {
    try {
      const { studentId } = req.params;
      const { user_id, role_id } = req.user;

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const studentRes = await pool.query(`SELECT class_id FROM student WHERE student_id = $1`, [studentId]);
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        if (studentRes.rows[0]?.class_id !== staffRes.rows[0]?.class_id) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateMarkSheet(studentId, user_id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="MarkSheet_${studentId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating Mark Sheet PDF" });
    }
  },

  async generateGeneralCertificate(req, res) {
    try {
      const { studentId } = req.params;
      const userId = req.user?.user_id || null;
      const pdfBuffer = await DocumentService.generateGeneralCertificate(studentId, userId);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              userId,
              'tc_issued',
              `General Certificate / TC issued for Student ID: ${studentId}`
          );
      } catch (e) { console.error(e); }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Certificate_${studentId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating General Certificate PDF" });
    }
  },

  async generateTimetable(req, res) {
    try {
      const { classId } = req.params;
      const userId = req.user?.user_id || null;
      const pdfBuffer = await DocumentService.generateTimetable(classId, userId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Timetable_${classId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating Timetable PDF" });
    }
  },

  async generateMonthlyAttendancePDF(req, res) {
    try {
      const { classId, year, month } = req.params;
      const { user_id, role_id } = req.user;

      // Access control: Teachers can only download their own class report
      if ([3, 4, 15, 16].includes(role_id)) {
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;
        
        if (!assignedClassId || parseInt(assignedClassId) !== parseInt(classId)) {
          return res.status(403).json({ success: false, message: "Unauthorized: You can only access your own class report" });
        }
      }

      const pdfBuffer = await DocumentService.generateMonthlyAttendancePDF(classId, month, year, user_id);

      const sql = `SELECT class_name FROM class WHERE class_id = $1`;
      const classRes = await pool.query(sql, [classId]);
      const className = classRes.rows[0]?.class_name || 'Class';
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthLabel = monthNames[parseInt(month) - 1];

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Attendance_${className}_${monthLabel}${year}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error("Monthly PDF error:", err);
      res.status(500).json({ success: false, message: "Error generating Monthly Attendance PDF" });
    }
  }
};
