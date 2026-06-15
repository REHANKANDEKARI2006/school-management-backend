import pool from "../config/db.js";
import { computeStatus } from "../utils/computeStatus.js";

// Helper to calculate letter grade based on percentage
async function computeLetterGrade(percentage, classId) {
  try {
    const { rows } = await pool.query(
      `SELECT grade_label 
       FROM grade_boundary 
       WHERE class_id = $1 AND $2 >= min_score AND $2 <= max_score 
       LIMIT 1`,
      [classId, percentage]
    );
    if (rows.length > 0) {
      return rows[0].grade_label;
    }
  } catch (err) {
    console.error("Failed to query grade boundaries:", err);
  }

  // Fallback defaults
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 35) return 'D';
  return 'Fail';
}

const ResultsController = {
  // 1. Faculty portal - My Results list
  async getFacultyAssignedExams(req, res) {
    try {
      const user_id = req.user.user_id;

      // Get staff_id
      const staffRes = await pool.query("SELECT staff_id FROM staff WHERE user_id = $1", [user_id]);
      if (staffRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Faculty profile not found" });
      }
      const staffId = staffRes.rows[0].staff_id;

      // Query exams matching their schedule class + subject assignments
      const { rows } = await pool.query(
        `SELECT DISTINCT
           e.exam_id,
           e.exam_name,
           e.date_time,
           e.duration_mins,
           e.total_score,
           e.min_marks,
           e.max_marks,
           e.class_id,
           e.subject_id,
           e.exam_type_id,
           e.exam_status_id,
           e.marks_status,
           et.exam_type_name,
           c.class_name,
           s.section_name,
           sub.subject_name,
           es.exam_status_name
         FROM exam e
         JOIN schedule sch ON sch.class_id = e.class_id AND sch.subject_id = e.subject_id
         LEFT JOIN exam_type et ON et.exam_type_id = e.exam_type_id
         LEFT JOIN class c ON c.class_id = e.class_id
         LEFT JOIN section s ON s.section_id = c.section_id
         LEFT JOIN subject sub ON sub.subject_id = e.subject_id
         LEFT JOIN exam_status es ON es.exam_status_id = e.exam_status_id
         WHERE sch.staff_id = $1 AND e.is_deleted = false
         ORDER BY e.date_time DESC`,
        [staffId]
      );

      // Filter to only completed exams
      const completedExams = rows
        .map(exam => ({
          ...exam,
          computed_status: computeStatus(exam)
        }))
        .filter(exam => exam.computed_status === 'completed' || exam.exam_status_name === 'Completed');

      res.json({ success: true, data: completedExams });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 2. Admin dashboard - Subject entry completion list
  async getResultsTracking(req, res) {
    try {
      const { class_name, exam_name } = req.query;

      let query = `
        SELECT 
          e.exam_id,
          e.exam_name,
          e.class_id,
          e.subject_id,
          e.date_time,
          e.total_score,
          e.marks_status,
          e.exam_status_id,
          c.class_name,
          s.section_name,
          sub.subject_name,
          (
            SELECT CONCAT(st.staff_first_name, ' ', st.staff_last_name)
            FROM schedule sch
            JOIN staff st ON st.staff_id = sch.staff_id
            WHERE sch.class_id = e.class_id AND sch.subject_id = e.subject_id
            LIMIT 1
          ) AS teacher_name,
          es.exam_status_name
        FROM exam e
        LEFT JOIN class c ON c.class_id = e.class_id
        LEFT JOIN section s ON s.section_id = c.section_id
        LEFT JOIN subject sub ON sub.subject_id = e.subject_id
        LEFT JOIN exam_status es ON es.exam_status_id = e.exam_status_id
        WHERE e.is_deleted = false AND e.institute_id = $1
      `;

      const values = [req.instituteId];
      if (class_name && class_name !== 'all') {
        query += ` AND c.class_name = $${values.length + 1}`;
        values.push(class_name);
      }
      if (exam_name && exam_name !== 'all') {
        query += ` AND LOWER(e.exam_name) = LOWER($${values.length + 1})`;
        values.push(exam_name);
      }

      query += ` ORDER BY c.class_name, sub.subject_name`;

      const { rows } = await pool.query(query, values);

      // Enrich with computed status
      const completedExams = rows
        .map(exam => ({
          ...exam,
          computed_status: computeStatus(exam)
        }))
        .filter(exam => exam.computed_status === 'completed' || exam.exam_status_name === 'Completed');

      // Fetch overall results status (Generated / Published / None)
      let overallStatus = 'None';
      if (class_name && class_name !== 'all' && exam_name && exam_name !== 'all') {
        const resultCheck = await pool.query(
          `SELECT result_status 
           FROM student_results sr
           JOIN class c ON c.class_id = sr.class_id
           WHERE c.class_name = $1 AND LOWER(sr.exam_name) = LOWER($2) AND c.institute_id = $3
           LIMIT 1`,
          [class_name, exam_name, req.instituteId]
        );
        if (resultCheck.rows.length > 0) {
          overallStatus = resultCheck.rows[0].result_status;
        }
      }

      res.json({ success: true, data: completedExams, overallStatus });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 3. Admin override - Unlock exam marks
  async unlockExamMarks(req, res) {
    try {
      const { exam_id } = req.params;
      
      const { rowCount } = await pool.query(
        `UPDATE exam 
         SET marks_status = 'Draft', updated_at = now() 
         WHERE exam_id = $1 AND is_deleted = false AND institute_id = $2`,
        [exam_id, req.instituteId]
      );

      if (rowCount === 0) {
        return res.status(404).json({ success: false, message: "Exam not found" });
      }

      // Log activity
      try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
          req.user.user_id,
          'marks_unlocked',
          `Marks unlocked for exam ID: ${exam_id}`,
          req.instituteId
        );
      } catch (e) { console.error(e); }

      res.json({ success: true, message: "Marks entry successfully unlocked" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 4. Admin - Generate results summaries
  async generateResults(req, res) {
    const client = await pool.connect();
    try {
      const { class_name, exam_name } = req.body;

      if (!class_name || !exam_name) {
        return res.status(400).json({ success: false, message: "class_name and exam_name are required" });
      }

      // Find matching classes for this standard name
      const classRes = await client.query("SELECT class_id FROM class WHERE class_name = $1 AND institute_id = $2", [class_name, req.instituteId]);
      if (classRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: `No classes found for standard ${class_name}` });
      }
      const classIds = classRes.rows.map(r => r.class_id);

      // Find all exams matching these classes and exam name
      const examRes = await client.query(
        `SELECT exam_id, class_id, total_score, marks_status 
         FROM exam 
         WHERE class_id = ANY($1) AND LOWER(exam_name) = LOWER($2) AND is_deleted = false AND institute_id = $3`,
        [classIds, exam_name, req.instituteId]
      );

      if (examRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "No exams found matching the criteria" });
      }

      // Check if all exams are submitted
      const allSubmitted = examRes.rows.every(e => e.marks_status === 'Submitted');
      if (!allSubmitted) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot generate results. Marks entry for some subjects has not been locked/submitted by teachers." 
        });
      }

      const examIds = examRes.rows.map(e => e.exam_id);

      // Find all enrolled students in these classes
      const studentRes = await client.query(
        `SELECT DISTINCT s.student_id, ce.class_id
         FROM student s
         JOIN class_enrollment ce ON ce.student_id = s.student_id
         WHERE ce.class_id = ANY($1) AND ce.status_id = 1 AND s.is_deleted = false`,
        [classIds]
      );

      if (studentRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "No enrolled students found in this standard" });
      }

      await client.query("BEGIN");

      // Generate result summary for each student
      for (const student of studentRes.rows) {
        const { student_id, class_id } = student;

        // Fetch obtained marks
        const gradesRes = await client.query(
          `SELECT eg.marks_obtained, e.total_score
           FROM exam_grades eg
           JOIN exam e ON e.exam_id = eg.exam_id
           WHERE eg.student_id = $1 AND e.exam_id = ANY($2)`,
          [student_id, examIds]
        );

        // Compute total obtained and total max marks
        let totalObtained = 0;
        let totalMax = 0;

        gradesRes.rows.forEach(g => {
          totalObtained += g.marks_obtained || 0;
          totalMax += g.total_score || 0;
        });

        // Safe division
        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const letterGrade = await computeLetterGrade(percentage, class_id);

        // Upsert summary
        await client.query(
          `INSERT INTO student_results (student_id, class_id, exam_name, total_obtained, total_max, percentage, grade, result_status, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Generated', now())
           ON CONFLICT (student_id, exam_name)
           DO UPDATE SET 
             total_obtained = EXCLUDED.total_obtained,
             total_max = EXCLUDED.total_max,
             percentage = EXCLUDED.percentage,
             grade = EXCLUDED.grade,
             result_status = 'Generated',
             updated_at = now()`,
          [student_id, class_id, exam_name, totalObtained, totalMax, percentage, letterGrade]
        );
      }

      await client.query("COMMIT");

      // Log activity
      try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
          req.user.user_id,
          'results_generated',
          `Results generated for standard ${class_name} - ${exam_name}`,
          req.instituteId
        );
      } catch (e) { console.error(e); }

      res.json({ success: true, message: "Results summaries generated successfully." });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ success: false, message: err.message });
    } finally {
      client.release();
    }
  },

  // 5. Admin - Publish results to students/parents
  async publishResults(req, res) {
    try {
      const { class_name, exam_name } = req.body;

      if (!class_name || !exam_name) {
        return res.status(400).json({ success: false, message: "class_name and exam_name are required" });
      }

      // Find matching class IDs
      const classRes = await pool.query("SELECT class_id FROM class WHERE class_name = $1 AND institute_id = $2", [class_name, req.instituteId]);
      if (classRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: `No classes found for standard ${class_name}` });
      }
      const classIds = classRes.rows.map(r => r.class_id);

      // Publish results
      const { rowCount } = await pool.query(
        `UPDATE student_results
         SET result_status = 'Published', updated_at = now()
         WHERE class_id = ANY($1) AND LOWER(exam_name) = LOWER($2)`,
        [classIds, exam_name]
      );

      if (rowCount === 0) {
        return res.status(400).json({ success: false, message: "No generated results found to publish. Please click Generate first." });
      }

      // Log activity
      try {
        const { DashboardService } = await import("../services/dashboard_service.js");
        await DashboardService.addActivityEntry(
          req.user.user_id,
          'results_published',
          `Results published for standard ${class_name} - ${exam_name}`,
          req.instituteId
        );
      } catch (e) { console.error(e); }

      res.json({ success: true, message: `Successfully published ${rowCount} student results.` });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 6. Student/Parent portal - View published results
  async getMyResults(req, res) {
    try {
      const { user_id, role_id } = req.user;

      let studentIds = [];

      if (role_id === 18) { // Student
        const stuRes = await pool.query("SELECT student_id FROM student WHERE student_user_id = $1 AND is_deleted = false", [user_id]);
        if (stuRes.rows.length > 0) {
          studentIds.push(stuRes.rows[0].student_id);
        }
      } else if (role_id === 20) { // Parent/Guardian
        const grdRes = await pool.query("SELECT student_id FROM guardian WHERE guardian_user_id = $1", [user_id]);
        studentIds = grdRes.rows.map(r => r.student_id);
      } else {
        return res.status(403).json({ success: false, message: "Unauthorized role for results access." });
      }

      if (studentIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const results = [];

      for (const studentId of studentIds) {
        // Fetch student name & class info
        const studentInfoRes = await pool.query(
          `SELECT s.stu_first_name, s.stu_last_name, c.class_name, sec.section_name
           FROM student s
           LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           LEFT JOIN class c ON c.class_id = ce.class_id
           LEFT JOIN section sec ON sec.section_id = c.section_id
           WHERE s.student_id = $1`,
          [studentId]
        );

        if (studentInfoRes.rows.length === 0) continue;
        const sInfo = studentInfoRes.rows[0];

        // Fetch published results summaries
        const summariesRes = await pool.query(
          `SELECT result_id, exam_name, total_obtained, total_max, percentage, grade, result_status
           FROM student_results
           WHERE student_id = $1 AND result_status = 'Published'
           ORDER BY created_at DESC`,
          [studentId]
        );

        const summaries = [];

        for (const r of summariesRes.rows) {
          // Fetch subject wise detail for this exam
          const detailsRes = await pool.query(
            `SELECT 
               sub.subject_name,
               eg.marks_obtained,
               e.total_score as subject_max,
               eg.grade as subject_grade
             FROM exam e
             JOIN class_enrollment ce ON ce.class_id = e.class_id AND ce.status_id = 1
             LEFT JOIN exam_grades eg ON eg.exam_id = e.exam_id AND eg.student_id = ce.student_id
             LEFT JOIN subject sub ON sub.subject_id = e.subject_id
             WHERE ce.student_id = $1 AND LOWER(e.exam_name) = LOWER($2) AND e.is_deleted = false
             ORDER BY sub.subject_name`,
            [studentId, r.exam_name]
          );

          summaries.push({
            ...r,
            subjects: detailsRes.rows
          });
        }

        results.push({
          student_id: studentId,
          student_name: `${sInfo.stu_first_name} ${sInfo.stu_last_name}`,
          class_name: sInfo.class_name,
          section_name: sInfo.section_name,
          reports: summaries
        });
      }

      res.json({ success: true, data: results });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 7. Admin - Preview generated results before publishing
  async previewResults(req, res) {
    try {
      const { class_name, exam_name } = req.query;

      if (!class_name || !exam_name) {
        return res.status(400).json({ success: false, message: "class_name and exam_name are required" });
      }

      const { rows } = await pool.query(
        `SELECT 
           sr.result_id,
           sr.student_id,
           CONCAT(s.stu_first_name, ' ', s.stu_last_name) AS student_name,
           c.class_name,
           sec.section_name,
           sr.total_obtained,
           sr.total_max,
           sr.percentage,
           sr.grade,
           sr.result_status
         FROM student_results sr
         JOIN student s ON s.student_id = sr.student_id
         JOIN class c ON c.class_id = sr.class_id
         LEFT JOIN section sec ON sec.section_id = c.section_id
         WHERE c.class_name = $1 AND LOWER(sr.exam_name) = LOWER($2) AND c.institute_id = $3
         ORDER BY student_name`,
        [class_name, exam_name, req.instituteId]
      );

      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  // 8. Student/Parent/Admin - Download marksheet PDF for a specific exam
  async generateExamMarksheet(req, res) {
    try {
      const { student_id, exam_name } = req.params;
      const { user_id, role_id } = req.user;

      if (!student_id || !exam_name) {
        return res.status(400).json({ success: false, message: "student_id and exam_name are required" });
      }

      // For students: ensure they can only download their own marksheet
      if (role_id === 18) {
        const stuRes = await pool.query(
          "SELECT student_id FROM student WHERE student_user_id = $1 AND is_deleted = false",
          [user_id]
        );
        if (stuRes.rows.length === 0 || String(stuRes.rows[0].student_id) !== String(student_id)) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      // For parents: ensure the student belongs to them
      if (role_id === 20) {
        const grdRes = await pool.query(
          "SELECT student_id FROM guardian WHERE guardian_user_id = $1 AND student_id = $2",
          [user_id, student_id]
        );
        if (grdRes.rows.length === 0) {
          return res.status(403).json({ success: false, message: "Unauthorized" });
        }
      }

      // For teachers/admins: ensure the student belongs to the admin's active institute
      if ([1, 2, 3, 4, 5, 21].includes(role_id)) {
        const studentCheck = await pool.query(
          `SELECT s.student_id FROM student s
           JOIN "user" u ON u.user_id = s.student_user_id
           WHERE s.student_id = $1 AND u.institute_id = $2 AND s.is_deleted = false`,
          [student_id, req.instituteId]
        );
        if (studentCheck.rows.length === 0) {
          return res.status(403).json({ success: false, message: "Unauthorized: Student does not belong to your school" });
        }
      }

      // Verify the result is published (for student/parent portal)
      if (role_id === 18 || role_id === 20) {
        const resultCheck = await pool.query(
          "SELECT result_status FROM student_results WHERE student_id = $1 AND LOWER(exam_name) = LOWER($2) LIMIT 1",
          [student_id, decodeURIComponent(exam_name)]
        );
        if (resultCheck.rows.length === 0 || resultCheck.rows[0].result_status !== 'Published') {
          return res.status(404).json({ success: false, message: "Results not published yet." });
        }
      }

      const { DocumentService } = await import("../services/document_service.js");
      const pdfBuffer = await DocumentService.generateMarksheetForExam(
        student_id,
        decodeURIComponent(exam_name),
        user_id,
        null,
        req.instituteId
      );

      const safeExamName = decodeURIComponent(exam_name).replace(/[^a-zA-Z0-9_\-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Marksheet_${student_id}_${safeExamName}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error("[ResultsController] generateExamMarksheet error:", err);
      res.status(500).json({ success: false, message: err.message || "Error generating marksheet PDF" });
    }
  }
};

export default ResultsController;
