import puppeteer from 'puppeteer';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBonafideAndMarksheet() {
  console.log("Starting Bonafide Certificate & Marksheet rendering test...");

  // Mock School Profile
  const schoolProfile = {
    school_name: "SANJAY BHOKARE GROUP OF INSTITUTES",
    organization_name: "SHRI AMBABAI TALIM SANSTHA",
    accreditation_line: "Approved by AICTE, New Delhi & Govt. of Maharashtra",
    address: "Tilaknagar, Miraj-Sangli Road, Miraj - 416410",
    phone: "+91 233 2212408",
    email: "info@sbgimiraj.org",
    affiliation_number: "MBTE-48192",
    academic_year: "2025-26",
    principal_name: "DR. A. K. KULKARNI",
    logo_url: null,
    signature_url: null,
    stamp_url: null
  };

  // Mock Student
  const student = {
    student_id: 1042,
    admission_no: "ADM-2025-042",
    stu_first_name: "Rahul",
    stu_last_name: "Sharma",
    father_name: "Ramesh Sharma",
    mother_name: "Sunita Sharma",
    date_of_birth: "2010-08-15",
    class_name: "10",
    section_name: "A",
    roll_number: "24"
  };

  // Mock Subject Marks for Marksheet
  const marks = [
    { subject_name: "Mathematics", max_marks: 100, obtained_marks: 92, grade: "A+" },
    { subject_name: "Science & Technology", max_marks: 100, obtained_marks: 88, grade: "A" },
    { subject_name: "English Literature", max_marks: 100, obtained_marks: 85, grade: "A" },
    { subject_name: "Social Studies", max_marks: 100, obtained_marks: 79, grade: "B+" },
    { subject_name: "Hindi Language", max_marks: 100, obtained_marks: 90, grade: "A+" },
    { subject_name: "Computer Science", max_marks: 100, obtained_marks: 95, grade: "A+" }
  ];

  const totalMarks = marks.reduce((acc, m) => acc + m.obtained_marks, 0);
  const maxTotal = marks.reduce((acc, m) => acc + m.max_marks, 0);
  const percentage = ((totalMarks / maxTotal) * 100).toFixed(2);

  const outputDir = `C:\\Users\\Rehan\\.gemini\\antigravity-ide\\brain\\680f409e-af17-435b-9b93-c566bac61fd5`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Render Bonafide Certificate
  const bonafideTemplatePath = path.join(__dirname, '..', 'templates', 'bonafide', 'template1.ejs');
  const bonafideHtml = await ejs.renderFile(bonafideTemplatePath, {
    student,
    school: schoolProfile,
    logoUrl: null,
    signatureUrl: null,
    customTitle: "BONAFIDE CERTIFICATE",
    customParagraph: null,
    customRemarks: null
  });

  const page1 = await browser.newPage();
  await page1.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page1.setContent(bonafideHtml, { waitUntil: 'domcontentloaded' });

  const bonafidePdf = path.join(outputDir, 'test_bonafide_certificate.pdf');
  const bonafidePng = path.join(outputDir, 'test_bonafide_certificate.png');

  await page1.pdf({ path: bonafidePdf, format: 'A4', printBackground: true });
  await page1.screenshot({ path: bonafidePng, fullPage: true });
  await page1.close();
  console.log(`✅ Bonafide Certificate PDF generated: ${bonafidePdf}`);
  console.log(`✅ Bonafide Certificate PNG generated: ${bonafidePng}`);

  // 2. Render Marksheet
  const marksheetTemplatePath = path.join(__dirname, '..', 'templates', 'mark-sheet', 'template1.ejs');
  const marksheetHtml = await ejs.renderFile(marksheetTemplatePath, {
    student,
    school: schoolProfile,
    marks,
    totalMarks,
    maxTotal,
    percentage,
    examName: "Annual Examination 2025-26"
  });

  const page2 = await browser.newPage();
  await page2.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page2.setContent(marksheetHtml, { waitUntil: 'domcontentloaded' });

  const marksheetPdf = path.join(outputDir, 'test_marksheet.pdf');
  const marksheetPng = path.join(outputDir, 'test_marksheet.png');

  await page2.pdf({ path: marksheetPdf, format: 'A4', printBackground: true });
  await page2.screenshot({ path: marksheetPng, fullPage: true });
  await page2.close();
  console.log(`✅ Marksheet PDF generated: ${marksheetPdf}`);
  console.log(`✅ Marksheet PNG generated: ${marksheetPng}`);

  await browser.close();
  console.log("All tests completed successfully!");
  process.exit(0);
}

testBonafideAndMarksheet().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
