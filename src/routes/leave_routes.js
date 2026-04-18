import express from 'express';
import { LeaveController } from '../controllers/leave_controller.js';
import authMiddleware from '../middleware/auth_middleware.js';

const router = express.Router();

// Public endpoints
router.get('/types', LeaveController.getLeaveTypes);

// Admin stats & calendar
router.get('/admin-stats',          authMiddleware, LeaveController.getAdminStats);
router.get('/calendar',             authMiddleware, LeaveController.getCalendarData);

// Balance
router.get('/balance/:teacher_id',  authMiddleware, LeaveController.getBalance);
router.post('/init-balances',       authMiddleware, LeaveController.initBalances);

// Applications — teacher
router.post('/apply',               authMiddleware, LeaveController.applyForLeave);
router.get('/my-applications',      authMiddleware, LeaveController.getMyApplications);
router.patch('/cancel/:id',         authMiddleware, LeaveController.cancelApplication);

// Applications — admin
router.get('/pending',              authMiddleware, LeaveController.getPendingApplications);
router.get('/all',                  authMiddleware, LeaveController.getAllApplications);
router.get('/suggestions/:id',      authMiddleware, LeaveController.getSuggestions);
router.post('/approve/:id',         authMiddleware, LeaveController.approveWithSubstitutes);
router.post('/reject/:id',          authMiddleware, LeaveController.rejectLeave);

// Substitute duties
router.get('/my-duties',            authMiddleware, LeaveController.getMySubstituteDuties);
router.patch('/duties/respond',     authMiddleware, LeaveController.respondToSubstituteDuty);

// Individual application
router.get('/:id',                  authMiddleware, LeaveController.getApplicationById);

export default router;
