import ejs from 'ejs';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExactGridRender() {
  console.log("Rendering exact Template 1 Bulk ID Card Grid...");

  const templatePath = path.join(__dirname, '../templates/id-card/grid-layout.ejs');
  const templateStr = fs.readFileSync(templatePath, 'utf8');

  // Sample students
  const sampleStudents = [
    { student_id: 37, stu_first_name: 'Atharv', stu_last_name: 'Patil', class_name: '10', section_name: 'A', date_of_birth: '2009-01-27', blood_group: 'B+', primary_contact: '8055571111', father_name: 'Prakash Patil', address: '16, College Road, Sangli, Maharashtra..' },
    { student_id: 38, stu_first_name: 'Anaya', stu_last_name: 'Sharma', class_name: '10', section_name: 'A', date_of_birth: '2009-03-15', blood_group: 'A+', primary_contact: '9822012345', father_name: 'Rajesh Sharma', address: '12, Ganesh Nagar, Sangli, Maharashtra' },
    { student_id: 39, stu_first_name: 'Daniel', stu_last_name: 'Snow', class_name: '10', section_name: 'A', date_of_birth: '2009-05-20', blood_group: 'O+', primary_contact: '9822099999', father_name: 'Ned Snow', address: '20, Civil Lines, Sangli, Maharashtra' },
    { student_id: 40, stu_first_name: 'Mariam', stu_last_name: 'Ansari', class_name: '10', section_name: 'A', date_of_birth: '2009-07-11', blood_group: 'AB+', primary_contact: '9822088888', father_name: 'Tariq Ansari', address: '15, Post-office Road, Sangli, Maharashtra' },
    { student_id: 41, stu_first_name: 'Meher', stu_last_name: 'Kaur', class_name: '10', section_name: 'A', date_of_birth: '2009-09-05', blood_group: 'B-', primary_contact: '9822077777', father_name: 'Jasbir Kaur', address: '30, Station Road, Sangli, Maharashtra' },
    { student_id: 42, stu_first_name: 'Riyansh', stu_last_name: 'Joshi', class_name: '10', section_name: 'A', date_of_birth: '2009-02-18', blood_group: 'A-', primary_contact: '9822066666', father_name: 'Sanjay Joshi', address: '4, Mission Compound, Sangli, Maharashtra' },
    { student_id: 43, stu_first_name: 'Sansa', stu_last_name: 'Stark', class_name: '10', section_name: 'A', date_of_birth: '2009-04-12', blood_group: 'O-', primary_contact: '9822055555', father_name: 'Eddard Stark', address: '10, Church Road, Sangli, Maharashtra' },
    { student_id: 44, stu_first_name: 'Shivraj', stu_last_name: 'Patil', class_name: '10', section_name: 'A', date_of_birth: '2009-08-28', blood_group: 'B+', primary_contact: '9822044444', father_name: 'Vikram Patil', address: '8, Kulkarni Road, Sangli, Maharashtra' },
    { student_id: 45, stu_first_name: 'Simran', stu_last_name: 'Kaur', class_name: '10', section_name: 'A', date_of_birth: '2009-10-30', blood_group: 'A+', primary_contact: '9822033333', father_name: 'Gurpreet Kaur', address: '25, Madhavnagar Road, Sangli, Maharashtra' },
    { student_id: 46, stu_first_name: 'Zayan', stu_last_name: 'Khan', class_name: '10', section_name: 'A', date_of_birth: '2009-12-06', blood_group: 'AB+', primary_contact: '9822022222', father_name: 'Imran Khan', address: '18, Gaonbhag Road, Sangli, Maharashtra' },
  ];

  const html = ejs.render(templateStr, {
    students: sampleStudents,
    school: {
      school_name: 'BLUE RIDGE ACADEMY',
      organization_name: 'BLUE RIDGE SCHOOL',
      address: 'Plot 5, Blue Ridge Lane',
      academic_year: '2025-26',
      document_theme: null,
      is_document_theme_enabled: false
    },
    logoDataUrl: null,
    signatureDataUrl: null,
    photoDataUrls: {}
  }, { filename: templatePath });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfPath = path.join(__dirname, 'exact_template1_grid.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  // Render PNG
  const pngPath = path.join(__dirname, 'exact_template1_grid.png');
  await page.setViewport({ width: 1400, height: 990, deviceScaleFactor: 2 });
  await page.screenshot({ path: pngPath, fullPage: true });

  await browser.close();

  console.log("✅ PDF & PNG saved successfully!");
  console.log("PDF:", pdfPath);
  console.log("PNG:", pngPath);

  process.exit(0);
}

testExactGridRender().catch(err => {
  console.error(err);
  process.exit(1);
});
