// src/models/events_model.js
// Enhanced Event Model — Supports class-specific events, period exchange, and event attendance
import pool from "../config/db.js";

const EventsModel = {

  // ───────────────────────────── EVENT CRUD ─────────────────────────────

  /**
   * Create event with class assignments in a transaction
   */
  async createEventWithClasses(data, classAssignments = [], exchanges = []) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Insert the event
      console.log("MODEL: Inserting event metadata...");
      const eventRes = await client.query(`
        INSERT INTO events 
        (event_name, description, event_date, event_start_date, event_end_date,
         start_time, end_time, venue, event_status_id, event_type, displaced_period_action)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `, [
        data.event_name,
        data.description,
        data.event_start_date || data.event_date,
        data.event_start_date || data.event_date,
        data.event_end_date || data.event_start_date || data.event_date,
        data.start_time || null,
        data.end_time || null,
        data.venue,
        data.event_status_id || 2, // default to Scheduled
        data.event_type || 'School Event',
        data.displaced_period_action || 'cancel'
      ]);

      const event = eventRes.rows[0];
      console.log("MODEL: Event Created ID:", event.event_id);
      const assignments = [];

      // 2. Insert class assignments (if any)
      if (classAssignments.length > 0) {
        console.log(`MODEL: Inserting ${classAssignments.length} class assignments...`);
        for (const ca of classAssignments) {
          const teacherId = ca.coordinator_teacher_id && !isNaN(parseInt(ca.coordinator_teacher_id)) 
            ? parseInt(ca.coordinator_teacher_id) 
            : null;

          const caRes = await client.query(`
            INSERT INTO event_class_assignments
            (event_id, class_id, coordinator_teacher_id, attendance_status)
            VALUES ($1, $2, $3, 'not_started')
            RETURNING *;
          `, [event.event_id, ca.class_id, teacherId]);
          assignments.push(caRes.rows[0]);
        }
      }

      // 3. Insert period exchanges (if any)
      const createdExchanges = [];
      if (exchanges.length > 0) {
        console.log(`MODEL: Inserting ${exchanges.length} period exchanges...`);
        for (const ex of exchanges) {
          const exRes = await client.query(`
            INSERT INTO event_period_exchanges
            (event_id, class_id, original_period_number, original_teacher_id, original_subject, exchange_date, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING
            RETURNING *;
          `, [
            event.event_id, 
            ex.class_id, 
            ex.original_period_number, 
            ex.original_teacher_id, 
            ex.original_subject, 
            ex.exchange_date, 
            ex.status
          ]);
          if (exRes.rows[0]) createdExchanges.push(exRes.rows[0]);
        }
      }

      await client.query("COMMIT");
      console.log("MODEL: Transaction COMMITTED successfully.");
      return { event, assignments, exchanges: createdExchanges };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("DATABASE_ERROR in createEventWithClasses (ROOT LEVEL):", err);
      console.error("ERROR_DETAIL:", err.detail || "No detail");
      console.error("ERROR_HINT:", err.hint || "No hint");
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get single event with full detail
   */
  async getEventById(id) {
    // Event base
    const eventRes = await pool.query(`
      SELECT e.*, s.event_status_name
      FROM events e
      LEFT JOIN event_status s ON e.event_status_id = s.event_status_id
      WHERE e.event_id = $1
    `, [id]);
    
    if (eventRes.rows.length === 0) return null;
    const event = eventRes.rows[0];

    // Class assignments with coordinator info
    const assignRes = await pool.query(`
      SELECT eca.*, 
        c.class_name, sec.section_name,
        st.staff_first_name AS coordinator_first_name,
        st.staff_last_name AS coordinator_last_name,
        st.profile_url AS coordinator_profile_url
      FROM event_class_assignments eca
      JOIN class c ON c.class_id = eca.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN staff st ON st.staff_id = eca.coordinator_teacher_id
      WHERE eca.event_id = $1
      ORDER BY c.class_name
    `, [id]);

    // Period exchanges
    const exchangeRes = await pool.query(`
      SELECT epe.*,
        c.class_name, sec.section_name,
        st.staff_first_name AS teacher_first_name,
        st.staff_last_name AS teacher_last_name
      FROM event_period_exchanges epe
      JOIN class c ON c.class_id = epe.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN staff st ON st.staff_id = epe.original_teacher_id
      WHERE epe.event_id = $1
      ORDER BY epe.exchange_date, c.class_name, epe.original_period_number
    `, [id]);

    // Attendance summary per class
    const attendanceRes = await pool.query(`
      SELECT 
        ea.class_id,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ea.status = 'present') AS present_count,
        COUNT(*) FILTER (WHERE ea.status = 'absent') AS absent_count
      FROM event_attendance ea
      WHERE ea.event_id = $1
      GROUP BY ea.class_id
    `, [id]);

    const attendanceMap = {};
    attendanceRes.rows.forEach(r => {
      attendanceMap[r.class_id] = {
        total: parseInt(r.total),
        present: parseInt(r.present_count),
        absent: parseInt(r.absent_count)
      };
    });

    return {
      ...event,
      class_assignments: assignRes.rows.map(a => ({
        ...a,
        attendance_summary: attendanceMap[a.class_id] || null
      })),
      period_exchanges: exchangeRes.rows
    };
  },

  /**
   * Get all events with optional filters
   */
  async getAllEvents(class_id = null) {
    let query = `
      SELECT e.*, s.event_status_name,
        (SELECT COUNT(*) FROM event_class_assignments eca WHERE eca.event_id = e.event_id) AS class_count,
        (SELECT COUNT(*) FROM event_class_assignments eca2 
         WHERE eca2.event_id = e.event_id AND eca2.attendance_status = 'submitted') AS classes_submitted
      FROM events e
      LEFT JOIN event_status s ON e.event_status_id = s.event_status_id
      WHERE 1=1
    `;
    const values = [];

    if (class_id) {
      query += ` AND (
        e.event_id IN (SELECT event_id FROM event_class_assignments WHERE class_id = $1)
        OR NOT EXISTS (SELECT 1 FROM event_class_assignments WHERE event_id = e.event_id)
      )`;
      values.push(class_id);
    }

    query += ` ORDER BY COALESCE(e.event_start_date, e.event_date) DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  },

  /**
   * Get event statuses
   */
  async getEventStatuses() {
    const result = await pool.query(`SELECT * FROM event_status ORDER BY event_status_id ASC`);
    return result.rows;
  },

  /**
   * Update event (basic fields only)
   */
  async updateEvent(id, data) {
    const query = `
      UPDATE events SET
        event_name = $1,
        description = $2,
        event_date = $3,
        event_start_date = $4,
        event_end_date = $5,
        start_time = $6,
        end_time = $7,
        venue = $8,
        event_status_id = $9,
        event_type = $10,
        displaced_period_action = $11,
        updated_at = now()
      WHERE event_id = $12
      RETURNING *;
    `;
    const values = [
      data.event_name,
      data.description,
      data.event_start_date || data.event_date,
      data.event_start_date || data.event_date,
      data.event_end_date || data.event_start_date || data.event_date,
      data.start_time || null,
      data.end_time || null,
      data.venue,
      data.event_status_id,
      data.event_type || 'School Event',
      data.displaced_period_action || 'cancel',
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Delete event (cascades to class_assignments, period_exchanges, attendance)
   */
  async deleteEvent(id) {
    await pool.query(`DELETE FROM events WHERE event_id = $1`, [id]);
    return true;
  },

  // ───────────── PERIOD EXCHANGE LOGIC ─────────────

  /**
   * Find displaced periods for a class on a specific date within event time range
   * Returns schedule rows that fall within the event's start_time → end_time
   */
  async getDisplacedPeriods(classId, eventDate, startTime, endTime) {
    // Get day_of_week from the event date (ISO: 1=Mon, 7=Sun)
    const dayRes = await pool.query(
      `SELECT EXTRACT(ISODOW FROM $1::DATE) AS dow`,
      [eventDate]
    );
    const dayOfWeek = parseInt(dayRes.rows[0].dow);

    const query = `
      SELECT sch.schedule_id, sch.period_number, sch.start_time, sch.end_time,
        sch.staff_id, sch.subject_id, sch.class_id,
        sub.subject_name,
        st.staff_first_name, st.staff_last_name, st.user_id AS teacher_user_id
      FROM schedule sch
      LEFT JOIN subject sub ON sub.subject_id = sch.subject_id
      LEFT JOIN staff st ON st.staff_id = sch.staff_id
      WHERE sch.class_id = $1
        AND sch.day_of_week = $2
        AND sch.is_break = false
        AND sch.start_time < $4::TIME
        AND sch.end_time > $3::TIME
      ORDER BY sch.period_number
    `;
    
    const result = await pool.query(query, [classId, dayOfWeek, startTime, endTime]);
    return result.rows;
  },

  /**
   * Bulk create period exchange records
   */
  async createPeriodExchanges(exchanges) {
    const results = [];
    for (const ex of exchanges) {
      const res = await pool.query(`
        INSERT INTO event_period_exchanges
        (event_id, class_id, original_period_number, original_teacher_id, original_subject, exchange_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
        RETURNING *
      `, [
        ex.event_id,
        ex.class_id,
        ex.original_period_number,
        ex.original_teacher_id,
        ex.original_subject,
        ex.exchange_date,
        ex.status || 'exchanged'
      ]);
      if (res.rows[0]) results.push(res.rows[0]);
    }
    return results;
  },

  /**
   * Get period exchanges for an event
   */
  async getPeriodExchanges(eventId) {
    const res = await pool.query(`
      SELECT epe.*,
        c.class_name, sec.section_name,
        st.staff_first_name AS teacher_first_name,
        st.staff_last_name AS teacher_last_name
      FROM event_period_exchanges epe
      JOIN class c ON c.class_id = epe.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN staff st ON st.staff_id = epe.original_teacher_id
      WHERE epe.event_id = $1
      ORDER BY epe.exchange_date, c.class_name, epe.original_period_number
    `, [eventId]);
    return res.rows;
  },

  // ───────────── EVENT ATTENDANCE ─────────────

  /**
   * Get students for a class (for attendance marking)
   */
  async getStudentsForClass(classId) {
    const res = await pool.query(`
      SELECT 
        s.student_id,
        s.stu_first_name || ' ' || s.stu_last_name AS name,
        'N/A' AS roll_number,
        c.class_name
      FROM student s
      JOIN class_enrollment ce ON ce.student_id = s.student_id
      JOIN class c ON c.class_id = ce.class_id
      WHERE ce.class_id = $1 AND s.is_deleted = false
      ORDER BY s.stu_first_name, s.stu_last_name
    `, [classId]);
    return res.rows;
  },

  /**
   * Save event attendance records (bulk upsert)
   */
  async saveEventAttendance(eventId, classId, records, markedBy) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const results = [];
      for (const r of records) {
        const res = await client.query(`
          INSERT INTO event_attendance
          (event_id, class_id, student_id, status, remarks, marked_by, marked_at)
          VALUES ($1, $2, $3, $4, $5, $6, now())
          ON CONFLICT (event_id, class_id, student_id)
          DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks,
                        marked_by = EXCLUDED.marked_by, marked_at = now()
          RETURNING *
        `, [eventId, classId, r.student_id, r.status, r.remarks || null, markedBy]);
        results.push(res.rows[0]);
      }

      // Update assignment attendance_status
      await client.query(`
        UPDATE event_class_assignments
        SET attendance_status = 'submitted'
        WHERE event_id = $1 AND class_id = $2
      `, [eventId, classId]);

      await client.query("COMMIT");
      return results;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get event attendance for a specific class
   */
  async getEventAttendance(eventId, classId) {
    const res = await pool.query(`
      SELECT ea.*,
        s.stu_first_name || ' ' || s.stu_last_name AS student_name,
        'N/A' AS roll_number,
        st.staff_first_name || ' ' || st.staff_last_name AS marked_by_name
      FROM event_attendance ea
      JOIN student s ON s.student_id = ea.student_id
      LEFT JOIN staff st ON st.staff_id = ea.marked_by
      WHERE ea.event_id = $1 AND ea.class_id = $2
      ORDER BY s.stu_first_name, s.stu_last_name
    `, [eventId, classId]);
    return res.rows;
  },

  /**
   * Get coordinator's events for today (dashboard prompt)
   */
  async getCoordinatorEventsToday(staffId) {
    const res = await pool.query(`
      SELECT e.event_id, e.event_name, e.start_time, e.end_time, e.venue,
        e.event_start_date, e.event_end_date, e.event_type,
        eca.class_id, eca.attendance_status,
        c.class_name, sec.section_name
      FROM event_class_assignments eca
      JOIN events e ON e.event_id = eca.event_id
      JOIN class c ON c.class_id = eca.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      WHERE eca.coordinator_teacher_id = $1
        AND CURRENT_DATE BETWEEN COALESCE(e.event_start_date, e.event_date)
                               AND COALESCE(e.event_end_date, e.event_start_date, e.event_date)
      ORDER BY e.start_time
    `, [staffId]);
    return res.rows;
  },

  /**
   * Unlock attendance for editing (admin only)
   */
  async unlockAttendance(eventId, classId) {
    const res = await pool.query(`
      UPDATE event_class_assignments
      SET attendance_status = 'in_progress'
      WHERE event_id = $1 AND class_id = $2
      RETURNING *
    `, [eventId, classId]);
    return res.rows[0];
  },

  /**
   * Get class assignment for a specific event + class combo
   */
  async getClassAssignment(eventId, classId) {
    const res = await pool.query(`
      SELECT eca.*, 
        st.staff_first_name, st.staff_last_name,
        c.class_name, sec.section_name
      FROM event_class_assignments eca
      JOIN class c ON c.class_id = eca.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN staff st ON st.staff_id = eca.coordinator_teacher_id
      WHERE eca.event_id = $1 AND eca.class_id = $2
    `, [eventId, classId]);
    return res.rows[0] || null;
  },

  /**
   * Get displaced periods for event + class (for regular attendance auto-population)
   */
  async getExchangesForEventClass(eventId, classId) {
    const res = await pool.query(`
      SELECT * FROM event_period_exchanges
      WHERE event_id = $1 AND class_id = $2
    `, [eventId, classId]);
    return res.rows;
  },

  // ───────────── EVENT PHOTOS ─────────────

  /**
   * Bulk insert event photos
   */
  async saveEventPhotos(eventId, photos) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const p of photos) {
        const res = await client.query(`
          INSERT INTO event_photos (event_id, photo_url, public_id)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [eventId, p.photo_url, p.public_id]);
        results.push(res.rows[0]);
      }
      await client.query("COMMIT");
      return results;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get all photos for an event
   */
  async getEventPhotos(eventId) {
    const res = await pool.query(
      `SELECT * FROM event_photos WHERE event_id = $1 ORDER BY created_at DESC`,
      [eventId]
    );
    return res.rows;
  },

  /**
   * Delete a specific photo record
   */
  async deleteEventPhoto(photoId) {
    const res = await pool.query(
      `DELETE FROM event_photos WHERE id = $1 RETURNING *`,
      [photoId]
    );
    return res.rows[0];
  }
};

export default EventsModel;
