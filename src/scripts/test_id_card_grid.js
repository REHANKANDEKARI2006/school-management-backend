import puppeteer from 'puppeteer';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import pool from '../config/db.js';
import { SchoolProfileModel } from '../models/school_profile_model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testIdCardGrid() {
  console.log("Starting ID Card Grid rendering test...");

  // 1. Fetch real or mock students
  let students = [];
  try {
    const { rows } = await pool.query(`
      SELECT
        s.student_id,
        s.stu_first_name,
        s.stu_last_name,
        s.email,
        s.address,
        s.date_of_birth,
        s.profile_url,
        s.admission_no,
        bg.blood_group,
        g.grdn_first_name AS father_name,
        g.phone AS primary_contact,
        c.class_name,
        sec.section_name
      FROM student s
      LEFT JOIN blood_group bg ON bg.bg_id = s.bg_id
      LEFT JOIN guardian g ON g.student_id = s.student_id
      LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
      LEFT JOIN class c ON c.class_id = ce.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      WHERE s.is_deleted = FALSE
      LIMIT 10
    `);
    students = rows;
  } catch (err) {
    console.warn("Could not fetch students from DB, using mock data:", err.message);
  }

  // Fallback mock students if DB yields fewer than 10
  while (students.length < 10) {
    const idx = students.length + 1;
    students.push({
      student_id: 1000 + idx,
      stu_first_name: `Student${idx}`,
      stu_last_name: `Demo`,
      email: `student${idx}@demo.com`,
      address: `${100 + idx} Knowledge Park, Sector 4, Tech City`,
      date_of_birth: '2010-05-15',
      profile_url: null,
      admission_no: `ADM-2026-${String(idx).padStart(3, '0')}`,
      blood_group: ['A+', 'B+', 'O+', 'AB+'][idx % 4],
      father_name: `Parent of Student ${idx}`,
      primary_contact: `+91 98765432${String(idx).padStart(2, '0')}`,
      class_name: `${(idx % 5) + 8}`,
      section_name: ['A', 'B', 'C'][idx % 3]
    });
  }

  // 2. Fetch school profile
  let schoolProfile = await SchoolProfileModel.getProfile(1);
  if (!schoolProfile) {
    schoolProfile = {
      school_name: "SANJAY BHOKARE GROUP OF INSTITUTES",
      organization_name: "SHRI AMBABAI TALIM SANSTHA",
      accreditation_line: "Approved by AICTE, New Delhi & Govt. of Maharashtra",
      address: "Tilaknagar, Miraj-Sangli Road, Miraj - 416410",
      academic_year: "2025-26",
      principal_name: "DIRECTOR",
      logo_url: null,
      signature_url: null
    };
  } else {
    schoolProfile = {
      ...schoolProfile,
      school_name: schoolProfile.school_name || "SANJAY BHOKARE GROUP OF INSTITUTES",
      organization_name: schoolProfile.organization_name || "SHRI AMBABAI TALIM SANSTHA",
      accreditation_line: schoolProfile.accreditation_line || "Approved by AICTE & Govt. of Maharashtra",
      principal_name: schoolProfile.principal_name || "DIRECTOR"
    };
  }

  // 3. Generate QR codes & mock photos
  const photoDataUrls = {};
  const qrDataUrls = {};

  for (const stu of students) {
    const qrText = String(stu.admission_no || stu.student_id || '0000');
    qrDataUrls[stu.student_id] = await QRCode.toDataURL(qrText, { margin: 1, width: 120 });
  }

  // 4. Render EJS template
  const templatePath = path.join(__dirname, '..', 'templates', 'id-card', 'grid-layout.ejs');
  const html = await ejs.renderFile(templatePath, {
    students,
    school: schoolProfile,
    logoDataUrl: null,
    signatureDataUrl: null,
    photoDataUrls,
    qrDataUrls,
    cardStartIndex: 1
  });

  // 5. Puppeteer render to PDF & PNG screenshot
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 990, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const outputDir = `C:\\Users\\Rehan\\.gemini\\antigravity-ide\\brain\\680f409e-af17-435b-9b93-c566bac61fd5`;

  const pdfPath = path.join(outputDir, 'test_id_cards_grid.pdf');
  const pngPath = path.join(outputDir, 'test_id_cards_grid.png');

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await page.screenshot({
    path: pngPath,
    fullPage: true
  });

  await browser.close();
  console.log(`✅ ID Card Grid test PDF generated at: ${pdfPath}`);
  console.log(`✅ ID Card Grid test PNG preview generated at: ${pngPath}`);
  process.exit(0);
}

testIdCardGrid().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
