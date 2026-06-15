import { AttendanceService } from "../services/attendance_Service.js";
import { StudentService } from "../services/student_Service.js";
import pool from "../config/db.js";

export const AttendanceController = {

  async getDashboard(req, res) {
    try {
      const { date } = req.query;
      const { user_id, role_id } = req.user;
      const isTeacher = [3, 4, 5].includes(Number(role_id));

      let data;
      if (isTeacher) {
        data = await AttendanceService.getTeacherDashboard(date, user_id, req.instituteId);
      } else {
        data = await AttendanceService.getDashboard(date, req.instituteId);
      }
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async checkSession(req, res) {
    try {
      const { class_id, subject_id } = req.query;
      const { user_id, role_id } = req.user;
      const isTeacher = [3, 4, 5].includes(Number(role_id));

      // Verify class belongs to institute
      const classRes = await pool.query('SELECT institute_id FROM class WHERE class_id = $1', [Number(class_id)]);
      if (classRes.rows.length === 0 || classRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access to this school's class is denied." });
      }

      if (isTeacher) {
        const isScheduled = await AttendanceService.verifyTeacherSchedule(user_id, Number(class_id), Number(subject_id));
        if (!isScheduled) {
          return res.status(403).json({ success: false, message: "Forbidden: You are not scheduled to teach this class/subject." });
        }
      }

      const params = { ...req.query, institute_id: req.instituteId };
      const data = await AttendanceService.checkSession(params);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createSession(req, res) {
    try {
      const { class_id, subject_id, attendance_date } = req.body;
      const { user_id, role_id } = req.user;
      const isTeacher = [3, 4, 5].includes(Number(role_id));

      // Verify class belongs to institute
      const classRes = await pool.query('SELECT institute_id FROM class WHERE class_id = $1', [Number(class_id)]);
      if (classRes.rows.length === 0 || classRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access to this school's class is denied." });
      }

      if (isTeacher) {
        // Enforce same-day creation policy for teachers
        const todayStr = new Date().toLocaleDateString('en-CA');
        if (attendance_date && attendance_date !== todayStr) {
          return res.status(403).json({ success: false, message: "Forbidden: Teachers are not permitted to record attendance for previous days." });
        }

        const isScheduled = await AttendanceService.verifyTeacherSchedule(user_id, Number(class_id), Number(subject_id));
        if (!isScheduled) {
          return res.status(403).json({ success: false, message: "Forbidden: You are not scheduled to teach this class/subject." });
        }
      }

      const sessionData = { ...req.body, institute_id: req.instituteId };
      const data = await AttendanceService.createSession(sessionData, req.instituteId);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createRecords(req, res) {
    try {
      const { session_id, sessionId } = req.body;
      const finalSessionId = session_id || sessionId;
      const { user_id, role_id } = req.user;
      const isTeacher = [3, 4, 5].includes(Number(role_id));

      // Verify session belongs to institute
      const sessionRes = await pool.query('SELECT attendance_date, institute_id FROM attendance_session WHERE session_id = $1', [Number(finalSessionId)]);
      if (sessionRes.rows.length === 0 || sessionRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access to this school's session is denied." });
      }

      const sessionDate = sessionRes.rows[0]?.attendance_date;

      if (isTeacher) {
        // Enforce same-day policy for teachers
        if (sessionDate) {
          const todayStr = new Date().toLocaleDateString('en-CA');
          const formattedSessionDate = new Date(sessionDate).toLocaleDateString('en-CA');
          if (formattedSessionDate !== todayStr) {
            return res.status(403).json({ success: false, message: "Forbidden: Teachers are not permitted to record attendance for previous days." });
          }
        }

        const isAuthorized = await AttendanceService.verifyTeacherSession(user_id, Number(finalSessionId));
        if (!isAuthorized) {
          return res.status(403).json({ success: false, message: "Forbidden: You are not scheduled to record attendance for this session." });
        }
      }

      const data = await AttendanceService.createRecords(req.body);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              req.user.user_id,
              'attendance_marked',
              `Attendance marked for Session ID: ${finalSessionId}`,
              req.instituteId
          );
      } catch (e) { console.error(e); }

      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getStudents(req, res) {
    try {
      const { classId } = req.query;
      const { user_id, role_id } = req.user;
      const isTeacher = [3, 4, 5].includes(Number(role_id));

      // Verify class belongs to institute
      const classRes = await pool.query('SELECT institute_id FROM class WHERE class_id = $1', [Number(classId)]);
      if (classRes.rows.length === 0 || classRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access to this school's class is denied." });
      }

      if (isTeacher) {
        const isAuthorized = await AttendanceService.verifyTeacherClass(user_id, Number(classId));
        if (!isAuthorized) {
          return res.status(403).json({ success: false, message: "Forbidden: You do not teach this class." });
        }
      }

      const data = await AttendanceService.getStudentsByClass(classId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getSummary(req, res) {
    try {
      const { session_id, sessionId } = req.query;
      const finalSessionId = session_id || sessionId;
      const { user_id, role_id } = req.user;
      const isTeacher = [3, 4, 5].includes(Number(role_id));

      // Verify session belongs to institute
      const sessionRes = await pool.query('SELECT institute_id FROM attendance_session WHERE session_id = $1', [Number(finalSessionId)]);
      if (sessionRes.rows.length === 0 || sessionRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access to this school's session is denied." });
      }

      if (isTeacher) {
        const isAuthorized = await AttendanceService.verifyTeacherSession(user_id, Number(finalSessionId));
        if (!isAuthorized) {
          return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to view this session's summary." });
        }
      }

      const data = await AttendanceService.getAttendanceSummary(finalSessionId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateRecord(req, res) {
    try {
      const { session_id, sessionId } = req.body;
      const finalSessionId = session_id || sessionId;
      const { user_id, role_id } = req.user;
      const isTeacher = [3, 4, 5].includes(Number(role_id));

      // Verify session belongs to institute
      const sessionRes = await pool.query('SELECT attendance_date, institute_id FROM attendance_session WHERE session_id = $1', [Number(finalSessionId)]);
      if (sessionRes.rows.length === 0 || sessionRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access to this school's session is denied." });
      }

      const sessionDate = sessionRes.rows[0]?.attendance_date;

      if (isTeacher) {
        // Enforce same-day policy for teachers
        if (sessionDate) {
          const todayStr = new Date().toLocaleDateString('en-CA');
          const formattedSessionDate = new Date(sessionDate).toLocaleDateString('en-CA');
          if (formattedSessionDate !== todayStr) {
            return res.status(403).json({ success: false, message: "Forbidden: Teachers are not permitted to modify attendance records for previous days." });
          }
        }

        const isAuthorized = await AttendanceService.verifyTeacherSession(user_id, Number(finalSessionId));
        if (!isAuthorized) {
          return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to update this session's records." });
        }
      }

      const data = await AttendanceService.updateRecord(req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getStudentHistory(req, res) {
    try {
      const { studentId } = req.params;
      const { date } = req.query;

      // Verify student belongs to institute
      const studentRes = await pool.query(
        'SELECT u.institute_id FROM student s JOIN "user" u ON s.student_user_id = u.user_id WHERE s.student_id = $1',
        [Number(studentId)]
      );
      if (studentRes.rows.length === 0 || studentRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Student does not belong to this school." });
      }
      
      let data;
      if (date) {
        data = await AttendanceService.getStudentDailyAttendanceWithSchedule(studentId, date);
      } else {
        data = await AttendanceService.getStudentHistory(studentId);
      }
      
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getMyHistory(req, res) {
    try {
      const { user_id, role_id } = req.user;
      if (role_id !== 18) {
        return res.status(403).json({ success: false, message: "Only students can access this" });
      }

      // 1. Get student_id from user_id (implicitly verified to be in correct school since they are logged in)
      const student = await StudentService.getStudentByUserId(user_id);
      if (!student) {
        return res.status(404).json({ success: false, message: "Student record not found" });
      }

      // 2. Wrap existing history logic
      const data = await AttendanceService.getStudentHistory(student.student_id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error("getMyHistory Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getMonthlyReport(req, res) {
    try {
      const { classId, month, year } = req.query;
      const { user_id, role_id } = req.user;

      // Verify class belongs to institute
      const classRes = await pool.query('SELECT institute_id FROM class WHERE class_id = $1', [Number(classId)]);
      if (classRes.rows.length === 0 || classRes.rows[0].institute_id !== req.instituteId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access to this school's class is denied." });
      }

      // Access control: Teachers (roles 3, 4, 5) are completely forbidden from monthly attendance reports
      const isTeacher = [3, 4, 5].includes(Number(role_id));
      if (isTeacher) {
        return res.status(403).json({ success: false, message: "Forbidden: Monthly Attendance Reports are accessible only to Admins and Master Admins." });
      }

      // Access control for other staff / management roles
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

      const data = await AttendanceService.getMonthlyReport(classId, month, year, req.instituteId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error("getMonthlyReport Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

};
