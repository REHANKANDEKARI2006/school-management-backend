import ejs from 'ejs';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderLeavingCertPreview() {
  console.log("Rendering Leaving Certificate preview...");

  const templatePath = path.join(__dirname, '../templates/leaving-certificate/template1.ejs');
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
    date_of_birth: '2009-01-27',
    nationality: 'Indian',
    caste: 'General',
    place_of_birth: 'Miraj',
    reason_for_leaving: 'Completed Schooling'
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

  const pngPath = path.join(__dirname, 'leaving_certificate_preview.png');
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.screenshot({ path: pngPath, fullPage: true });

  await browser.close();

  console.log("✅ Leaving Certificate PNG preview rendered:", pngPath);
  process.exit(0);
}

renderLeavingCertPreview().catch(err => {
  console.error(err);
  process.exit(1);
});
