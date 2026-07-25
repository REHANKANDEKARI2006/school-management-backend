import express from 'express';
import { LeaveController } from '../controllers/leave_controller.js';
import authMiddleware from '../middleware/auth_middleware.js';
import instituteMiddleware from '../middleware/institute_middleware.js';
import { allowRoles } from '../middleware/role_middleware.js';

const router = express.Router();

// Public endpoints
router.get('/types', LeaveController.getLeaveTypes);
router.get('/stream', LeaveController.stream);

// All protected endpoints require auth and institute isolation
router.use(authMiddleware);
router.use(instituteMiddleware);

// Admin stats & calendar
router.get('/admin-stats',          allowRoles(1, 2, 21), LeaveController.getAdminStats);
router.get('/calendar',             allowRoles(1, 2, 3, 4, 5, 21), LeaveController.getCalendarData);

// Balance
router.get('/balance/:teacher_id',  allowRoles(1, 2, 3, 4, 5, 21), LeaveController.getBalance);
router.post('/init-balances',       allowRoles(1, 2), LeaveController.initBalances);

// Applications — teacher
router.post('/apply',               allowRoles(3, 4, 5, 6, 7, 8, 9, 10, 11, 12), LeaveController.applyForLeave);
router.get('/my-applications',      allowRoles(3, 4, 5, 6, 7, 8, 9, 10, 11, 12), LeaveController.getMyApplications);
router.patch('/cancel/:id',         allowRoles(3, 4, 5, 6, 7, 8, 9, 10, 11, 12), LeaveController.cancelApplication);

// Applications — admin
router.get('/pending',              allowRoles(1, 2, 21), LeaveController.getPendingApplications);
router.get('/all',                  allowRoles(1, 2, 21), LeaveController.getAllApplications);
router.get('/suggestions/:id',      allowRoles(1, 2, 21), LeaveController.getSuggestions);
router.post('/approve/:id',         allowRoles(1, 2, 21), LeaveController.approveWithSubstitutes);
router.post('/reject/:id',          allowRoles(1, 2, 21), LeaveController.rejectLeave);

// Substitute duties
router.get('/my-duties',            allowRoles(3, 4, 5, 6, 7, 8, 9, 10, 11, 12), LeaveController.getMySubstituteDuties);
router.patch('/duties/respond',     allowRoles(3, 4, 5, 6, 7, 8, 9, 10, 11, 12), LeaveController.respondToSubstituteDuty);

// Available teachers for manual substitute selection (must be before /:id)
router.get('/available-teachers',     allowRoles(1, 2, 21), LeaveController.getAvailableTeachers);

// Individual application
router.get('/:id',                  allowRoles(1, 2, 3, 4, 5, 21), LeaveController.getApplicationById);

export default router;
