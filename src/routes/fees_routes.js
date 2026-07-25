import { Router } from "express";
import { FeesController } from "../controllers/fees_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(instituteMiddleware);

/* Fee Category */
router.get("/categories", allowRoles(1, 2, 3, 4, 11, 18, 20), FeesController.getAllCategories);
router.post("/categories", allowRoles(1, 2, 11), FeesController.createCategory);
router.patch("/categories/:id", allowRoles(1, 2, 11), FeesController.updateCategory);
router.delete("/categories/:id", allowRoles(1, 2, 11), FeesController.deleteCategory);

/* Fee Structure */
router.get("/structures", allowRoles(1, 2, 3, 4, 11, 18, 20), FeesController.getFeeStructures);
router.post("/structures", allowRoles(1, 2, 11), FeesController.createFeeStructure);

/* Fee Installments */
router.get("/installments/:fee_struct_id", allowRoles(1, 2, 3, 4, 11, 18, 20), FeesController.getInstallmentsByStructure);

/* Fee Collection */
router.post("/collect", allowRoles(1, 2, 11), FeesController.collectFee);
router.get("/collection/:student_id", allowRoles(1, 2, 3, 4, 11, 18, 20), FeesController.getStudentFeeCollection);
router.get("/status/class/:class_id", allowRoles(1, 2, 3, 4, 11), FeesController.getFeeStatusByClass);
router.get("/status/student/:student_id", allowRoles(1, 2, 3, 4, 11, 18, 20), FeesController.getStudentDetailedFeeStatus);

router.put("/structure", allowRoles(1, 2, 11), FeesController.updateFeeStructure);
router.delete("/structure", allowRoles(1, 2, 11), FeesController.deleteFeeStructure);

export default router;
