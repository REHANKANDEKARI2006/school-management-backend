import ejs from 'ejs';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExactBonafideRender() {
  console.log("Rendering exact Bonafide Certificate (Template 2 / Image 1)...");

  const templatePath = path.join(__dirname, '../templates/bonafide/template2.ejs');
  const templateStr = fs.readFileSync(templatePath, 'utf8');

  const sampleStudent = {
    student_id: 37,
    admission_no: '37',
    stu_first_name: 'Atharv',
    stu_last_name: 'Patil',
    father_name: 'Prakash Patil',
    mother_name: 'Meena Patil',
    class_name: '10',
    section_name: 'A',
    date_of_birth: '2009-01-27'
  };

  const sampleSchool = {
    school_name: 'BLUE RIDGE ACADEMY',
    organization_name: 'BLUE RIDGE SCHOOL',
    address: 'Plot 5, Blue Ridge Lane',
    phone: '080-66554477',
    academic_year: '2025-26',
    document_theme: null,
    is_document_theme_enabled: false
  };

  const html = ejs.render(templateStr, {
    student: sampleStudent,
    school: sampleSchool,
    logoUrl: null,
    signatureUrl: null,
    customTitle: undefined,
    customParagraph: undefined,
    customRemarks: undefined
  }, { filename: templatePath });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfPath = path.join(__dirname, 'exact_bonafide_template2.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true
  });

  const pngPath = path.join(__dirname, 'exact_bonafide_template2.png');
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page.screenshot({ path: pngPath, fullPage: true });

  await browser.close();

  console.log("✅ Bonafide Template 2 PDF & PNG generated successfully!");
  console.log("PDF:", pdfPath);
  console.log("PNG:", pngPath);

  process.exit(0);
}

testExactBonafideRender().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
