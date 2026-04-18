// src/routes/question_bank_routes.js
import { Router } from "express";
import QuestionBankController from "../controllers/question_bank_controller.js";

const router = Router();

router.get("/",          QuestionBankController.search);      // GET  /api/question-bank
router.post("/",         QuestionBankController.addQuestion); // POST /api/question-bank
router.post("/bulk",     QuestionBankController.bulkAdd);     // POST /api/question-bank/bulk
router.get("/:id",       QuestionBankController.getById);     // GET  /api/question-bank/:id
router.patch("/:id",     QuestionBankController.update);      // PATCH /api/question-bank/:id
router.delete("/:id",    QuestionBankController.delete);      // DELETE /api/question-bank/:id

export default router;
