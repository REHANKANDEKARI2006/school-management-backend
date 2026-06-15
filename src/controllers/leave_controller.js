/**
 * leave_controller.js — Leave Management Controller (Rebuilt)
 */

import { LeaveService } from '../services/leave_service.js';
import { LeaveModel } from '../models/leave_Model.js';
import { SubstituteModel } from '../models/substitute_Model.js';
import { NotificationModel } from '../models/notification_Model.js';
import db from '../config/db.js';

export const LeaveController = {

  // GET /api/leaves/types
  async getLeaveTypes(req, res) {
    try {
      const types = await LeaveModel.getAllLeaveTypes();
      res.json({ success: true, data: types });
    } catch (err) {
      console.error('getLeaveTypes error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/balance/:teacher_id?academic_year=2025-2026
  async getBalance(req, res) {
    try {
      const { teacher_id } = req.params;
      const { academic_year } = req.query;
      const balance = await LeaveModel.getLeaveBalance(teacher_id, academic_year || '2025-2026', req.instituteId);
      res.json({ success: true, data: balance });
    } catch (err) {
      console.error('getBalance error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/leaves/init-balances
  async initBalances(req, res) {
    try {
      const { academic_year } = req.body;
      const result = await LeaveModel.initBalancesForYear(academic_year || '2025-2026', req.instituteId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('initBalances error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/leaves/apply
  async applyForLeave(req, res) {
    try {
      const result = await LeaveService.applyForLeave(req.body, req.user, req.instituteId);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error('applyForLeave error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/my-applications?teacher_id=...
  async getMyApplications(req, res) {
    try {
      const teacher_id = req.query.teacher_id || req.params.teacher_id;
      if (!teacher_id) return res.status(400).json({ success: false, error: 'teacher_id required' });
      const applications = await LeaveModel.getApplicationsByTeacher(teacher_id, req.instituteId);
      res.json({ success: true, data: applications });
    } catch (err) {
      console.error('getMyApplications error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/:id
  async getApplicationById(req, res) {
    try {
      const { id } = req.params;
      const application = await LeaveModel.getApplicationById(id, req.instituteId);
      if (!application) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: application });
    } catch (err) {
      console.error('getApplicationById error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/pending
  async getPendingApplications(req, res) {
    try {
      const applications = await LeaveModel.getPendingApplications(req.instituteId);
      res.json({ success: true, data: applications });
    } catch (err) {
      console.error('getPendingApplications error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/all?teacher_name=&leave_type_id=&status=&from_date=&to_date=
  async getAllApplications(req, res) {
    try {
      const filters = {
        teacher_name:  req.query.teacher_name,
        leave_type_id: req.query.leave_type_id,
        status:        req.query.status,
        from_date:     req.query.from_date,
        to_date:       req.query.to_date
      };
      const applications = await LeaveModel.getAllApplications(req.instituteId, filters);
      res.json({ success: true, data: applications });
    } catch (err) {
      console.error('getAllApplications error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/admin-stats
  async getAdminStats(req, res) {
    try {
      const stats = await LeaveModel.getAdminStats(req.instituteId);
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('getAdminStats error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/suggestions/:id
  async getSuggestions(req, res) {
    try {
      const { id } = req.params;
      const suggestions = await LeaveService.getSubstituteSuggestions(id, req.instituteId);
      res.json({ success: true, data: suggestions });
    } catch (err) {
      console.error('getSuggestions error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/leaves/approve/:id
  async approveWithSubstitutes(req, res) {
    try {
      const { id } = req.params;
      const { assignments, remarks } = req.body;
      const result = await LeaveService.approveLeaveWithSubstitutes(
        parseInt(id), assignments || [], req.user.user_id, remarks, req.instituteId
      );
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('approveWithSubstitutes error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // POST /api/leaves/reject/:id
  async rejectLeave(req, res) {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      const result = await LeaveService.rejectLeave(parseInt(id), req.user.user_id, remarks, req.instituteId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('rejectLeave error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // PATCH /api/leaves/cancel/:id
  async cancelApplication(req, res) {
    try {
      const { id } = req.params;
      const { teacher_id } = req.query;
      if (!teacher_id) return res.status(400).json({ success: false, error: 'teacher_id required' });
      const result = await LeaveService.cancelLeave(parseInt(id), parseInt(teacher_id), req.instituteId);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('cancelApplication error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/my-duties?staff_id=...
  async getMySubstituteDuties(req, res) {
    try {
      const { staff_id } = req.query;
      if (!staff_id) return res.status(400).json({ success: false, error: 'staff_id required' });
      const duties = await SubstituteModel.getAssignmentsBySubstituteTeacher(staff_id, req.instituteId);
      res.json({ success: true, data: duties });
    } catch (err) {
      console.error('getMySubstituteDuties error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // PATCH /api/leaves/duties/respond
  async respondToSubstituteDuty(req, res) {
    try {
      const { leave_application_id, substitute_staff_id, action, assignment_id } = req.body;
      if (!leave_application_id || !substitute_staff_id || !action) {
        return res.status(400).json({ success: false, error: 'leave_application_id, substitute_staff_id, and action are required' });
      }
      const result = await LeaveService.respondToSubstituteDuty(
        parseInt(leave_application_id), parseInt(substitute_staff_id), action, assignment_id ? parseInt(assignment_id) : null, req.instituteId
      );
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('respondToSubstituteDuty error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/calendar?year=2025&month=4
  async getCalendarData(req, res) {
    try {
      const year  = parseInt(req.query.year)  || new Date().getFullYear();
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const leaves = await LeaveModel.getApprovedLeavesForMonth(req.instituteId, year, month);
      res.json({ success: true, data: leaves });
    } catch (err) {
      console.error('getCalendarData error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/available-teachers?date=2026-06-01&period_number=3&leave_application_id=5
  async getAvailableTeachers(req, res) {
    try {
      const { date, period_number, leave_application_id } = req.query;
      if (!date || !period_number) {
        return res.status(400).json({ success: false, error: 'date and period_number are required' });
      }
      const teachers = await LeaveService.getAvailableTeachersForPeriod(
        date, parseInt(period_number), leave_application_id ? parseInt(leave_application_id) : null, req.instituteId
      );
      res.json({ success: true, data: teachers });
    } catch (err) {
      console.error('getAvailableTeachers error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/leaves/stream
  async stream(req, res) {
    try {
      LeaveService.registerSSEConnection(req, res);
    } catch (err) {
      console.error('stream error:', err);
      res.status(500).end();
    }
  }
};

