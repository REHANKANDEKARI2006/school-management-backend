import pool from '../config/db.js';

class DashboardServiceClass {
  async getAdminSummary(instituteId) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const [
      stats,
      genderRatio,
      attendanceStats,
      financeStats,
      events,
      announcements,
      todayTimetable,
      recentActivity,
      staffAttendance
    ] = await Promise.all([
      this.getZone1Stats(today, monthStartStr, instituteId),
      this.getGenderRatio(instituteId),
      this.getAttendanceSummary(today, instituteId),
      this.getFinanceStats(instituteId),
      this.getEvents(instituteId),
      this.getAnnouncements(instituteId),
      this.getTodayTimetable(instituteId),
      this.getRecentActivity(null, instituteId),
      this.getStaffAttendance(today, instituteId)
    ]);

    return {
      stats,
      genderRatio,
      attendanceStats,
      financeStats,
      events,
      announcements,
      todayTimetable,
      recentActivity,
      staffAttendance
    };
  }

  async getTeacherSummary(staffId, userId, instituteId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      stats,
      myClasses,
      recentAttendance,
      pendingMarks,
      assignments,
      attendanceAlerts,
      recentActivity,
      upcoming,
      announcements,
      classTeacherOf,
      eventDuty
    ] = await Promise.all([
      this.getTeacherStats(staffId),
      this.getTeacherClasses(staffId),
      this.getTeacherRecentAttendance(staffId),
      this.getTeacherPendingMarks(staffId),
      this.getTeacherAssignments(staffId),
      this.getTeacherAttendanceAlerts(staffId),
      this.getRecentActivity(userId, instituteId),
      this.getTeacherUpcoming(staffId, instituteId),
      this.getAnnouncements(instituteId),
      this.getClassTeacherDesignation(staffId),
      this.getTeacherEventDuty(staffId)
    ]);

    return {
      stats,
      myClasses,
      recentAttendance,
      pendingMarks,
      assignments,
      attendanceAlerts,
      recentActivity,
      upcoming,
      announcements,
      classTeacherOf,
      eventDuty
    };
  }

  async getTeacherStats(staffId) {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Today's Classes
    const classesTodayRes = await pool.query(`
      SELECT COUNT(*) FROM schedule 
      WHERE staff_id = $1 
      AND day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)
    `, [staffId]);

    // 2. Attendance Pending
    // We count slots today where no attendance session has been created yet
    const attendancePendingRes = await pool.query(`
      SELECT COUNT(*) FROM schedule s
      WHERE s.staff_id = $1 
      AND s.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)
      AND NOT EXISTS (
        SELECT 1 FROM attendance_session ats 
        WHERE ats.class_id = s.class_id 
        AND ats.subject_id = s.subject_id
        AND ats.attendance_date = CURRENT_DATE
      )
    `, [staffId]);

    // 3. Marks Pending
    const marksPendingRes = await pool.query(`
      SELECT COUNT(DISTINCT e.exam_id) FROM exam e 
      JOIN schedule s ON s.class_id = e.class_id AND s.subject_id = e.subject_id
      WHERE s.staff_id = $1 
      AND e.date_time < NOW()
      AND NOT EXISTS (SELECT 1 FROM exam_grades eg WHERE eg.exam_id = e.exam_id)
    `, [staffId]);

    // 4. Next Exam
    const nextExamRes = await pool.query(`
      SELECT e.exam_name as name, e.date_time as date 
      FROM exam e 
      JOIN schedule s ON s.class_id = e.class_id AND s.subject_id = e.subject_id
      WHERE s.staff_id = $1 
      AND e.date_time > NOW() 
      ORDER BY e.date_time ASC 
      LIMIT 1
    `, [staffId]);

    return {
      totalClassesToday: parseInt(classesTodayRes.rows[0].count),
      attendancePending: parseInt(attendancePendingRes.rows[0].count),
      marksPending: parseInt(marksPendingRes.rows[0].count),
      nextExam: nextExamRes.rows[0] || null
    };
  }

  async getTeacherClasses(staffId) {
    const res = await pool.query(`
      SELECT DISTINCT 
          c.class_name, 
          sec.section_name, 
          sub.subject_name,
          (SELECT COUNT(*) FROM class_enrollment ce WHERE ce.class_id = c.class_id) as student_count,
          c.class_id
      FROM schedule s
      JOIN class c ON c.class_id = s.class_id
      JOIN section sec ON sec.section_id = c.section_id
      JOIN subject sub ON sub.subject_id = s.subject_id
      WHERE s.staff_id = $1
    `, [staffId]);
    return res.rows;
  }

  async getTeacherRecentAttendance(staffId) {
    const res = await pool.query(`
      SELECT 
          c.class_name, 
          ats.attendance_date as date, 
          COUNT(ar.record_id) FILTER (WHERE ar.status_id = 1) as present,
          COUNT(ar.record_id) FILTER (WHERE ar.status_id = 2) as absent
      FROM attendance_session ats
      JOIN class c ON c.class_id = ats.class_id
      LEFT JOIN attendance_record ar ON ar.session_id = ats.session_id
      WHERE ats.faculty_id = $1 
      GROUP BY ats.session_id, c.class_name, ats.attendance_date
      ORDER BY ats.attendance_date DESC
      LIMIT 5
    `, [staffId]);
    return res.rows;
  }

  async getTeacherPendingMarks(staffId) {
    const res = await pool.query(`
      SELECT 
          e.exam_name, 
          c.class_name, 
          sub.subject_name,
          e.date_time as date
      FROM exam e
      JOIN class c ON c.class_id = e.class_id
      JOIN subject sub ON sub.subject_id = e.subject_id
      JOIN schedule s ON s.class_id = e.class_id AND s.subject_id = e.subject_id
      WHERE s.staff_id = $1 AND e.date_time < NOW()
      AND NOT EXISTS (SELECT 1 FROM exam_grades eg WHERE eg.exam_id = e.exam_id)
      LIMIT 5
    `, [staffId]);
    return res.rows;
  }

  async getTeacherAssignments(staffId) {
    // We link assignments via teacher's subject and classes they teach
    const res = await pool.query(`
      SELECT 
          m.material_name as title,
          sub.subject_name as subject,
          c.class_name as class,
          m.upload_date as due_date,
          (SELECT COUNT(*) FROM student_submissions ss WHERE ss.material_id = m.material_id) as submitted_count,
          (SELECT COUNT(*) FROM class_enrollment ce WHERE ce.class_id = m.class_id) as total_students
      FROM materials m
      JOIN subject sub ON sub.subject_id = m.subject_id
      JOIN class c ON c.class_id = m.class_id
      JOIN schedule s ON s.class_id = m.class_id AND s.subject_id = m.subject_id
      WHERE s.staff_id = $1
      ORDER BY m.upload_date DESC
      LIMIT 5
    `, [staffId]);
    return res.rows;
  }

  async getTeacherAttendanceAlerts(staffId) {
    const res = await pool.query(`
      WITH student_stats AS (
          SELECT 
              st.stu_first_name || ' ' || st.stu_last_name as name,
              c.class_name,
              COUNT(ar.record_id) as total_days,
              COUNT(ar.record_id) FILTER (WHERE ar.status_id = 1) as present_days
          FROM student st
          JOIN class_enrollment ce ON ce.student_id = st.student_id
          JOIN class c ON c.class_id = ce.class_id
          JOIN schedule s ON s.class_id = c.class_id
          JOIN attendance_record ar ON ar.student_id = st.student_id
          WHERE s.staff_id = $1
          GROUP BY st.student_id, st.stu_first_name, st.stu_last_name, c.class_name
      )
      SELECT name, class_name as class, ROUND((present_days * 100.0 / NULLIF(total_days, 0)), 1) as percentage
      FROM student_stats
      WHERE total_days > 0 AND (present_days * 100.0 / total_days) < 75
      ORDER BY percentage ASC
      LIMIT 10
    `, [staffId]);
    return res.rows;
  }

  async getTeacherUpcoming(staffId, instituteId) {
    const holidayService = (await import('./holiday_service.js')).HolidayService;
    const currentYear = new Date().getFullYear();
    const holidays = await holidayService.getHolidays(currentYear, instituteId);

    const res = await pool.query(`
      (SELECT CONCAT('event_', event_id) as id, event_name as title, event_date as time, 'event' as category
       FROM events
       WHERE event_date >= CURRENT_DATE
       LIMIT 10)
      UNION ALL
      (SELECT CONCAT('exam_', e.exam_id) as id, e.exam_name as title, e.date_time as time, 'exam' as category
       FROM exam e
       JOIN schedule s ON s.class_id = e.class_id AND s.subject_id = e.subject_id
       WHERE s.staff_id = $1 AND e.date_time >= NOW()
       GROUP BY e.exam_id, e.exam_name, e.date_time
       LIMIT 10)
      ORDER BY time ASC
      LIMIT 20
    `, [staffId]);

    const mappedHolidays = holidays.map(h => ({
      id: `h_${h.date}_${h.name}`,
      title: h.name,
      time: h.date,
      category: h.category // Preserve Maharashtra, Karnataka, National
    }));

    // Filter focus on future items
    const today = new Date().toISOString().split('T')[0];
    const combined = [...res.rows, ...mappedHolidays]
      .filter(item => item.time >= today)
      .sort((a, b) => new Date(a.time) - new Date(b.time))
      .slice(0, 10);

    return combined;
  }

  async getTeacherEventDuty(staffId) {
    try {
      const { default: EventsService } = await import('./events_services.js');
      return await EventsService.getCoordinatorDashboardEvents(staffId);
    } catch (e) {
      console.error("Failed to fetch teacher event duty:", e);
      return [];
    }
  }

  async getClassTeacherDesignation(staffId) {
    try {
      const res = await pool.query(`
        SELECT class_id, class_name, section_name 
        FROM class 
        WHERE staff_id = $1 
        LIMIT 1
      `, [staffId]);
      return res.rows[0] || null;
    } catch (e) {
      console.error("Failed to fetch class teacher designation:", e);
      return null;
    }
  }

  async getZone1Stats(today, monthStart, instituteId) {
    const queries = {
      totalStudents: `
        SELECT COUNT(*) FROM student s
        JOIN "user" u ON u.user_id = s.student_user_id
        WHERE u.institute_id = $1 AND s.is_deleted = FALSE
      `,
      newStudents: `
        SELECT COUNT(*) FROM student s
        JOIN "user" u ON u.user_id = s.student_user_id
        WHERE u.institute_id = $1 AND s.joined_date >= $2 AND s.is_deleted = FALSE
      `,
      totalTeachers: `
        SELECT COUNT(*) FROM staff s
        JOIN "user" u ON u.user_id = s.user_id
        WHERE u.institute_id = $1 AND s.role_id = 3 AND s.user_status_id = 1
      `,
      totalStaff: `
        SELECT COUNT(*) FROM staff s
        JOIN "user" u ON u.user_id = s.user_id
        WHERE u.institute_id = $1 AND s.role_id != 3 AND s.user_status_id = 1
      `,
      todayAttendance: `
        SELECT 
          COUNT(*) FILTER (WHERE ar.status_id = 1) as present,
          COUNT(*) as total
        FROM attendance_record ar
        JOIN attendance_session ats ON ats.session_id = ar.session_id
        JOIN staff st ON st.staff_id = ats.faculty_id
        JOIN "user" u ON u.user_id = st.user_id
        WHERE u.institute_id = $1 AND ats.attendance_date = $2 AND ar.student_id IS NOT NULL
      `,
      monthFees: `
        SELECT SUM(fc.amount_paid) FROM fee_collection fc
        JOIN student s ON s.student_id = fc.student_id
        JOIN "user" u ON u.user_id = s.student_user_id
        WHERE u.institute_id = $1 AND fc.payment_date >= $2
      `,
      pendingDues: `
        SELECT COUNT(DISTINCT s.student_id)
        FROM student s
        JOIN "user" u ON u.user_id = s.student_user_id
        JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
        JOIN fee_structure fs ON fs.class_id = ce.class_id
        LEFT JOIN (
            SELECT student_id, fee_struct_id, SUM(amount_paid) as total_paid
            FROM fee_collection
            GROUP BY student_id, fee_struct_id
        ) fc ON fc.student_id = s.student_id AND fc.fee_struct_id = fs.fee_struct_id
        WHERE u.institute_id = $1 AND COALESCE(fc.total_paid, 0) < fs.amount
      `,
      overdueStudents: `
        SELECT COUNT(DISTINCT s.student_id)
        FROM student s
        JOIN "user" u ON u.user_id = s.student_user_id
        JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
        JOIN fee_structure fs ON fs.class_id = ce.class_id
        LEFT JOIN (
            SELECT student_id, fee_struct_id, SUM(amount_paid) as total_paid
            FROM fee_collection
            GROUP BY student_id, fee_struct_id
        ) fc ON fc.student_id = s.student_id AND fc.fee_struct_id = fs.fee_struct_id
        WHERE u.institute_id = $1 AND COALESCE(fc.total_paid, 0) < fs.amount AND fs.due_date < CURRENT_DATE
      `
    };

    const results = await Promise.all([
      pool.query(queries.totalStudents, [instituteId]),
      pool.query(queries.newStudents, [instituteId, monthStart]),
      pool.query(queries.totalTeachers, [instituteId]),
      pool.query(queries.totalStaff, [instituteId]),
      pool.query(queries.todayAttendance, [instituteId, today]),
      pool.query(queries.monthFees, [instituteId, monthStart]),
      pool.query(queries.pendingDues, [instituteId]),
      pool.query(queries.overdueStudents, [instituteId])
    ]);

    return {
      students: {
        total: parseInt(results[0].rows[0].count),
        newThisMonth: parseInt(results[1].rows[0].count)
      },
      teachers: parseInt(results[2].rows[0].count),
      staff: parseInt(results[3].rows[0].count),
      attendance: {
        present: parseInt(results[4].rows[0].present || 0),
        total: parseInt(results[4].rows[0].total || 0)
      },
      feesMonth: parseFloat(results[5].rows[0].sum || 0),
      pendingDuesCount: parseInt(results[6].rows[0].count || 0),
      overdueStudentsCount: parseInt(results[7].rows[0].count || 0)
    };
  }

  async getGenderRatio(instituteId) {
    const res = await pool.query(`
      SELECT gender_id, COUNT(*) 
      FROM student s
      JOIN "user" u ON u.user_id = s.student_user_id
      WHERE u.institute_id = $1 AND s.is_deleted = FALSE
      GROUP BY gender_id
    `, [instituteId]);
    const genderMap = { 1: 0, 2: 0 }; // 1: Boy, 2: Girl
    res.rows.forEach(r => {
        if (r.gender_id === 1 || r.gender_id === 2) {
            genderMap[r.gender_id] = parseInt(r.count);
        }
    });

    return [
        { name: 'Boys', value: genderMap[1], fill: '#2563eb' },
        { name: 'Girls', value: genderMap[2], fill: '#f472b6' }
    ];
  }

  async getAttendanceSummary(today, instituteId) {
      // Small sparkline for last 7 days
      const res = await pool.query(`
        SELECT 
            ats.attendance_date as date,
            COUNT(*) FILTER (WHERE ar.status_id = 1) as present,
            COUNT(*) as total
        FROM attendance_record ar
        JOIN attendance_session ats ON ats.session_id = ar.session_id
        JOIN staff st ON st.staff_id = ats.faculty_id
        JOIN "user" u ON u.user_id = st.user_id
        WHERE u.institute_id = $1 
          AND ats.attendance_date > CURRENT_DATE - INTERVAL '7 days'
          AND ar.student_id IS NOT NULL
        GROUP BY ats.attendance_date
        ORDER BY ats.attendance_date ASC
      `, [instituteId]);
      return res.rows.map(r => ({
          name: r.date ? r.date.toISOString().split('T')[0] : today,
          present: parseInt(r.present),
          total: parseInt(r.total)
      }));
  }

  async getFinanceStats(instituteId) {
    // Return monthly fee collection for the last 6 months for the Bar Chart
    const res = await pool.query(`
      SELECT 
        TO_CHAR(fc.payment_date, 'Mon') as month,
        SUM(fc.amount_paid) as income,
        TO_CHAR(fc.payment_date, 'YYYYMM') as year_month
      FROM fee_collection fc
      JOIN student s ON s.student_id = fc.student_id
      JOIN "user" u ON u.user_id = s.student_user_id
      WHERE u.institute_id = $1 AND fc.payment_date > NOW() - INTERVAL '6 months'
      GROUP BY month, year_month
      ORDER BY year_month ASC
    `, [instituteId]);

    return res.rows.map(r => ({
        name: r.month,
        income: parseFloat(r.income || 0)
    }));
  }

  async getEvents(instituteId) {
    const holidayService = (await import('./holiday_service.js')).HolidayService;
    const currentYear = new Date().getFullYear();
    const holidays = await holidayService.getHolidays(currentYear, instituteId);

    const res = await pool.query(`
      (SELECT CONCAT('event_', event_id) as id, event_name as title, event_date as time, description, venue as location, 'event' as category
       FROM events
       WHERE event_date >= CURRENT_DATE - INTERVAL '1 month'
         AND event_date <= CURRENT_DATE + INTERVAL '12 months')
      UNION ALL
      (SELECT CONCAT('exam_', sub.exam_id) as id, sub.exam_name as title, sub.date_time as time, 'School Examination' as description, 'Exam Hall' as location, 'exam' as category
       FROM (
         SELECT DISTINCT ON (e.exam_name, e.date_time) e.exam_id, e.exam_name, e.date_time
         FROM exam e
         JOIN class c ON c.class_id = e.class_id
         JOIN staff st ON st.staff_id = c.staff_id
         JOIN "user" u ON u.user_id = st.user_id
         WHERE u.institute_id = $1
       ORDER BY e.exam_name, e.date_time, e.exam_id
       ) sub
       WHERE sub.date_time >= CURRENT_DATE - INTERVAL '1 month'
         AND sub.date_time <= CURRENT_DATE + INTERVAL '12 months')
      ORDER BY time ASC
      LIMIT 100
    `, [instituteId]);

    const mappedHolidays = holidays.map(h => ({
      id: `h_${h.date}_${h.name}`,
      title: h.name,
      time: h.date,
      description: h.description || '',
      location: 'School Campus',
      category: h.category // Preserve Maharashtra, Karnataka, National
    }));

    return [...res.rows, ...mappedHolidays].sort((a, b) => new Date(a.time) - new Date(b.time)).slice(0, 100);
  }

  async getAnnouncements(instituteId) {
    const { rows } = await pool.query(`
      SELECT notice_id as id, title, content as description, post_date as date
      FROM notices n
      JOIN "user" u ON u.user_id = n.author_id
      WHERE u.institute_id = $1
      ORDER BY post_date DESC
      LIMIT 5
    `, [instituteId]);
    return rows;
  }

  async getTodayTimetable(instituteId) {
      const res = await pool.query(`
        SELECT 
            s.start_time, 
            s.end_time, 
            s.period_number, 
            c.class_name, 
            sub.subject_name,
            COALESCE(st_sub.staff_first_name || ' ' || st_sub.staff_last_name, st.staff_first_name || ' ' || st.staff_last_name) as teacher_name,
            CASE WHEN sa.id IS NOT NULL THEN true ELSE false END as is_substitute
        FROM schedule s 
        JOIN staff st ON st.staff_id = s.staff_id
        JOIN "user" u ON u.user_id = st.user_id
        JOIN class c ON c.class_id = s.class_id 
        JOIN subject sub ON sub.subject_id = s.subject_id 
        LEFT JOIN substitute_assignments sa ON sa.class_id = s.class_id 
             AND sa.period_number = s.period_number 
             AND sa.assignment_date = CURRENT_DATE
             AND sa.status = 'accepted'
        LEFT JOIN staff st_sub ON st_sub.staff_id = sa.substitute_teacher_id
        WHERE u.institute_id = $1 
          AND s.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE) 
          AND s.is_break = false 
        ORDER BY s.start_time
      `, [instituteId]);
      return res.rows;
  }

  async getRecentActivity(userId, instituteId) {
      const res = await pool.query(`
        SELECT al.action_type, al.description, al.created_at as time
        FROM activity_log al
        JOIN "user" u ON u.user_id = al.user_id
        WHERE u.institute_id = $1
        ${userId ? 'AND al.user_id = $2' : ''}
        ORDER BY al.created_at DESC
        LIMIT 10
      `, userId ? [instituteId, userId] : [instituteId]);
      return res.rows;
  }

  async addActivityEntry(userId, actionType, description) {
    try {
      await pool.query(
        'INSERT INTO activity_log (user_id, action_type, description) VALUES ($1, $2, $3)',
        [userId, actionType, description]
      );
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  }

  async getStaffAttendance(today, instituteId) {
      const res = await pool.query(`
        SELECT 
            COUNT(*) FILTER (WHERE ar.status_id = 1) as present,
            COUNT(*) FILTER (WHERE ar.status_id = 2) as absent
        FROM attendance_record ar
        JOIN attendance_session ats ON ats.session_id = ar.session_id
        JOIN staff st ON st.staff_id = ar.staff_id
        JOIN "user" u ON u.user_id = st.user_id
        WHERE u.institute_id = $1 
          AND ats.attendance_date = $2 
          AND ar.staff_id IS NOT NULL
      `, [instituteId, today]);
      
      const absentNames = await pool.query(`
        SELECT s.staff_first_name, s.staff_last_name
        FROM attendance_record ar
        JOIN attendance_session ats ON ats.session_id = ar.session_id
        JOIN staff s ON s.staff_id = ar.staff_id
        JOIN "user" u ON u.user_id = s.user_id
        WHERE u.institute_id = $1 
          AND ats.attendance_date = $2 
          AND ar.status_id = 2
        UNION
        SELECT st.staff_first_name, st.staff_last_name
        FROM leave_applications sl
        JOIN staff st ON st.staff_id = sl.teacher_id
        JOIN "user" u ON u.user_id = st.user_id
        WHERE u.institute_id = $1 
          AND sl.status = 'approved' 
          AND sl.from_date <= $2 
          AND sl.to_date >= $2
      `, [instituteId, today]);

      return {
          present: parseInt(res.rows[0].present || 0),
          absent: parseInt(res.rows[0].absent || 0) + absentNames.rows.length,
          absentList: absentNames.rows.map(r => `${r.staff_first_name} ${r.staff_last_name}`)
      };
  }

  async getClassTeacherDesignation(staffId) {
    const res = await pool.query(`
      SELECT c.class_id, c.class_name, sec.section_name
      FROM class c
      JOIN section sec ON sec.section_id = c.section_id
      WHERE c.staff_id = $1
      LIMIT 1
    `, [staffId]);
    
    if (res.rows.length > 0) {
      return {
        class_id: res.rows[0].class_id,
        className: res.rows[0].class_name,
        sectionName: res.rows[0].section_name
      };
    }
    return null;
  }

  async getStudentDashboardData(userId) {
    // 1. Get student identity
    const identityRes = await pool.query(`
      SELECT 
        s.student_id, 
        s.stu_first_name || ' ' || s.stu_last_name as name,
        s.profile_url as photo,
        c.class_name,
        sec.section_name,
        ce.class_id,
        u.institute_id
      FROM student s
      JOIN "user" u ON u.user_id = s.student_user_id
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      WHERE s.student_user_id = $1 AND s.is_deleted = FALSE
    `, [userId]);

    if (identityRes.rows.length === 0) {
      throw new Error("Student profile not found for the given user ID");
    }

    const s = identityRes.rows[0];
    const studentId = s.student_id;
    const classId = s.class_id;

    // 2. Parallel fetching of all components
    const [
      todayAttendance,
      pendingFees,
      pendingHomework,
      nextExam,
      timetable,
      attendanceStats,
      recentResults,
      notices,
      attendanceStatsMonth
    ] = await Promise.all([
      // Today's attendance
      pool.query(`
        SELECT ar.status_id 
        FROM attendance_record ar
        JOIN attendance_session ats ON ats.session_id = ar.session_id
        WHERE ar.student_id = $1 AND ats.attendance_date = CURRENT_DATE
        LIMIT 1
      `, [studentId]),

      // Pending Fees
      pool.query(`
        SELECT 
          (SELECT COALESCE(SUM(fs.amount), 0) FROM fee_structure fs WHERE fs.class_id = $1)
          - 
          (SELECT COALESCE(SUM(amount_paid), 0) FROM fee_collection WHERE student_id = $2)
        as pending
      `, [classId, studentId]),

      // Pending Homework (Materials not yet submitted)
      pool.query(`
        SELECT COUNT(*) 
        FROM materials m
        WHERE m.class_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM student_submissions ss 
          WHERE ss.material_id = m.material_id 
          AND ss.student_id = $2
        )
      `, [classId, studentId]),

      // Next Exam
      pool.query(`
        SELECT exam_name, date_time 
        FROM exam 
        WHERE class_id = $1 AND date_time > NOW() 
        ORDER BY date_time ASC 
        LIMIT 1
      `, [classId]),

      // Today's Timetable
      pool.query(`
        SELECT 
          s.start_time, 
          s.end_time, 
          s.period_number,
          sub.subject_name,
          COALESCE(st_sub.staff_first_name || ' ' || st_sub.staff_last_name, st.staff_first_name || ' ' || st.staff_last_name) as teacher_name,
          CASE WHEN sa.id IS NOT NULL THEN true ELSE false END as is_substitute
        FROM schedule s
        JOIN subject sub ON sub.subject_id = s.subject_id
        JOIN staff st ON st.staff_id = s.staff_id
        LEFT JOIN substitute_assignments sa ON sa.class_id = s.class_id 
             AND sa.period_number = s.period_number 
             AND sa.assignment_date = CURRENT_DATE
             AND sa.status = 'accepted'
        LEFT JOIN staff st_sub ON st_sub.staff_id = sa.substitute_teacher_id
        WHERE s.class_id = $1 
        AND s.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)
        ORDER BY s.start_time
      `, [classId]),

      // Attendance Stats
      pool.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE status_id = 1) as present_days
        FROM attendance_record
        WHERE student_id = $1
      `, [studentId]),

      // Recent Results
      pool.query(`
        SELECT 
          e.exam_name, 
          sub.subject_name, 
          eg.marks_obtained, 
          e.total_score,
          eg.grade
        FROM exam_grades eg
        JOIN exam e ON e.exam_id = eg.exam_id
        JOIN subject sub ON sub.subject_id = e.subject_id
        WHERE eg.student_id = $1
        ORDER BY e.date_time DESC
        LIMIT 5
      `, [studentId]),

      // Recent Notices
      pool.query(`
        SELECT notice_id as id, title, content as description, post_date as date
        FROM notices
        ORDER BY post_date DESC
        LIMIT 5
      `),

      // Rolling 30-Day Attendance Summary (Real-time)
      pool.query(`
        SELECT 
          COUNT(ar.record_id) as total_days,
          COUNT(ar.record_id) FILTER (WHERE ar.status_id = 1) as present_days
        FROM attendance_record ar
        JOIN attendance_session ats ON ats.session_id = ar.session_id
        WHERE ar.student_id = $1
        AND ats.attendance_date >= (CURRENT_DATE - INTERVAL '30 days')
        AND ats.attendance_date <= CURRENT_DATE
      `, [studentId])
    ]);

    const examData = nextExam.rows[0];
    const monthAtt = attendanceStatsMonth.rows[0];

    return {
      profile: {
        name: s.name,
        class: s.class_name,
        section: s.section_name,
        rollNo: s.roll_no || 'N/A',
        photo: s.photo || "/avatars/default.png"
      },
      stats: {
        todayAttendance: todayAttendance.rows[0]?.status_id === 1 ? 'Present' : todayAttendance.rows[0]?.status_id === 2 ? 'Absent' : 'Pending',
        pendingFees: parseFloat(pendingFees.rows[0]?.pending || 0),
        pendingHomework: parseInt(pendingHomework.rows[0]?.count || 0),
        nextExam: examData?.exam_name || 'None',
        nextExamDate: examData?.date_time || null,
        monthAttendance: {
          present: parseInt(monthAtt?.present_days || 0),
          total: parseInt(monthAtt?.total_days || 0),
          percentage: monthAtt?.total_days > 0 
            ? Math.round((parseInt(monthAtt.present_days) * 100) / parseInt(monthAtt.total_days))
            : 0
        }
      },
      timetable: timetable.rows,
      attendanceOverview: {
        percentage: attendanceStats.rows[0]?.total_sessions > 0 
          ? Math.round((parseInt(attendanceStats.rows[0].present_days) * 100) / parseInt(attendanceStats.rows[0].total_sessions))
          : 0,
        present: parseInt(attendanceStats.rows[0]?.present_days || 0),
        total: parseInt(attendanceStats.rows[0]?.total_sessions || 0)
      },
      recentResults: recentResults.rows,
      notices: notices.rows,
      upcoming: await this.getEvents(s.institute_id), // Unified upcoming list
      library: {
        booksIssued: 0,
        overdueCount: 0
      }
    };
  }
}

export const DashboardService = new DashboardServiceClass();
