import express from 'express';
import { 
  getTemplatesByType, getTemplateById, saveTemplate, deleteTemplate,
  getCustomContent, saveCustomContent, previewHtml 
} from '../controllers/document_template_controller.js';
import authMiddleware from '../middleware/auth_middleware.js';
import { allowRoles } from '../middleware/role_middleware.js';

const router = express.Router();

// Custom Content Editor Endpoints
router.get('/custom-content/:docType/:templateId/:language', authMiddleware, allowRoles(1, 21), getCustomContent);
router.post('/custom-content', authMiddleware, allowRoles(1, 21), saveCustomContent);
router.post('/preview-html', authMiddleware, allowRoles(1, 21), previewHtml);

// Legacy/Base Template Endpoints
router.get('/all/:type', authMiddleware, allowRoles(1, 21), getTemplatesByType);
router.get('/:id', authMiddleware, allowRoles(1, 21), getTemplateById);
router.post('/', authMiddleware, allowRoles(1, 21), saveTemplate);
router.delete('/:id', authMiddleware, allowRoles(1, 21), deleteTemplate);

export default router;
