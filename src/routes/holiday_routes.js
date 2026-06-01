import express from 'express';
import { HolidayController } from '../controllers/holiday_controller.js';
import authMiddleware from '../middleware/auth_middleware.js';
import { allowRoles } from '../middleware/role_middleware.js';

const router = express.Router();

// Public/General (Protected by main auth)
// GET /api/holidays?year=...&month=...
router.get('/', authMiddleware, HolidayController.getHolidays);

// Admin / Management only
const adminGroup = [1]; // Reserved exclusively for MASTER_ADMIN (1)

router.get('/custom', 
  authMiddleware, 
  allowRoles(...adminGroup), 
  HolidayController.getCustomHolidays
);

router.post('/custom', 
  authMiddleware, 
  allowRoles(...adminGroup), 
  HolidayController.createCustomHoliday
);

router.put('/custom/:id', 
  authMiddleware, 
  allowRoles(...adminGroup), 
  HolidayController.updateCustomHoliday
);

router.delete('/custom/:id', 
  authMiddleware, 
  allowRoles(...adminGroup), 
  HolidayController.deleteCustomHoliday
);

export default router;
