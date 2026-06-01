import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import studentRoutes from "./routes/student_routes.js";
import facultyRoutes from "./routes/faculty_routes.js";
import classRoutes from "./routes/class_routes.js";
import attendanceRoutes from "./routes/attendance_routes.js";
import feesRoutes from "./routes/fees_routes.js";
import scheduleRoutes from "./routes/schedule_routes.js";
import examsRoutes from "./routes/exams_routes.js";
import eventsRoutes from "./routes/events_routes.js";
import materialsRoutes from "./routes/materials_routes.js";
import noticeRoutes from "./routes/notice_routes.js";
import authRoutes from "./routes/auth_routes.js";
import holidayRoutes from "./routes/holiday_routes.js";
import { HolidayService } from "./services/holiday_service.js";
import { seedMasterAdmin } from "./scripts/seed_master_admin.js";
import { emailService } from "./services/email_service.js";

// Cron Jobs
import { startCronJobs } from "./cron/status_tracker.js";

// NEW ROUTES
import bloodGroupRoutes from "./routes/blood_group_routes.js";
import sectionRoutes from "./routes/section_routes.js";

import departmentRoutes from "./routes/department_routes.js";
import subjectRoutes from "./routes/subject_routes.js";
import questionPaperRoutes from "./routes/question_paper_routes.js";
import paperFormatTemplatesRoutes from "./routes/paper_format_templates_routes.js";
import questionBankRoutes from "./routes/question_bank_routes.js";
import schoolProfileRoutes from "./routes/school_profile_routes.js";
import documentRoutes from "./routes/document_routes.js";
import dashboardRoutes from "./routes/dashboard_routes.js";
import uploadRoutes from "./routes/upload_routes.js";
import userStatusRoutes from "./routes/user_status_routes.js";
import leaveRoutes from "./routes/leave_routes.js";
import notificationRoutes from "./routes/notification_routes.js";
import promotionRoutes from "./routes/promotion_routes.js";
import documentTemplateRoutes from "./routes/document_template_routes.js";


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
   origin: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
   exposedHeaders: ["Content-Disposition", "Authorization"],
   credentials: true,
   preflightContinue: false,
   optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/public', express.static('public'));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/exams", examsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/blood-groups", bloodGroupRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/question-papers", questionPaperRoutes);
app.use("/api/paper-format-templates", paperFormatTemplatesRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/school-profile", schoolProfileRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user-status", userStatusRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/promotion", promotionRoutes);
app.use("/api/document-templates", documentTemplateRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Backend Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, '0.0.0.0', async () => {
   console.log(`✅ Backend server running on http://0.0.0.0:${PORT}`);
   startCronJobs();
   seedMasterAdmin();

   // Verify Email SMTP on startup
   emailService.verify();

   // Prime Holiday Cache on Startup
   const currentYear = new Date().getFullYear();
   HolidayService.getHolidays(currentYear).then(() => {
     console.log(`✅ Initialized holiday cache for ${currentYear}`);
   }).catch(err => {
     console.error("Failed to initialize holiday cache:", err.message);
   });
});
