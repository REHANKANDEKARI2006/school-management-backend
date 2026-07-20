import { DocumentService } from '../services/document_service.js';

async function testIdCard() {
  try {
    console.log('Testing ID card generation for student ID 600...');
    const pdfBuffer = await DocumentService.generateIdCard(600, 1, 'template1', null, 3);
    console.log(`✅ ID Card PDF generated successfully! Buffer length: ${pdfBuffer.length} bytes`);
  } catch (err) {
    console.error('❌ ID Card generation failed:', err);
  }
  process.exit(0);
}

testIdCard();
