import ejs from 'ejs';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderPreview() {
  console.log("Rendering General Certificate / Certificate of Recognition preview...");

  const templatePath = path.join(__dirname, '../templates/general/template1.ejs');
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
    customTitle: 'CERTIFICATE OF RECOGNITION',
    customParagraph: 'For outstanding contribution and academic excellence in school activities during the academic session 2025-26.',
    customRemarks: undefined
  }, { filename: templatePath });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pngPath = path.join(__dirname, 'general_certificate_preview.png');
  await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });
  await page.screenshot({ path: pngPath, fullPage: true });

  await browser.close();

  console.log("✅ General Certificate PNG preview rendered:", pngPath);
  process.exit(0);
}

renderPreview().catch(err => {
  console.error(err);
  process.exit(1);
});
