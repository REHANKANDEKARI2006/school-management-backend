// src/routes/fees_routes.js
import { Router } from "express";
import { FeesController } from "../controllers/fees_controller.js";

const router = Router();

/* Fee Category */
router.get("/categories", FeesController.getAllCategories);
router.post("/categories", FeesController.createCategory);
router.patch("/categories/:id", FeesController.updateCategory);
router.delete("/categories/:id", FeesController.deleteCategory);

/* Fee Structure */
router.get("/structures", FeesController.getFeeStructures);
router.post("/structures", FeesController.createFeeStructure);

/* Fee Installments */
router.get("/installments/:fee_struct_id", FeesController.getInstallmentsByStructure);

/* Fee Collection */
router.post("/collect", FeesController.collectFee);
router.get("/collection/:student_id", FeesController.getStudentFeeCollection);
router.get("/status/class/:class_id", FeesController.getFeeStatusByClass);
router.get("/status/student/:student_id", FeesController.getStudentDetailedFeeStatus);

router.put("/structure", FeesController.updateFeeStructure);
router.delete("/structure", FeesController.deleteFeeStructure);

export default router;
