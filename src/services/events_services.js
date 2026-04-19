// src/services/events_services.js
// Enhanced Event Service — Orchestrates event creation, period exchange, attendance, notifications
import EventsModel from "../models/events_model.js";
import { NotificationModel } from "../models/notification_Model.js";
import pool from "../config/db.js";

const EventsService = {

  // ───────────── CREATE EVENT WITH FULL EXCHANGE FLOW ─────────────

  async createEventWithExchange(data) {
    console.log("SERVICE: Creating event with exchange...", data.event_name);
    const classAssignments = data.class_assignments || [];
    const allExchanges = [];

    // Step 1: Pre-calculate all displacements for all days/classes
    if (classAssignments.length > 0 && data.start_time && data.end_time) {
      const startDate = new Date(data.event_start_date || data.event_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(data.event_end_date || data.event_start_date || data.event_date);
      endDate.setHours(0, 0, 0, 0);

      console.log(`SERVICE: Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toLocaleDateString("en-CA");
        console.log("SERVICE: Processing date:", dateStr);

        for (const ca of classAssignments) {
          const displaced = await EventsModel.getDisplacedPeriods(
            ca.class_id, dateStr, data.start_time, data.end_time
          );

          for (const p of displaced) {
            allExchanges.push({
              class_id: ca.class_id,
              original_period_number: p.period_number,
              original_teacher_id: p.staff_id,
              original_subject: p.subject_name,
              exchange_date: dateStr,
              teacher_user_id: p.teacher_user_id, // for notifications later
              status: data.displaced_period_action === 'reschedule' ? 'pending_reschedule' : 'exchanged'
            });
          }
        }
      }
    }

    // Step 2: Atomic Creation of Everything
    const { event, assignments, exchanges } = await EventsModel.createEventWithClasses(
      data, 
      classAssignments, 
      allExchanges
    );

    // Step 3: Post-creation Notifications (Non-blocking)
    try {
      for (const ex of allExchanges) {
        if (!ex.teacher_user_id) continue;

        const className = await getClassName(ex.class_id);
        const dateStr = ex.exchange_date;

        await NotificationModel.createNotification({
          user_id: ex.teacher_user_id,
          title: `Period Displaced — ${event.event_name}`,
          message: `Your class for ${className} on ${formatDate(dateStr)} during Period ${ex.original_period_number} has been replaced by ${event.event_name}. Your presence is not required for that period.`,
          type: 'event_period_exchange'
        });
      }
    } catch (notifErr) {
      console.error("Secondary error in event notifications:", notifErr);
    }

    return { event, assignments, exchanges };
  },

  // ───────────── EVENT RETRIEVAL ─────────────

  async getEventDetail(id) {
    return await EventsModel.getEventById(id);
  },

  async getAllEvents(class_id = null) {
    return await EventsModel.getAllEvents(class_id);
  },

  async getEventStatuses() {
    return await EventsModel.getEventStatuses();
  },

  async updateEvent(id, data) {
    return await EventsModel.updateEvent(id, data);
  },

  async deleteEvent(id) {
    return await EventsModel.deleteEvent(id);
  },

  async generateCertificate(eventId) {
    return { event_id: eventId, certificate_no: "CERT-" + Date.now() };
  },

  // ───────────── EVENT ATTENDANCE ─────────────

  /**
   * Get attendance page data for a coordinator
   */
  async getEventAttendanceData(eventId, classId) {
    const event = await EventsModel.getEventById(eventId);
    if (!event) throw new Error("Event not found");

    const assignment = await EventsModel.getClassAssignment(eventId, classId);
    if (!assignment) throw new Error("Class not assigned to this event");

    // Get existing attendance (if any)
    const existingAttendance = await EventsModel.getEventAttendance(eventId, classId);

    // Get student list
    const students = await EventsModel.getStudentsForClass(classId);

    return {
      event: {
        event_id: event.event_id,
        event_name: event.event_name,
        event_type: event.event_type,
        event_start_date: event.event_start_date,
        event_end_date: event.event_end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        venue: event.venue
      },
      assignment,
      students,
      attendance: existingAttendance,
      is_submitted: assignment.attendance_status === 'submitted'
    };
  },

  /**
   * Submit event attendance + auto-populate regular class attendance
   */
  async submitEventAttendance(eventId, classId, records, teacherStaffId) {
    // 1. Save event attendance
    const savedRecords = await EventsModel.saveEventAttendance(eventId, classId, records, teacherStaffId);

    // 2. Auto-populate regular attendance for displaced periods
    await this.autoPopulateRegularAttendance(eventId, classId, records, teacherStaffId);

    // 3. Build summary
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return {
      records: savedRecords,
      summary: {
        present: presentCount,
        absent: absentCount,
        total,
        percentage
      }
    };
  },

  /**
   * Auto-populate regular attendance records for displaced periods
   * This ensures student attendance % is not negatively affected by events
   */
  async autoPopulateRegularAttendance(eventId, classId, attendanceRecords, teacherStaffId) {
    try {
      // Get the event info
      const event = await EventsModel.getEventById(eventId);
      if (!event) return;

      // Get displaced periods for this event + class
      const exchanges = await EventsModel.getExchangesForEventClass(eventId, classId);
      if (exchanges.length === 0) return;

      // Get section_id for this class
      const classRes = await pool.query('SELECT section_id FROM class WHERE class_id = $1', [classId]);
      const sectionId = classRes.rows[0]?.section_id;
      if (!sectionId) return;

      // For each exchange date, for each displaced period, create attendance records
      const dateGroups = {};
      exchanges.forEach(ex => {
        const dk = ex.exchange_date instanceof Date ? ex.exchange_date.toISOString().split('T')[0] : ex.exchange_date;
        if (!dateGroups[dk]) dateGroups[dk] = [];
        dateGroups[dk].push(ex);
      });

      for (const [dateStr, periodExchanges] of Object.entries(dateGroups)) {
        // We need a subject_id for the attendance session — use the first displaced period's subject
        // This is a pseudo-session representing "event attendance counted"
        for (const ex of periodExchanges) {
          // Find the original subject_id from schedule
          const schedRes = await pool.query(`
            SELECT subject_id FROM schedule 
            WHERE class_id = $1 AND period_number = $2 
            AND day_of_week = EXTRACT(ISODOW FROM $3::DATE)
            LIMIT 1
          `, [classId, ex.original_period_number, dateStr]);

          const subjectId = schedRes.rows[0]?.subject_id;
          if (!subjectId) continue;

          // Create or get attendance session
          const sessionRes = await pool.query(`
            INSERT INTO attendance_session
            (class_id, section_id, subject_id, attendance_date, created_by, faculty_id)
            VALUES ($1, $2, $3, $4::DATE, $5, $5)
            ON CONFLICT (class_id, section_id, subject_id, attendance_date)
            DO UPDATE SET updated_at = now()
            RETURNING session_id
          `, [classId, sectionId, subjectId, dateStr, teacherStaffId]);

          const sessionId = sessionRes.rows[0].session_id;

          // Create attendance records for each student
          for (const record of attendanceRecords) {
            const statusId = record.status === 'present' ? 1 : 2;
            const remark = record.status === 'present'
              ? `Present — ${event.event_name}`
              : `Absent — ${event.event_name}`;

            await pool.query(`
              INSERT INTO attendance_record
              (session_id, student_id, staff_id, status_id, remarks)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (session_id, student_id)
              DO UPDATE SET status_id = EXCLUDED.status_id, remarks = EXCLUDED.remarks, updated_at = now()
            `, [sessionId, record.student_id, teacherStaffId, statusId, remark]);
          }
        }
      }
    } catch (err) {
      console.error("Auto-populate regular attendance error:", err);
      // Don't throw — this is a secondary operation
    }
  },

  /**
   * Unlock attendance for editing (admin only)
   */
  async unlockAttendanceEdit(eventId, classId) {
    const result = await EventsModel.unlockAttendance(eventId, classId);

    // Notify coordinator
    if (result?.coordinator_teacher_id) {
      const staffRes = await pool.query(
        'SELECT user_id FROM staff WHERE staff_id = $1',
        [result.coordinator_teacher_id]
      );
      if (staffRes.rows[0]) {
        await NotificationModel.createNotification({
          user_id: staffRes.rows[0].user_id,
          title: 'Event Attendance Unlocked',
          message: `Admin has unlocked event attendance for editing. You can now modify the attendance records.`,
          type: 'event_attendance_unlock'
        });
      }
    }

    return result;
  },

  // ───────────── COORDINATOR DASHBOARD ─────────────

  async getCoordinatorDashboardEvents(staffId) {
    return await EventsModel.getCoordinatorEventsToday(staffId);
  },

  // ───────────── PERIOD EXCHANGES ─────────────

  async getDisplacedPeriods(eventId) {
    return await EventsModel.getPeriodExchanges(eventId);
  },

  // ───────────── EVENT PHOTOS ─────────────

  /**
   * Upload multiple photos to an event
   */
  async uploadEventPhotos(eventId, files) {
    if (!files || files.length === 0) throw new Error("No files provided");

    const cleanEventId = parseInt(eventId);
    if (isNaN(cleanEventId)) throw new Error("Invalid Event ID");

    const photoData = files.map(f => ({
      photo_url: f.path || f.secure_url, // Prefer standard Multer 'path' provided by Cloudinary storage
      public_id: f.filename || f.public_id
    }));

    return await EventsModel.saveEventPhotos(cleanEventId, photoData);
  },

  /**
   * Retrieve photos for an event
   */
  async getEventPhotos(eventId) {
    return await EventsModel.getEventPhotos(eventId);
  },

  /**
   * Delete a photo from Cloudinary and DB
   */
  async deleteEventPhoto(photoId, publicId) {
    // 1. Delete from Cloudinary
    if (publicId) {
      const { deleteFromCloudinary } = await import("../config/cloudinary.js");
      // Since these are images, we don't need { resource_type: "raw" } if configured as image
      // But let's check config/cloudinary.js for the delete function.
      await deleteFromCloudinary(publicId); 
    }

    // 2. Delete from DB
    return await EventsModel.deleteEventPhoto(photoId);
  }
};

// ───────────── HELPERS ─────────────

function formatTimeDisplay(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function getClassName(classId) {
  const res = await pool.query(`
    SELECT c.class_name, sec.section_name
    FROM class c
    LEFT JOIN section sec ON sec.section_id = c.section_id
    WHERE c.class_id = $1
  `, [classId]);
  if (res.rows.length === 0) return 'Unknown Class';
  const r = res.rows[0];
  return r.section_name ? `${r.class_name} (${r.section_name})` : r.class_name;
}

export default EventsService;
