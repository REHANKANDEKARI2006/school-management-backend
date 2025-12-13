import express from 'express';
import studentRoutes from "./routes/student_routes.js";
// import facultyRoutes from "./routes/faculty_Routes.js";
import classRoutes from "./routes/class_routes.js";
import attendanceRoutes from "./routes/attendance_routes.js";
import feesRoutes from "./routes/fees_routes.js";
import scheduleRoutes from "./routes/schedule_routes.js";
import examsRoutes from "./routes/exams_routes.js";
import eventsRoutes from "./routes/events_routes.js";
import materialsRoutes from "./routes/materials_routes.js";
import noticeRoutes from "./routes/notice_routes.js";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// JSON middleware only once
app.use(express.json());

// Routes
app.use("/students", studentRoutes);
// app.use("/faculty", facultyRoutes);
app.use("/classes", classRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/fees", feesRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/exams", examsRoutes);
app.use("/events", eventsRoutes);
app.use("/materials", materialsRoutes);
app.use("/notices", noticeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
