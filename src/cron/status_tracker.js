import cron from "node-cron";
import { runWithQueryContext } from "../config/db.js";
import { HolidayService } from "../services/holiday_service.js";

export function startCronJobs() {
  // Holiday Cache Refresh: Runs every 24 hours at midnight
  cron.schedule('0 0 * * *', async () => {
    await runWithQueryContext('[CRON] holiday-refresh', 'cron', async () => {
      try {
        const year = new Date().getFullYear();
        await HolidayService.getHolidays(year);
        console.log(`[Cron] Holiday cache refreshed for ${year}`);
      } catch (err) {
        console.error("[Cron] Holiday refresh error:", err.message);
      }
    });
  });

  // Bulk Document Job Cleanup: Runs daily at 2 AM — deletes completed/failed jobs older than 7 days
  cron.schedule('0 2 * * *', async () => {
    await runWithQueryContext('[CRON] doc-job-cleanup', 'cron', async () => {
      try {
        const { DocumentJobsModel } = await import('../models/document_jobs_model.js');
        const deleted = await DocumentJobsModel.cleanupOldJobs(7);
        if (deleted > 0) {
          console.log(`[Cron] Cleaned up ${deleted} old bulk document job(s)`);
        }
      } catch (err) {
        console.error("[Cron] Document job cleanup error:", err.message);
      }
    });
  });

  console.log("⏰ Daily Holiday cache & Document job cleanup cron initialized.");
}
