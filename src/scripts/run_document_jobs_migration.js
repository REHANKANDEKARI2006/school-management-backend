import { createDocumentJobsTable } from '../migrations/20260729_document_jobs_table.js';

async function run() {
  console.log("Running document_jobs migration...");
  await createDocumentJobsTable();
  console.log("Migration complete!");
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
