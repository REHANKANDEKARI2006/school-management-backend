/**
 * leave_service.js — Leave Management Service (Rebuilt)
 *
 * Contains:
 *   applyForLeave()           — validate, insert, notify admins
 *   getSubstituteSuggestions()— 4-tier priority algorithm, Mon-Sat aware
 *   approveLeaveWithSubstitutes() — single atomic DB transaction
 *   rejectLeave()             — reject + notify teacher
 *   cancelLeave()             — cancel pending + restore balance
 *   respondToSubstituteDuty() — substitute accept/decline + notify admin
 */

import db from '../config/db.js';
import { LeaveModel } from '../models/leave_Model.js';
import { SubstituteModel } from '../models/substitute_Model.js';
import { NotificationModel } from '../models/notification_Model.js';
import { FacultyModel } from '../models/faculty_Model.js';
import ScheduleModel from '../models/schedule_model.js';

/** Helpers ─────────────────────────────────────────── */

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Returns all dates between from_date and to_date inclusive (Mon=1 … Sat=6, skip Sunday=0)
function getWorkingDates(from_date, to_date) {
  const dates = [];
  const start = new Date(from_date);
  const end   = new Date(to_date);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); // 0=Sun, 1=Mon … 6=Sat
    if (dow !== 0) {       // Skip Sundays only — school runs Mon-Sat
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
  }
  return dates;
}

// Map JS getDay() (0=Sun,1=Mon…6=Sat) to DB day_of_week (1=Mon…7=Sun)
function jsToDbDow(jsDow) {
  return jsDow === 0 ? 7 : jsDow; // Sun → 7, Mon → 1, … Sat → 6
}

/** ─────────────────────────────────────────────────── */

