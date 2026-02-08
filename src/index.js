import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

// NEW ROUTES
import bloodGroupRoutes from "./routes/blood_group_routes.js";
import sectionRoutes from "./routes/section_routes.js";

import departmentRoutes from "./routes/department_routes.js";
import subjectRoutes from "./routes/subject_routes.js";




dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

/* =====================
   MIDDLEWARES
===================== */

app.use(cors({
  origin: "http://localhost:3000",
}));

app.use(express.json());

/* =====================
   API ROUTES
===================== */

app.use("/api/auth", authRoutes);      // ✅ FIXED
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


// REGISTER ROUTES
app.use("/api/blood-groups", bloodGroupRoutes);
app.use("/api/sections", sectionRoutes);

app.use("/api/departments", departmentRoutes);
app.use("/api/subjects", subjectRoutes);



/* =====================
   SERVER START
===================== */

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
