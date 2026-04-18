import { Router } from 'express';
import { NotificationController } from '../controllers/notification_controller.js';
import authMiddleware from '../middleware/auth_middleware.js';

const router = Router();

router.get('/my-notifications',     authMiddleware, NotificationController.getMyNotifications);
router.get('/unread-count',         authMiddleware, NotificationController.getUnreadCount);
router.patch('/:id/read',           authMiddleware, NotificationController.markAsRead);
router.patch('/read-all',           authMiddleware, NotificationController.markAllAsRead);

export default router;