export const LeaveService = {

  /** ── Apply for Leave ─────────────────────────────── */
  async applyForLeave(data, user) {
    const { teacher_id, leave_type_id, from_date, to_date, total_days, reason, document_url } = data;

    if (!teacher_id)    throw new Error('teacher_id is required');
    if (!leave_type_id) throw new Error('leave_type_id is required');
    if (!from_date || !to_date) throw new Error('from_date and to_date are required');

    const academic_year = data.academic_year || '2025-2026';

    // Validate balance for paid leaves
    const balances = await LeaveModel.getLeaveBalance(teacher_id, academic_year);
    const bal = balances.find(b => b.leave_type_id === parseInt(leave_type_id));
    if (bal && bal.is_paid && bal.name !== 'Loss of Pay') {
      if (parseFloat(total_days) > parseFloat(bal.remaining_days)) {
        throw new Error(`Insufficient ${bal.leave_type_name} balance. Remaining: ${bal.remaining_days}, Requested: ${total_days}`);
      }
    }

    // Create application
    const application = await LeaveModel.createApplication({
      teacher_id, leave_type_id, from_date, to_date,
      total_days: parseFloat(total_days),
      reason, document_url, academic_year
    });

    // Fetch teacher details for notification
    const teacher = await FacultyModel.findById(teacher_id);
    const teacherName = teacher ? `${teacher.staff_first_name} ${teacher.staff_last_name}` : 'A teacher';
    const leaveTypeName = bal ? bal.leave_type_name : 'Leave';

    // Notify ALL admin users
    const { rows: admins } = await db.query(
      `SELECT user_id FROM "user" WHERE role_id = 1`
    );
    for (const admin of admins) {
      await NotificationModel.createNotification({
        user_id: admin.user_id,
        sender_user_id: teacher ? teacher.user_id : null,
        related_leave_id: application.id,
        title: 'New Leave Application',
        message: `${teacherName} has applied for ${leaveTypeName} from ${formatDate(from_date)} to ${formatDate(to_date)} — ${total_days} day(s). Pending your approval.`,
        type: 'LEAVE_APPLIED'
      });
    }

    return application;
  },

  /** ── Substitute Suggestion Algorithm ────────────── */
  async getSubstituteSuggestions(leave_application_id) {
    const application = await LeaveModel.getApplicationById(leave_application_id);
    if (!application) throw new Error('Leave application not found');

    const { teacher_id, from_date, to_date } = application;

    // Get all working dates in the leave range (Mon–Sat, skip Sun)
    const workingDates = getWorkingDates(from_date, to_date);
    if (workingDates.length === 0) return [];

    // Pre-fetch all active staff
    const allStaff  = await FacultyModel.getAll();
    // Pre-fetch all schedules (complete timetable)
    const allSchedules = await ScheduleModel.getAll();
    // Pre-fetch all approved leaves that overlap this range
    const overlappingLeaves = await LeaveModel.getApprovedLeavesInRange(from_date, to_date);

    // Pre-fetch substitute duty counts this month for fairness
    const dutyCountMap = {};
    for (const s of allStaff) {
      dutyCountMap[s.staff_id] = await SubstituteModel.countSubDutiesThisMonth(s.staff_id);
    }

    const suggestions = [];

    for (const dateStr of workingDates) {
      // Use timezone-safe parsing (YYYY, MM-1, DD) to avoid UTC shift
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayJs  = new Date(y, m - 1, d).getDay();   // 0=Sun…6=Sat
      const dbDow  = jsToDbDow(dayJs);              // 1=Mon…6=Sat, 7=Sun

      // Find all periods the leave teacher teaches on this day of week
      const teacherPeriods = allSchedules.filter(
        sch => sch.staff_id === parseInt(teacher_id) &&
               sch.day_of_week === dbDow &&
               !sch.is_break
      );

      for (const period of teacherPeriods) {
        const rankedSubs = this._rankSubstitutes(
          period, dateStr, dbDow,
          allStaff, allSchedules, overlappingLeaves,
          parseInt(teacher_id), dutyCountMap
        );

        suggestions.push({
          date:             dateStr,
          period_number:    period.period_number,
          period_start_time: period.start_time,
          period_end_time:   period.end_time,
          class_id:         period.class_id,
          class_name:       period.class_name || `Class ${period.class_id}`,
          subject:          period.subject_name || 'Subject',
          subject_id:       period.subject_id,
          dept_id:          application.dept_id,
          room:             period.room_id ? `Room ${period.room_id}` : null,
          ranked_subs:      rankedSubs.slice(0, 15),  // Top 15
          has_suggestion:   rankedSubs.length > 0
        });
      }
    }

    return suggestions;
  },

  _rankSubstitutes(period, dateStr, dbDow, allStaff, allSchedules, overlappingLeaves, originalTeacherId, dutyCountMap) {
    const periodNum   = period.period_number;
    const subjectId   = period.subject_id;
    const deptId      = period.dept_id;

    const candidates = [];

    for (const staff of allStaff) {
      // Exclusion: self
      if (staff.staff_id === originalTeacherId) continue;

      // Exclusion: on approved leave on this date
      const isOnLeave = overlappingLeaves.some(l => {
        const lStart = new Date(l.from_date);
        const lEnd   = new Date(l.to_date);
        const check  = new Date(dateStr);
        return l.teacher_id === staff.staff_id && lStart <= check && check <= lEnd;
      });
      if (isOnLeave) continue;

      // Exclusion: already has a regular class at this period+day
      const isBusy = allSchedules.some(
        s => s.staff_id === staff.staff_id &&
             s.day_of_week === dbDow &&
             s.period_number === periodNum &&
             !s.is_break
      );
      if (isBusy) continue;

      // Score
      let score = 0;
      let matchReason = 'Available';

      if (staff.subject_id && staff.subject_id === subjectId) {
        score = 100;
        matchReason = 'Same Subject';
      } else if (staff.dept_id && staff.dept_id === deptId) {
        score = 50;
        matchReason = 'Same Department';
      } else {
        score = 10;
      }

      // Fairness: fewer duties this month = higher priority (subtract duty count from score)
      const duties = dutyCountMap[staff.staff_id] || 0;
      const fairnessBonus = Math.max(0, 20 - duties);
      score += fairnessBonus;

      candidates.push({
        staff_id:          staff.staff_id,
        staff_first_name:  staff.staff_first_name,
        staff_last_name:   staff.staff_last_name,
        dept_name:         staff.dept_name,
        subject_name:      staff.subject_name,
        profile_url:       staff.profile_url,
        match_reason:      matchReason,
        score,
        duty_count_this_month: duties
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  },

  /** ── Approve Leave (Atomic Transaction) ─────────── */
  async approveLeaveWithSubstitutes(leave_id, assignments, admin_user_id, remarks) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Update leave status → approved
      const application = await LeaveModel.updateApplicationStatus(
        leave_id, 'approved', admin_user_id, remarks, client
      );

      // 2. Fetch full application details for notification messages
      const fullApp = await LeaveModel.getApplicationById(leave_id);

      // 3. Deduct balance
      const academicYear = '2025-2026';
      await LeaveModel.deductBalance(
        fullApp.teacher_id,
        fullApp.leave_type_id,
        academicYear,
        fullApp.total_days,
        client
      );

      // 4. Update Staff status to 'On Leave' (7)
      await client.query(`UPDATE staff SET user_status_id = 7 WHERE staff_id = $1`, [fullApp.teacher_id]);

      // 4. Insert substitute_assignments
      let createdAssignments = [];
      if (assignments && assignments.length > 0) {
        const preparedAssignments = assignments.map(a => ({
          leave_application_id:  leave_id,
          original_teacher_id:   fullApp.teacher_id,
          substitute_teacher_id: parseInt(a.substitute_teacher_id),
          assignment_date:       a.date,
          period_number:         a.period_number,
          period_start_time:     a.period_start_time,
          period_end_time:       a.period_end_time,
          class_id:              a.class_id || null,
          subject:               a.subject   || null,
          room:                  a.room      || null
        }));
        createdAssignments = await SubstituteModel.createAssignmentsBatch(preparedAssignments, client);
      }

      await client.query('COMMIT');

      // ── Post-transaction notifications (non-blocking) ──────────
      const teacherName = `${fullApp.staff_first_name} ${fullApp.staff_last_name}`;
      const leaveType   = fullApp.leave_type_name;
      const fromFmt     = formatDate(fullApp.from_date);
      const toFmt       = formatDate(fullApp.to_date);
      const approverFullName = fullApp.approver_first_name
        ? `${fullApp.approver_first_name} ${fullApp.approver_last_name}`
        : fullApp.approver_username || 'Admin';
      const approverRole = fullApp.approver_role || 'Admin';

      // Fetch admin user_id for sender
      const { rows: adminRows } = await db.query(
        `SELECT user_id FROM "user" WHERE user_id = $1`, [admin_user_id]
      );
      const adminUserId = adminRows[0]?.user_id || admin_user_id;

      // 5. Notify leave teacher — Approved
      const teacherUserRow = await db.query(
        `SELECT user_id FROM staff WHERE staff_id = $1`, [fullApp.teacher_id]
      );
      const teacherUserId = teacherUserRow.rows[0]?.user_id;
      if (teacherUserId) {
        await NotificationModel.createNotification({
          user_id: teacherUserId,
          sender_user_id: adminUserId,
          related_leave_id: leave_id,
          title: 'Leave Approved',
          message: `Your ${leaveType} from ${fromFmt} to ${toFmt} has been approved by ${approverFullName} (${approverRole}). Substitute arrangements have been made for your classes.`,
          type: 'LEAVE_APPROVED'
        });
      }

      // 6. Notify each unique substitute teacher
      const subGroups = {};
      for (const sa of createdAssignments) {
        if (!subGroups[sa.substitute_teacher_id]) subGroups[sa.substitute_teacher_id] = [];
        subGroups[sa.substitute_teacher_id].push(sa);
      }

      for (const [subStaffId, duties] of Object.entries(subGroups)) {
        const subUserRow = await db.query(
          `SELECT user_id FROM staff WHERE staff_id = $1`, [subStaffId]
        );
        const subUserId = subUserRow.rows[0]?.user_id;
        if (!subUserId) continue;

        await NotificationModel.createNotification({
          user_id: subUserId,
          sender_user_id: adminUserId,
          related_leave_id: leave_id,
          title: 'Substitute Duty Assigned',
          message: `You have been assigned substitute duty for ${teacherName}'s leave from ${fromFmt} to ${toFmt}. Please review your assigned periods and accept or decline.`,
          type: 'SUBSTITUTE_ASSIGNED',
          action_payload: {
            leave_application_id: leave_id,
            substitute_teacher_id: parseInt(subStaffId),
            duty_count: duties.length
          }
        });
      }

      return { success: true, application, assignments: createdAssignments };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /** ── Reject Leave ────────────────────────────────── */
  async rejectLeave(leave_id, admin_user_id, remarks) {
    const fullApp = await LeaveModel.getApplicationById(leave_id);
    if (!fullApp) throw new Error('Leave application not found');
    if (fullApp.status !== 'pending') throw new Error('Only pending applications can be rejected');

    await LeaveModel.updateApplicationStatus(leave_id, 'rejected', admin_user_id, remarks);

    // Notify teacher
    const teacherUserRow = await db.query(
      `SELECT user_id FROM staff WHERE staff_id = $1`, [fullApp.teacher_id]
    );
    const teacherUserId = teacherUserRow.rows[0]?.user_id;

    const approverFullName = fullApp.approver_first_name
      ? `${fullApp.approver_first_name} ${fullApp.approver_last_name}`
      : 'Admin';
    const approverRole = fullApp.approver_role || 'Admin';

    if (teacherUserId) {
      await NotificationModel.createNotification({
        user_id: teacherUserId,
        sender_user_id: admin_user_id,
        related_leave_id: leave_id,
        title: 'Leave Rejected',
        message: `Your ${fullApp.leave_type_name} from ${formatDate(fullApp.from_date)} to ${formatDate(fullApp.to_date)} has been rejected by ${approverFullName} (${approverRole}). Reason: ${remarks || 'No reason provided'}.`,
        type: 'LEAVE_REJECTED'
      });
    }

    return { success: true };
  },

  /** ── Cancel Leave (teacher cancels their own pending) */
  async cancelLeave(leave_id, teacher_id) {
    const fullApp = await LeaveModel.getApplicationById(leave_id);
    if (!fullApp) throw new Error('Leave application not found');
    if (fullApp.teacher_id !== parseInt(teacher_id)) throw new Error('Unauthorized');
    if (fullApp.status !== 'pending') throw new Error('Only pending applications can be cancelled');

    const cancelled = await LeaveModel.cancelApplication(leave_id, teacher_id);
    if (!cancelled) throw new Error('Could not cancel. Application may have been actioned already.');

    return { success: true };
  },

  /** ── Substitute Responds (Accept/Decline) ──────── */
  async respondToSubstituteDuty(leave_application_id, substitute_staff_id, action, assignment_id = null) {
    if (!['accept', 'decline'].includes(action)) throw new Error('Invalid action');

    const newStatus  = action === 'accept' ? 'accepted' : 'declined';
    
    let updatedRows = [];
    if (assignment_id) {
      // Individual acceptance/decline
      const updated = await SubstituteModel.updateAssignmentStatus(assignment_id, newStatus);
      if (updated) updatedRows = [updated];
    } else {
      // Bulk acceptance/decline (fallback or if intended)
      updatedRows = await SubstituteModel.updateAllAssignmentsForSubstitute(
        leave_application_id, substitute_staff_id, newStatus
      );
    }

    if (!updatedRows || updatedRows.length === 0) throw new Error('No assignments found to update');

    // Get details for admin notification
    const fullApp = await LeaveModel.getApplicationById(leave_application_id);
    const subRow  = await db.query(
      `SELECT staff_first_name, staff_last_name, user_id FROM staff WHERE staff_id = $1`, [substitute_staff_id]
    );
    const sub = subRow.rows[0];
    const subName = sub ? `${sub.staff_first_name} ${sub.staff_last_name}` : 'A teacher';
    const teacherName = fullApp ? `${fullApp.staff_first_name} ${fullApp.staff_last_name}` : 'the teacher';

    // Notify all admin users
    const { rows: admins } = await db.query(`SELECT user_id FROM "user" WHERE role_id = 1`);
    for (const admin of admins) {
      if (action === 'accept') {
        const periodList = updatedRows
          .map(r => `P${r.period_number} on ${formatDate(r.assignment_date)}`)
          .join(', ');

        await NotificationModel.createNotification({
          user_id: admin.user_id,
          sender_user_id: sub?.user_id,
          related_leave_id: leave_application_id,
          title: `${subName} accepted substitute duty`,
          message: `${subName} has accepted ${assignment_id ? 'a' : 'all'} substitute period${updatedRows.length > 1 ? 's' : ''} for ${teacherName}'s leave: ${periodList}.`,
          type: 'SUBSTITUTE_ACCEPTED'
        });
      } else {
        const periodList = updatedRows
          .map(r => `P${r.period_number} on ${formatDate(r.assignment_date)}`)
          .join(', ');
        await NotificationModel.createNotification({
          user_id: admin.user_id,
          sender_user_id: sub?.user_id,
          related_leave_id: leave_application_id,
          title: `${subName} declined substitute duty`,
          message: `${subName} has declined substitute duty for ${teacherName}'s leave. Please manually reassign the following periods: ${periodList}.`,
          type: 'SUBSTITUTE_DECLINED'
        });
      }
    }

    return { success: true, updated_count: updatedRows.length };
  }
};
