import { DocumentService } from '../services/document_service.js';

async function testSingleMarksheet() {
  console.log("Verifying single-student marksheet generation remains functional...");
  try {
    const pdfBuffer = await DocumentService.generateMarkSheet(37, 1);
    console.log(`✅ Single student marksheet generated successfully! (Buffer size: ${pdfBuffer.length} bytes)`);
    process.exit(0);
  } catch (err) {
    console.error("Single student marksheet check failed:", err.message);
    process.exit(1);
  }
}

testSingleMarksheet();
