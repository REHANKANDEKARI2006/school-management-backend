import cron from "node-cron";
import pool from "../config/db.js";
import { computeStatus } from "../utils/computeStatus.js";
import { HolidayService } from "../services/holiday_service.js";

const statusCache = new Map();

export function startCronJobs() {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Fetch events
      const eventRes = await pool.query("SELECT * FROM events");
      eventRes.rows.forEach(event => {
        // Assume 'cancelled' might be stored in a status field, ignore if so
        if (event.status === 'cancelled' || event.computed_status === 'cancelled') return;
        
        const newStatus = computeStatus(event, now);
        const oldStatus = statusCache.get(`event_${event.event_id}`) || event.status || 'unknown';
        
        if (oldStatus !== newStatus && oldStatus !== 'unknown') {
          console.log(`[Event Transition] ID: ${event.event_id} | ${oldStatus} -> ${newStatus}`);
        }
        statusCache.set(`event_${event.event_id}`, newStatus);
      });

      // Fetch exams
      const examRes = await pool.query("SELECT * FROM exam");
      examRes.rows.forEach(exam => {
        if (exam.status === 'cancelled' || exam.computed_status === 'cancelled') return;
        
        const newStatus = computeStatus(exam, now);
        const oldStatus = statusCache.get(`exam_${exam.exam_id}`) || exam.status || 'unknown';
        
        if (oldStatus !== newStatus && oldStatus !== 'unknown') {
          console.log(`[Exam Transition] ID: ${exam.exam_id} | ${oldStatus} -> ${newStatus}`);
        }
        statusCache.set(`exam_${exam.exam_id}`, newStatus);
      });

    } catch (err) {
      console.error("Cron Job Error:", err.message);
    }
  });

  // Holiday Cache Refresh: Runs every 24 hours at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const year = new Date().getFullYear();
      await HolidayService.getHolidays(year);
      console.log(`[Cron] Holiday cache refreshed for ${year}`);
    } catch (err) {
      console.error("[Cron] Holiday refresh error:", err.message);
    }
  });

  console.log("⏰ Runtime Event/Exam status tracker & Holiday cache cron initialized.");
}
