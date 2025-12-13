import express from "express";
import { 
  createExam, 
  getAllExams, 
  updateExamSchedule,
  enterGrades,
  viewResults,
  deleteExam
} from "../controllers/exams_controller.js";

const router = express.Router();

// Create New Exam
router.post("/", createExam);

// Get All Exams
router.get("/", getAllExams);

// Update Exam Schedule
router.put("/schedule/:id", updateExamSchedule);

// Enter Grades
router.post("/grades/:id", enterGrades);

// View Results
router.get("/results/:id", viewResults);

// Delete Exam
router.delete("/:id", deleteExam);

export default router;
