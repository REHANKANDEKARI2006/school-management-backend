import { DocumentService } from '../services/document_service.js';

async function testAllDocs() {
  const studentId = 600;
  const userId = 1;
  const instituteId = 3;

  console.log('🧪 Testing all document generators...');

  // 1. ID Card
  try {
    const pdf = await DocumentService.generateIdCard(studentId, userId, 'template1', null, instituteId);
    console.log(`✅ ID Card: ${pdf.length} bytes`);
  } catch (err) {
    console.error(`❌ ID Card error:`, err.message);
  }

  // 2. Bonafide
  try {
    const pdf = await DocumentService.generateBonafide(studentId, userId, 'template1', null, instituteId);
    console.log(`✅ Bonafide: ${pdf.length} bytes`);
  } catch (err) {
    console.error(`❌ Bonafide error:`, err.message);
  }

  // 3. Leaving Certificate
  try {
    const pdf = await DocumentService.generateLeavingCertificate(studentId, userId, 'template1', null, instituteId);
    console.log(`✅ Leaving Certificate: ${pdf.length} bytes`);
  } catch (err) {
    console.error(`❌ Leaving Certificate error:`, err.message);
  }

  // 4. Mark Sheet
  try {
    const pdf = await DocumentService.generateMarkSheet(studentId, userId, 'template1', null, instituteId);
    console.log(`✅ Mark Sheet: ${pdf.length} bytes`);
  } catch (err) {
    console.error(`❌ Mark Sheet error:`, err.message);
  }

  // 5. General Certificate
  try {
    const pdf = await DocumentService.generateGeneralCertificate(studentId, userId, 'template1', null, instituteId);
    console.log(`✅ General Certificate: ${pdf.length} bytes`);
  } catch (err) {
    console.error(`❌ General Certificate error:`, err.message);
  }

  // 6. Timetable
  try {
    const pdf = await DocumentService.generateTimetable(1, userId, null, instituteId);
    console.log(`✅ Timetable: ${pdf.length} bytes`);
  } catch (err) {
    console.error(`❌ Timetable error:`, err.message);
  }

  process.exit(0);
}

testAllDocs();
