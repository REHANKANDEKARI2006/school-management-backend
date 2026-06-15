import { DocumentService } from "../services/document_service.js";
import pool from "../config/db.js";

export const DocumentController = {
  async generateIdCard(req, res) {
    try {
      const studentId = req.params.studentId;
      const { user_id, role_id } = req.user;
      const templateId = req.query.template || null;

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const studentRes = await pool.query(
          `SELECT ce.class_id FROM student s 
           JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.student_id = $1`, 
          [studentId]
        );
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        if (studentRes.rows[0]?.class_id !== staffRes.rows[0]?.class_id) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateIdCard(studentId, user_id, templateId, null, req.instituteId);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              user_id,
              'id_card_generated',
              `ID Card generated for Student ID: ${studentId}`,
              req.instituteId
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
      const templateId = req.query.template || null;

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const studentRes = await pool.query(
          `SELECT ce.class_id FROM student s 
           JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.student_id = $1`, 
          [studentId]
        );
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        if (studentRes.rows[0]?.class_id !== staffRes.rows[0]?.class_id) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateBonafide(studentId, user_id, templateId, null, req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bonafide_${studentId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating Bonafide PDF" });
    }
  },
  async generateLeavingCertificate(req, res) {
    try {
      const studentId = req.params.studentId;
      const { user_id, role_id } = req.user;
      const templateId = req.query.template || null;

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const studentRes = await pool.query(
          `SELECT ce.class_id FROM student s 
           JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.student_id = $1`, 
          [studentId]
        );
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        if (studentRes.rows[0]?.class_id !== staffRes.rows[0]?.class_id) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateLeavingCertificate(studentId, user_id, templateId, null, req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Leaving_Certificate_${studentId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating Leaving Certificate PDF" });
    }
  },

  async generateBulkLeavingCertificates(req, res) {
    try {
      const { studentIds, templateId } = req.body;
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
          `SELECT COUNT(*) FROM student s
           JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.student_id = ANY($1) AND ce.class_id != $2`,
          [studentIds, assignedClassId]
        );
        
        if (parseInt(countRes.rows[0].count) > 0) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateBulkLeavingCertificates(studentIds, user_id, templateId || 'template1', req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bulk_Leaving_Certificates.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating bulk Leaving Certificates PDF" });
    }
  },

  async generateBulkIdCards(req, res) {
    try {
      const { studentIds, templateId } = req.body;
      const { user_id, role_id } = req.user;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: "No student IDs provided" });
      }

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const staffRes = await pool.query(
          `SELECT c.class_id FROM class c 
           JOIN staff st ON st.staff_id = c.staff_id
           WHERE st.user_id = $1 LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;
        
        const countRes = await pool.query(
          `SELECT COUNT(*) FROM student s
           JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.student_id = ANY($1) AND ce.class_id != $2`,
          [studentIds, assignedClassId]
        );
        
        if (parseInt(countRes.rows[0].count) > 0) {
          return res.status(403).json({ success: false, message: "Unauthorized: One or more students are not in your class" });
        }
      }

      const pdfBuffer = await DocumentService.generateBulkIdCards(studentIds, user_id, templateId || 'template1', req.instituteId);

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
      const { studentIds, templateId } = req.body;
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

      const pdfBuffer = await DocumentService.generateBulkBonafide(studentIds, user_id, templateId || 'template1', req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bulk_Bonafide.pdf"`);
      res.status(200).send(pdfBuffer);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("[DocumentController] generateBulkBonafide error:", error);
      res.status(500).json({ success: false, message: "Error generating bulk Bonafide PDF" });
    }
  },

  async generateFeeReceipt(req, res) {
    try {
      const { paymentId } = req.params;
      const user_id = req.user?.user_id;
      const templateId = req.query.template || null;
      
      const pdfBuffer = await DocumentService.generateFeeReceipt(paymentId, user_id, null, templateId, req.instituteId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Fee_Receipt_${paymentId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("[DocumentController] generateFeeReceipt error:", error);
      res.status(500).json({ success: false, message: "Error generating fee receipt PDF" });
    }
  },

  async generateBulkGeneralCertificates(req, res) {
    try {
      const { studentIds, templateId, eventId } = req.body;
      const { user_id } = req.user;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: "No student IDs provided" });
      }

      const pdfBuffer = await DocumentService.generateBulkGeneralCertificates(studentIds, user_id, templateId || 'template1', eventId, req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bulk_Certificates.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating bulk Certificates PDF" });
    }
  },

  async generateGeneralCertificate(req, res) {
    try {
      const { studentId } = req.params;
      const userId = req.user?.user_id || null;
      const templateId = req.query.template || null;
      const eventId = req.query.eventId || null;
      const pdfBuffer = await DocumentService.generateGeneralCertificate(studentId, userId, templateId, null, eventId, req.instituteId);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              userId,
              'tc_issued',
              `General Certificate / TC issued for Student ID: ${studentId}`,
              req.instituteId
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
      const pdfBuffer = await DocumentService.getTemplatePreview(type, templateId, req.instituteId);

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
      const templateId = req.query.template || null;

      // Isolation Check
      if ([3, 4, 5].includes(role_id)) {
        const studentRes = await pool.query(
          `SELECT ce.class_id FROM student s 
           JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.student_id = $1`, 
          [studentId]
        );
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        if (studentRes.rows[0]?.class_id !== staffRes.rows[0]?.class_id) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      const pdfBuffer = await DocumentService.generateMarkSheet(studentId, user_id, null, templateId, req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="MarkSheet_${studentId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating Mark Sheet PDF" });
    }
  },

  // Duplicated generateGeneralCertificate method removed.

  async generateTimetable(req, res) {
    try {
      const { classId } = req.params;
      const userId = req.user?.user_id || null;
      const pdfBuffer = await DocumentService.generateTimetable(classId, userId, null, req.instituteId);

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

      // Access control: Teachers (roles 3, 4, 5) are completely forbidden from monthly attendance reports
      const isTeacher = [3, 4, 5].includes(Number(role_id));
      if (isTeacher) {
        return res.status(403).json({ success: false, message: "Forbidden: Monthly Attendance Reports are accessible only to Admins and Master Admins." });
      }

      // Access control: other staff roles
      if ([15, 16].includes(role_id)) {
        const staffRes = await pool.query(
          `SELECT class_id FROM class WHERE staff_id = (SELECT staff_id FROM staff WHERE user_id = $1 LIMIT 1) LIMIT 1`,
          [user_id]
        );
        const assignedClassId = staffRes.rows[0]?.class_id;
        
        if (!assignedClassId || parseInt(assignedClassId) !== parseInt(classId)) {
          return res.status(403).json({ success: false, message: "Unauthorized: You can only access your own class report" });
        }
      }

      const pdfBuffer = await DocumentService.generateMonthlyAttendancePDF(classId, month, year, user_id, req.instituteId);

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
  },

  async generateBulkMarkSheets(req, res) {
    try {
      const { studentIds, templateId } = req.body;
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
          `SELECT COUNT(*) FROM student s
           JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.student_id = ANY($1) AND ce.class_id != $2`,
          [studentIds, assignedClassId]
        );
        
        if (parseInt(countRes.rows[0].count) > 0) {
          return res.status(403).json({ success: false, message: "Unauthorized: One or more students are not in your class" });
        }
      }

      const pdfBuffer = await DocumentService.generateBulkMarkSheets(studentIds, user_id, templateId, req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bulk_Mark_Sheets.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating bulk Mark Sheets PDF" });
    }
  },

  async generateBulkFeeReceipts(req, res) {
    try {
      const { studentIds, templateId } = req.body;
      const { user_id } = req.user;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: "No student IDs provided" });
      }

      const pdfBuffer = await DocumentService.generateBulkFeeReceipts(studentIds, user_id, templateId, req.instituteId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Bulk_Fee_Receipts.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      if (err.message === "NO_PAYMENTS_FOUND") {
        return res.status(404).json({ success: false, message: "No payment records found for the selected students." });
      }
      console.error(err);
      res.status(500).json({ success: false, message: "Error generating bulk Fee Receipts PDF" });
    }
  }
};
