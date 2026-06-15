import puppeteer from 'puppeteer';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { SchoolProfileModel } from '../models/school_profile_model.js';
import { StudentModel } from '../models/student_Model.js';
import { ClassModel } from '../models/class_Model.js';
import ScheduleModel from '../models/schedule_model.js';
import ExamsModel from '../models/exams_model.js';
import { AttendanceService } from './attendance_Service.js';
import { DocumentTemplateModel } from '../models/document_template_model.js';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DocumentService = {

  /**
   * Safely closes a Puppeteer browser instance.
   * On Windows, Chrome's child process sometimes cannot be terminated
   * (EBUSY / EPERM on the lockfile). Letting that error bubble up causes
   * an unhandled promise rejection that crashes the entire Node process.
   * This helper swallows those errors so the server stays alive.
   */
  async _safeBrowserClose(browser) {
    if (!browser) return;
    try {
      await browser.close();
    } catch (closeErr) {
      console.warn('[DocumentService] browser.close() warning (non-fatal):', closeErr.message);
    }
  },

  // Helper for live HTML previews
  async generatePreviewHtml(documentType, templateId, language, title, paragraph, remarks, instituteId) {
    // Generate dummy student and school data
    const student = {
      stu_first_name: 'John',
      stu_last_name: 'Doe',
      father_name: 'Richard Doe',
      mother_name: 'Jane Doe',
      student_id: 'STU12345',
      admission_no: 'ADM9876',
      class_name: 'X',
      section_name: 'A',
      date_of_birth: '2010-05-15',
      admission_date: '2020-06-01',
      religion: 'Christian',
      caste: 'General'
    };
    // Fetch actual school data if available
    let schoolProfile = {
      school_name: 'Demo International School',
      address: '123 Education Lane, Cityville',
      phone: '+1 234 567 8900',
      academic_year: '2024-25',
      logo_url: '',
      signature_url: '',
      stamp_url: ''
    };

    try {
      const realProfile = await SchoolProfileModel.getProfile(instituteId);
      if (realProfile) {
        schoolProfile = {
          ...schoolProfile,
          ...realProfile,
          logo_url: realProfile.logo_url || schoolProfile.logo_url,
          signature_url: realProfile.signature_url || schoolProfile.signature_url,
          stamp_url: realProfile.stamp_url || schoolProfile.stamp_url
        };
      }
    } catch (err) {
      console.warn("Failed to load school profile for preview", err);
    }

    let folder = 'bonafide';
    if (documentType === 'LEAVING_CERTIFICATE') folder = 'leaving-certificate';
    if (documentType === 'ACHIEVEMENT') folder = 'general';

    let baseTemplate = templateId || 'template1';
    let docTemplate = { title, paragraph, remarks }; // For preview, we use the provided ones

    if (baseTemplate.startsWith('custom_')) {
      const id = baseTemplate.split('_')[1];
      const record = await DocumentTemplateModel.getTemplateById(id);
      if (record) {
        baseTemplate = record.base_template_id;
      } else {
        baseTemplate = 'template1';
      }
    }

    const templatePath = path.join(__dirname, '..', 'templates', folder, `${baseTemplate}.ejs`);
    if (!fs.existsSync(templatePath)) return `<div style="padding:20px; color:red;">Template not found: ${baseTemplate}</div>`;

    const customTitle = await DocumentService._parsePlaceholders(docTemplate.title, student, schoolProfile);
    const rawParagraph = await DocumentService._parsePlaceholders(docTemplate.paragraph, student, schoolProfile);
    const customParagraph = rawParagraph ? rawParagraph.replace(/\n/g, '<br>') : null;
    const customRemarks = await DocumentService._parsePlaceholders(docTemplate.remarks, student, schoolProfile);

    const html = await ejs.renderFile(templatePath, {
      student,
      school: schoolProfile,
      logoUrl: '',
      signatureUrl: '',
      customTitle,
      customParagraph,
      customRemarks
    });
    return html;
  },

  /* Fetch a remote image and return a base64 data-URL so Puppeteer
     never needs to make external network calls during PDF rendering. */
  async _fetchImageAsBase64(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
    try {
      const { request } = url.startsWith('https') ? await import('https') : await import('http');
      return await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 6000);
        const req = request(url, (res) => {
          if (res.statusCode !== 200) { clearTimeout(timer); resolve(null); return; }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => {
            clearTimeout(timer);
            const mime = (res.headers['content-type'] || 'image/jpeg').split(';')[0];
            resolve(`data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`);
          });
          res.on('error', () => { clearTimeout(timer); resolve(null); });
        });
        req.on('error', () => { clearTimeout(timer); resolve(null); });
        req.end();
      });
    } catch { return null; }
  },

  async _renderCanvasToPdf(canvasLayout, student, schoolProfile, browser = null) {
    let shouldCloseBrowser = !browser;
    let currentBrowser = browser;

    try {
      const isA4 = canvasLayout.paperSize === 'A4';
      const isLandscape = canvasLayout.orientation === 'landscape';
      
      // Dimensions in pixels (standard for Puppeteer)
      let cardWidth, cardHeight, pdfWidth, pdfHeight;
      
      if (isA4) {
        cardWidth = isLandscape ? '842px' : '595px';
        cardHeight = isLandscape ? '595px' : '842px';
        pdfWidth = isLandscape ? '11.7in' : '8.27in';
        pdfHeight = isLandscape ? '8.27in' : '11.7in';
      } else {
        // Default to CR80 (ID Card)
        cardWidth = isLandscape ? '324px' : '204px';
        cardHeight = isLandscape ? '204px' : '324px';
        pdfWidth = isLandscape ? '3.375in' : '2.125in';
        pdfHeight = isLandscape ? '2.125in' : '3.375in';
      }

      // Generate QR code for student ID
      const admissionNo = String(student.admission_no || student.student_id || '0000');
      const qrDataUrl = await QRCode.toDataURL(admissionNo, { margin:1, width:80 });

      const elements = [...(canvasLayout.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      const templatePath = path.join(__dirname, '..', 'templates', 'id-card', 'canvas-renderer.ejs');
      const html = await ejs.renderFile(templatePath, {
        student,
        school: schoolProfile,
        elements,
        bgColor: canvasLayout.bgColor || '#ffffff',
        cardWidth,
        cardHeight,
        qrDataUrl
      });

      if (!currentBrowser) {
        currentBrowser = await puppeteer.launch({
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-gpu', '--no-first-run']
        });
      }
      
      const vWidth = parseInt(cardWidth);
      const vHeight = parseInt(cardHeight);

      const page = await currentBrowser.newPage();
      
      // Set viewport to match canvas precisely
      await page.setViewport({
        width: vWidth,
        height: vHeight,
        deviceScaleFactor: 2 // High quality
      });

      await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });

      const pdfOptions = {
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true
      };

      if (isA4) {
        pdfOptions.format = 'A4';
        pdfOptions.landscape = isLandscape;
        pdfOptions.scale = 1.33333333; // Fill 72DPI page with 96DPI CSS pixels
      } else {
        pdfOptions.width = pdfWidth;
        pdfOptions.height = pdfHeight;
      }

      const pdfBuffer = await page.pdf(pdfOptions);

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(currentBrowser);

      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(currentBrowser);
      throw err;
    }
  },

  async generateIdCard(studentId, userId, templateId = null, providedBrowser = null, instituteId = null) {
    let shouldCloseBrowser = !providedBrowser;
    let browser = providedBrowser;
    try {
      const student = await StudentModel.findById(studentId, instituteId);
      if (!student) throw new Error("Student not found");

      const schoolProfile = await SchoolProfileModel.getProfile(student.institute_id);
      if (!schoolProfile) throw new Error("School profile not configured");

      // template1 = portrait, template2 = landscape; template3 removed — fall back to template1
      const rawTemplate = templateId || schoolProfile.selected_id_card_template || 'template1';
      const selectedTemplate = (rawTemplate === 'template3') ? 'template1' : rawTemplate;
      const templatePath = path.join(__dirname, '..', 'templates', 'id-card', `${selectedTemplate}.ejs`);

      if (!fs.existsSync(templatePath)) throw new Error(`ID Card template not found: ${selectedTemplate}`);

      // Pre-fetch images as base64 so Puppeteer renders without external network calls
      const [photoDataUrl, logoDataUrl, signatureDataUrl] = await Promise.all([
        this._fetchImageAsBase64(student.profile_url),
        this._fetchImageAsBase64(schoolProfile.logo_url),
        this._fetchImageAsBase64(schoolProfile.signature_url),
      ]);

      const html = await ejs.renderFile(templatePath, {
        student, school: schoolProfile,
        photoDataUrl, logoDataUrl, signatureDataUrl
      });

      // Determine card dimensions (template2 is landscape, template1 is portrait)
      const isLandscape = selectedTemplate === 'template2';
      const vWidth  = isLandscape ? 324 : 204;
      const vHeight = isLandscape ? 204 : 324;
      const pdfW = isLandscape ? '3.375in' : '2.125in';
      const pdfH = isLandscape ? '2.125in' : '3.375in';

      if (!browser) {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-gpu', '--no-first-run'] });
      }

      const page = await browser.newPage();

      // All images are embedded as data URLs — block remaining external requests
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (type === 'image' || type === 'font' || type === 'stylesheet') {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setViewport({ width: vWidth, height: vHeight, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const pdfBuffer = await page.pdf({
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        width: pdfW, height: pdfH
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      if (userId) await this.logDocumentGeneration(studentId, 'ID_CARD', selectedTemplate, userId);
      return pdfBuffer;

    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating ID Card:", err);
      throw err;
    }
  },


  async _parsePlaceholders(templateText, student, school, event = null) {
    if (!templateText) return null;

    const sName = `${student.stu_first_name || ''} ${student.stu_last_name || ''}`.trim();
    const fName = student.father_name || '';
    const mName = student.mother_name || '';
    const dob = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : '';
    const issueDate = new Date().toLocaleDateString('en-GB');

    const map = {
      '{student_name}': sName,
      '{father_name}': fName,
      '{mother_name}': mName,
      '{class}': student.class_name || '',
      '{section}': student.section_name || '',
      '{dob}': dob,
      '{academic_year}': school?.academic_year || '',
      '{school_name}': school?.school_name || '',
      '{issue_date}': issueDate,
      '{admission_no}': student.admission_no || student.student_id || '',
      '{event_name}': event?.event_name || ''
    };

    let result = templateText;
    for (const [key, value] of Object.entries(map)) {
      result = result.split(key).join(value);
    }
    return result;
  },

  async renderWithBranding(docType, templatePath, data, instituteId = null) {
    try {
      const school = await SchoolProfileModel.getProfile(instituteId || data?.student?.institute_id);
      if (!school) throw new Error("School profile not configured");

      const docConfig = (school.document_config && school.document_config[docType]) || {
        header: true,
        footer: true,
        border: true,
        stamp: true,
        signature: true
      };

      const bodyHtml = await ejs.renderFile(templatePath, {
        ...data,
        school,
        config: docConfig
      });

      const layoutPath = path.join(__dirname, '..', 'templates', 'common', 'branding_layout.ejs');
      const html = await ejs.renderFile(layoutPath, {
        body: bodyHtml,
        school,
        config: docConfig,
        docType
      });

      return html;
    } catch (err) {
      console.error(`[DocumentService] Error in renderWithBranding for ${docType}:`, err);
      throw err;
    }
  },

  async generateBonafide(studentId, userId, templateId = null, providedBrowser = null, instituteId = null) {
    let shouldCloseBrowser = !providedBrowser;
    let browser = providedBrowser;
    try {
      const student = await StudentModel.findById(studentId, instituteId);
      if (!student) throw new Error("Student not found");

      const schoolProfile = await SchoolProfileModel.getProfile(student.institute_id);
      if (!schoolProfile) throw new Error("School profile not configured");

      let selectedTemplate = templateId || schoolProfile.selected_bonafide_template || 'template1';
      let docTemplate = null;
      let baseTemplate = selectedTemplate;

      if (selectedTemplate.startsWith('custom_')) {
        const id = selectedTemplate.split('_')[1];
        const record = await DocumentTemplateModel.getTemplateById(id);
        if (record) {
          baseTemplate = record.base_template_id;
          try {
            docTemplate = JSON.parse(record.content);
          } catch (e) {
            console.error("Failed to parse custom template content", e);
          }
        }
      }

      let templatePath = path.join(__dirname, '..', 'templates', 'bonafide', `${baseTemplate}.ejs`);

      if (!fs.existsSync(templatePath)) {
        console.warn(`[DocumentService] Bonafide template not found: ${baseTemplate}. Falling back to template1.`);
        baseTemplate = 'template1';
        templatePath = path.join(__dirname, '..', 'templates', 'bonafide', `${baseTemplate}.ejs`);
        if (!fs.existsSync(templatePath)) throw new Error(`Bonafide template not found: ${baseTemplate}`);
      }

      const customTitle = await DocumentService._parsePlaceholders(docTemplate?.title, student, schoolProfile);
      const rawParagraph = await DocumentService._parsePlaceholders(docTemplate?.paragraph, student, schoolProfile);
      const customParagraph = rawParagraph ? rawParagraph.replace(/\n/g, '<br>') : null;
      const customRemarks = await DocumentService._parsePlaceholders(docTemplate?.remarks, student, schoolProfile);

      const html = await ejs.renderFile(templatePath, {
        student,
        school: schoolProfile,
        logoUrl: schoolProfile.logo_url || '',
        signatureUrl: schoolProfile.signature_url || '',
        customTitle,
        customParagraph,
        customRemarks
      });

      if (!browser) {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run'] });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      if (userId) await this.logDocumentGeneration(studentId, 'BONAFIDE', selectedTemplate, userId);
      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating Bonafide:", err);
      throw err;
    }
  },


  async generateLeavingCertificate(studentId, userId, templateId = null, providedBrowser = null, instituteId = null) {
    let shouldCloseBrowser = !providedBrowser;
    let browser = providedBrowser;
    try {
      const student = await StudentModel.findById(studentId, instituteId);
      if (!student) throw new Error("Student not found");

      const schoolProfile = await SchoolProfileModel.getProfile(student.institute_id);
      if (!schoolProfile) throw new Error("School profile not configured");

      let selectedTemplate = templateId || schoolProfile.selected_leaving_certificate_template || 'template1';
      let docTemplate = null;
      let baseTemplate = selectedTemplate;

      if (selectedTemplate.startsWith('custom_')) {
        const id = selectedTemplate.split('_')[1];
        const record = await DocumentTemplateModel.getTemplateById(id);
        if (record) {
          baseTemplate = record.base_template_id;
          try {
            docTemplate = JSON.parse(record.content);
          } catch (e) {
            console.error("Failed to parse custom template content", e);
          }
        }
      }

      let templatePath = path.join(__dirname, '..', 'templates', 'leaving-certificate', `${baseTemplate}.ejs`);

      if (!fs.existsSync(templatePath)) {
        console.warn(`[DocumentService] Leaving Certificate template not found: ${baseTemplate}. Falling back to template1.`);
        baseTemplate = 'template1';
        templatePath = path.join(__dirname, '..', 'templates', 'leaving-certificate', `${baseTemplate}.ejs`);
        if (!fs.existsSync(templatePath)) throw new Error(`Leaving Certificate template not found: ${baseTemplate}`);
      }

      const customTitle = await DocumentService._parsePlaceholders(docTemplate?.title, student, schoolProfile);
      const rawParagraph = await DocumentService._parsePlaceholders(docTemplate?.paragraph, student, schoolProfile);
      const customParagraph = rawParagraph ? rawParagraph.replace(/\n/g, '<br>') : null;
      const customRemarks = await DocumentService._parsePlaceholders(docTemplate?.remarks, student, schoolProfile);

      const html = await ejs.renderFile(templatePath, {
        student,
        school: schoolProfile,
        logoUrl: schoolProfile.logo_url || '',
        signatureUrl: schoolProfile.signature_url || '',
        customTitle,
        customParagraph,
        customRemarks
      });

      if (!browser) {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run'] });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      if (userId) await this.logDocumentGeneration(studentId, 'LEAVING_CERTIFICATE', selectedTemplate, userId);
      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating Leaving Certificate:", err);
      throw err;
    }
  },

  async generateMarkSheet(studentId, userId = null, providedBrowser = null, templateId = null, instituteId = null) {
    let browser = providedBrowser;
    let shouldCloseBrowser = !providedBrowser;
    try {
      const student = await StudentModel.findById(studentId, instituteId);
      if (!student) throw new Error("Student not found");

      const school = await SchoolProfileModel.getProfile(student.institute_id);
      if (!school) throw new Error("School profile not configured");
      
      let marks = [];
      try {
        marks = await ExamsModel.getStudentFullReport(studentId);
      } catch (marksErr) {
        console.warn(`[DocumentService] Failed to fetch marks for student ${studentId}:`, marksErr.message);
        marks = []; // Fallback to empty marks list
      }

      const totalMarks = marks.reduce((sum, m) => sum + Number(m.marks_obtained || 0), 0);
      const maxTotal = marks.reduce((sum, m) => sum + Number(m.max_marks || 0), 0);
      const percentage = maxTotal > 0 ? ((totalMarks / maxTotal) * 100).toFixed(2) : 0;

      const templateName = templateId || school.selected_mark_sheet_template || 'template1';
      const templatePath = path.join(__dirname, '..', 'templates', 'mark-sheet', `${templateName}.ejs`);
      
      // We still use renderWithBranding for Mark Sheets because of complex tables
      // But we wrap it in a fallback if the template file is missing
      if (!fs.existsSync(templatePath)) {
        console.error(`[DocumentService] Marksheet template not found: ${templatePath}`);
        throw new Error("Marksheet template missing");
      }

      // Re-implementing a simple render for marksheets since we refactored renderWithBranding away
      const marksheetConfig = (school.document_config && school.document_config['MARK_SHEET']) || { 
        header: true, 
        footer: true, 
        border: true, 
        stamp: true, 
        signature: true 
      };

      const bodyHtml = await ejs.renderFile(templatePath, {
        student,
        marks,
        totalMarks,
        maxTotal,
        percentage,
        school,
        config: marksheetConfig
      });

      let html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;">
${bodyHtml}
</body>
</html>`;
      
      if (templateName === 'template1') {
        const layoutPath = path.join(__dirname, '..', 'templates', 'common', 'branding_layout.ejs');
        html = await ejs.renderFile(layoutPath, {
          body: bodyHtml,
          school,
          config: marksheetConfig,
          docType: 'MARK_SHEET'
        });
      }

      if (!browser) {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      if (userId) await this.logDocumentGeneration(studentId, 'MARK_SHEET', templateName, userId);
      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating mark sheet:", err);
      throw err;
    }
  },

  async generateGeneralCertificate(studentId, userId = null, templateId = null, providedBrowser = null, eventId = null, instituteId = null) {
    let shouldCloseBrowser = !providedBrowser;
    let browser = providedBrowser;
    try {
      const student = await StudentModel.findById(studentId, instituteId);
      if (!student) throw new Error("Student not found");

      const schoolProfile = await SchoolProfileModel.getProfile(student.institute_id);
      if (!schoolProfile) throw new Error("School profile not configured");

      let eventData = null;
      if (eventId) {
        const { default: EventsModel } = await import('../models/events_model.js');
        eventData = await EventsModel.getEventById(eventId);
      }

      let selectedTemplate = templateId || schoolProfile.selected_general_certificate_template || 'template1';
      let docTemplate = null;
      let baseTemplate = selectedTemplate;

      if (selectedTemplate.startsWith('custom_')) {
        const id = selectedTemplate.split('_')[1];
        const record = await DocumentTemplateModel.getTemplateById(id);
        if (record) {
          baseTemplate = record.base_template_id;
          try {
            docTemplate = JSON.parse(record.content);
          } catch (e) {
            console.error("Failed to parse custom template content", e);
          }
        }
      }

      let templatePath = path.join(__dirname, '..', 'templates', 'general', `${baseTemplate}.ejs`);

      if (!fs.existsSync(templatePath)) {
        console.warn(`[DocumentService] General Certificate template not found: ${baseTemplate}. Falling back to template1.`);
        baseTemplate = 'template1';
        templatePath = path.join(__dirname, '..', 'templates', 'general', `${baseTemplate}.ejs`);
        if (!fs.existsSync(templatePath)) throw new Error(`General Certificate template not found: ${baseTemplate}`);
      }

      const customTitle = await DocumentService._parsePlaceholders(docTemplate?.title, student, schoolProfile, eventData);
      const rawParagraph = await DocumentService._parsePlaceholders(docTemplate?.paragraph, student, schoolProfile, eventData);
      const customParagraph = rawParagraph ? rawParagraph.replace(/\n/g, '<br>') : null;
      const customRemarks = await DocumentService._parsePlaceholders(docTemplate?.remarks, student, schoolProfile, eventData);

      const html = await ejs.renderFile(templatePath, {
        student,
        school: schoolProfile,
        logoUrl: schoolProfile.logo_url || '',
        signatureUrl: schoolProfile.signature_url || '',
        customTitle,
        customParagraph,
        customRemarks
      });

      if (!browser) {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run'] });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      if (userId) await this.logDocumentGeneration(studentId, 'GENERAL_CERTIFICATE', selectedTemplate, userId);
      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating general certificate:", err);
      throw err;
    }
  },


  async generateFeeReceipt(paymentId, userId = null, providedBrowser = null, templateId = null, instituteId = null) {
    let browser = providedBrowser;
    let shouldCloseBrowser = !providedBrowser;
    try {
      const { FeesModel } = await import('../models/fees_model.js');
      const paymentQuery = await pool.query(
        `SELECT 
          fc.*, 
          fc_cat.category_name
         FROM fee_collection fc
         JOIN fee_structure fs ON fc.fee_struct_id = fs.fee_struct_id
         JOIN fee_category fc_cat ON fs.fee_cat_id = fc_cat.fee_category_id
         WHERE fc.collection_id = $1`,
        [paymentId]
      );
      if (paymentQuery.rows.length === 0) throw new Error("Payment record not found");
      const targetPayment = paymentQuery.rows[0];

      let payments = [targetPayment];

      // If this payment has a receipt number, fetch all sibling payments sharing the same receipt number
      if (targetPayment.receipt_no) {
        const siblingQuery = await pool.query(
          `SELECT 
            fc.*, 
            fc_cat.category_name
           FROM fee_collection fc
           JOIN fee_structure fs ON fc.fee_struct_id = fs.fee_struct_id
           JOIN fee_category fc_cat ON fs.fee_cat_id = fc_cat.fee_category_id
           WHERE fc.receipt_no = $1 AND fc.student_id = $2
           ORDER BY fc.collection_id ASC`,
          [targetPayment.receipt_no, targetPayment.student_id]
        );
        if (siblingQuery.rows.length > 0) {
          payments = siblingQuery.rows;
        }
      }

      // Use the first payment as the primary reference for metadata (receipt_no, date, mode, etc.)
      const payment = { ...payments[0] };

      // Consolidate particulars for all categories paid under this receipt
      payment.particulars = payments.map(p => ({
        name: p.category_name || "School Fees",
        amount: Number(p.amount_paid)
      }));

      // Calculate total consolidated amount paid
      const amount = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

      const student = await StudentModel.findById(payment.student_id, instituteId);
      if (!student) throw new Error("Student not found");

      const school = await SchoolProfileModel.getProfile(student.institute_id);
      if (!school) throw new Error("School profile not configured");

      // Fetch the overall pending balance for all fee structures assigned to the student's class
      const balanceQuery = await pool.query(
        `SELECT 
          fs.fee_struct_id,
          fs.amount AS structure_amount,
          COALESCE(
            (
              SELECT SUM(amount_paid) 
              FROM fee_collection 
              WHERE fee_struct_id = fs.fee_struct_id AND student_id = $1
            ),
            0
          ) AS total_paid
         FROM fee_structure fs
         JOIN class_enrollment ce ON ce.class_id = fs.class_id AND ce.status_id = 1
         WHERE ce.student_id = $1`,
        [payment.student_id]
      );

      let totalBalance = 0;
      balanceQuery.rows.forEach(row => {
        const bal = Number(row.structure_amount) - Number(row.total_paid);
        totalBalance += Math.max(0, bal);
      });

      const templateName = templateId || school.selected_fee_receipt_template || 'template1';
      let templatePath = path.join(__dirname, '..', 'templates', 'fee-receipt', `${templateName}.ejs`);

      if (!fs.existsSync(templatePath)) {
        console.warn(`[DocumentService] Fee receipt template not found: ${templateName}. Falling back to template1.`);
        const fallbackName = 'template1';
        templatePath = path.join(__dirname, '..', 'templates', 'fee-receipt', `${fallbackName}.ejs`);
        if (!fs.existsSync(templatePath)) throw new Error(`Fee receipt template not found: ${fallbackName}`);
      }

      const bodyHtml = await ejs.renderFile(templatePath, {
        student,
        payment,
        amount,
        school,
        balance: totalBalance,
        config: school.fee_receipt_config || {}
      });

      if (!browser) {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await browser.newPage();
      await page.setContent(bodyHtml, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      if (userId) await this.logDocumentGeneration(student.student_id, 'FEE_RECEIPT', templateName, userId);
      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating fee receipt:", err);
      throw err;
    }
  },

  async generateTimetable(classId, userId = null, providedBrowser = null, instituteId = null) {
    let browser = providedBrowser;
    let shouldCloseBrowser = !providedBrowser;
    try {
      console.log(`[DocumentService] Generating Timetable for class: ${classId}`);
      
      const schedules = await ScheduleModel.getByFilter({ class_id: classId });
      let className = "Unknown Class";

      if (schedules && schedules.length > 0) {
        className = `${schedules[0].class_name}${schedules[0].section_name ? ` - ${schedules[0].section_name}` : ""}`;
      } else {
        const classObj = await ClassModel.findById(classId);
        if (classObj) {
          className = `${classObj.class_name}${classObj.section_name ? ` - ${classObj.section_name}` : ""}`;
        }
      }

      // Group by period
      const periodMap = new Map();
      schedules.forEach(s => {
        if (!periodMap.has(s.period_number)) {
          const startTime = s.start_time ? String(s.start_time).substring(0, 5) : "--:--";
          const endTime = s.end_time ? String(s.end_time).substring(0, 5) : "--:--";
          
          periodMap.set(s.period_number, {
            period_number: s.period_number,
            timeRange: `${startTime} - ${endTime}`,
            isLunchBreak: s.is_break && schedules.filter(ss => ss.period_number === s.period_number).every(ss => ss.is_break),
            cells: []
          });
        }
        periodMap.get(s.period_number).cells.push(s);
      });

      const periods = Array.from(periodMap.values()).sort((a, b) => a.period_number - b.period_number);

      const templatePath = path.join(__dirname, '..', 'templates', 'common', 'timetable.ejs');
      
      const html = await this.renderWithBranding('TIMETABLE', templatePath, { 
        className,
        periods
      }, instituteId);

      if (!browser) {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: false,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating timetable:", err);
      throw err;
    }
  },

  async logDocumentGeneration(studentId, docType, templateId, userId) {
    try {
      if (!userId) return; 
      await pool.query(
        `INSERT INTO generated_documents (student_id, doc_type, template_id, generated_by)
         VALUES ($1, $2, $3, $4)`,
        [studentId, docType, templateId, userId]
      );
    } catch (err) {
      console.error("Failed to log document generation:", err);
    }
  },

  async generateBulkIdCards(studentIds, userId, templateId = 'template1', instituteId = null) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No student IDs provided");
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run']
      });

      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const pdfBuffer = await this.generateIdCard(id, userId, templateId, browser, instituteId);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating ID card for student ${id}:`, err);
        }
      }

      await this._safeBrowserClose(browser);
      const mergedPdfFile = await mergedPdf.save();
      return Buffer.from(mergedPdfFile);
    } catch (err) {
      await this._safeBrowserClose(browser);
      console.error("Error generating bulk ID cards:", err);
      throw err;
    }
  },


  async generateBulkBonafide(studentIds, userId, templateId = 'template1', instituteId = null) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No student IDs provided");
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run']
      });

      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const pdfBuffer = await this.generateBonafide(id, userId, templateId, browser, instituteId);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating Bonafide for student ${id}:`, err);
        }
      }

      await this._safeBrowserClose(browser);
      const mergedPdfFile = await mergedPdf.save();
      return Buffer.from(mergedPdfFile);
    } catch (err) {
      await this._safeBrowserClose(browser);
      console.error("Error generating bulk Bonafides:", err);
      throw err;
    }
  },

  async generateBulkGeneralCertificates(studentIds, userId, templateId = 'template1', eventId = null, instituteId = null) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No student IDs provided");
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run']
      });

      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const pdfBuffer = await this.generateGeneralCertificate(id, userId, templateId, browser, eventId, instituteId);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating General Certificate for student ${id}:`, err);
        }
      }

      await this._safeBrowserClose(browser);
      const mergedPdfFile = await mergedPdf.save();
      return Buffer.from(mergedPdfFile);
    } catch (err) {
      await this._safeBrowserClose(browser);
      console.error("Error generating bulk General Certificates:", err);
      throw err;
    }
  },
  async generateBulkLeavingCertificates(studentIds, userId, templateId = 'template1', instituteId = null) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No student IDs provided");
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run']
      });

      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const pdfBuffer = await this.generateLeavingCertificate(id, userId, templateId, browser, instituteId);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating Leaving Certificate for student ${id}:`, err);
        }
      }

      await this._safeBrowserClose(browser);
      const mergedPdfFile = await mergedPdf.save();
      return Buffer.from(mergedPdfFile);
    } catch (err) {
      await this._safeBrowserClose(browser);
      console.error("Error generating bulk Leaving Certificates:", err);
      throw err;
    }
  },

  async getTemplatePreview(type, templateId, instituteId = null) {
    let browser = null;
    try {
      const schoolProfile = await SchoolProfileModel.getProfile(instituteId);
      if (!schoolProfile) throw new Error("School profile not configured");

      // Placeholder data
      const student = {
        student_id: "12345",
        stu_first_name: "John",
        stu_last_name: "Doe",
        class_name: "X",
        section_name: "A",
        date_of_birth: new Date("2010-01-01"),
        blood_group: "O+",
        primary_contact: "+91 9876543210",
        father_name: "Richard Doe",
        address: "123, Sample Street, New Delhi",
        profile_url: null
      };

      // Map frontend type names to folder names
      const folderMap = {
        'id_card':             'id-card',
        'bonafide':            'bonafide',
        'mark_sheet':          'mark-sheet',
        'general_certificate': 'general',
        'fee_receipt':         'fee-receipt',
        'leaving_certificate': 'leaving-certificate',
      };
      
      const folderName = folderMap[type] || type;
      const templatePath = path.join(__dirname, '..', 'templates', folderName, `${templateId}.ejs`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${folderName}/${templateId}`);
      }

      const docTypeMap = {
        'id_card':             'ID_CARD',
        'bonafide':            'BONAFIDE',
        'mark_sheet':          'MARK_SHEET',
        'general_certificate': 'CERTIFICATE',
        'fee_receipt':         'FEE_RECEIPT',
        'leaving_certificate': 'LEAVING_CERTIFICATE',
      };
      const docType = docTypeMap[type] || 'OTHER';

      // Pre-fetch school logo and signature as base64 so real branding appears
      const [logoDataUrl, signatureDataUrl] = await Promise.all([
        this._fetchImageAsBase64(schoolProfile.logo_url),
        this._fetchImageAsBase64(schoolProfile.signature_url),
      ]);

      // Sample marks for mark-sheet preview
      const sampleMarks = [
        { subject_name: 'Mathematics',   max_marks: 100, obtained_marks: 85, grade: 'A' },
        { subject_name: 'Science',        max_marks: 100, obtained_marks: 78, grade: 'B' },
        { subject_name: 'English',        max_marks: 100, obtained_marks: 90, grade: 'A' },
        { subject_name: 'Social Studies', max_marks: 100, obtained_marks: 72, grade: 'B' },
        { subject_name: 'Hindi',          max_marks: 100, obtained_marks: 88, grade: 'A' },
      ];

      let html = "";
      if (docType === 'ID_CARD') {
        // ID card templates require these three vars — pass them explicitly to avoid ReferenceError
        html = await ejs.renderFile(templatePath, {
          student,
          school: schoolProfile,
          photoDataUrl: null,
          logoDataUrl,
          signatureDataUrl,
        });
      } else if (docType === 'BONAFIDE') {
        html = await ejs.renderFile(templatePath, {
          student,
          school: schoolProfile,
          logoUrl: logoDataUrl || schoolProfile.logo_url || '',
          signatureUrl: signatureDataUrl || schoolProfile.signature_url || '',
          customTitle: null, customParagraph: null, customRemarks: null,
        });
      } else if (docType === 'LEAVING_CERTIFICATE') {
        html = await ejs.renderFile(templatePath, {
          student,
          school: schoolProfile,
          logoUrl: logoDataUrl || schoolProfile.logo_url || '',
          signatureUrl: signatureDataUrl || schoolProfile.signature_url || '',
          customTitle: null, customParagraph: null, customRemarks: null,
        });
      } else if (docType === 'MARK_SHEET') {
        html = await ejs.renderFile(templatePath, {
          student,
          school: schoolProfile,
          marks: sampleMarks,
          totalMarks: 413,
          maxTotal: 500,
          percentage: '82.60',
          logoUrl: logoDataUrl || schoolProfile.logo_url || '',
          signatureUrl: signatureDataUrl || schoolProfile.signature_url || '',
        });
      } else if (docType === 'FEE_RECEIPT') {
        html = await ejs.renderFile(templatePath, {
          student,
          school: schoolProfile,
          logoUrl: logoDataUrl || schoolProfile.logo_url || '',
          signatureUrl: signatureDataUrl || schoolProfile.signature_url || '',
          payment: { receipt_no: '2026-0001', payment_date: new Date(), amount_paid: 4800, payment_mode: 'Cash' },
          amount: 4800,
        });
      } else {
        html = await this.renderWithBranding(docType, templatePath, { student, school: schoolProfile }, instituteId);
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });

      let pdfOptions = {
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      };

      if (folderName === 'id-card') {
        // Detect landscape (template2) vs portrait (template1) by templateId
        const isLandscape = templateId === 'template2';
        pdfOptions.width  = isLandscape ? '3.375in' : '2.125in';
        pdfOptions.height = isLandscape ? '2.125in' : '3.375in';
      } else if (folderName === 'fee-receipt') {
        pdfOptions.format = 'A4';
        pdfOptions.landscape = true;
      } else {
        pdfOptions.format = 'A4';
      }

      const pdfBuffer = await page.pdf(pdfOptions);
      await this._safeBrowserClose(browser);
      return pdfBuffer;
    } catch (err) {
      await this._safeBrowserClose(browser);
      console.error("Error generating template preview:", err);
      throw err;
    }
  },

  async getDocumentHistory(studentId) {
    try {
      const query = `
        SELECT 
          gd.id, 
          gd.doc_type, 
          gd.template_id, 
          gd.created_at as timestamp, 
          u.user_name as generated_by_name
        FROM generated_documents gd
        LEFT JOIN "user" u ON gd.generated_by = u.user_id
        WHERE gd.student_id = $1
        ORDER BY gd.created_at DESC
      `;
      const result = await pool.query(query, [studentId]);
      return result.rows;
    } catch (err) {
      console.error("Error fetching document history:", err);
      throw err;
    }
  },

  async generateMonthlyAttendancePDF(classId, month, year, userId, instituteId = null) {
    let browser = null;
    try {
      const yearInt = parseInt(year);
      const monthInt = parseInt(month);

      const school = await SchoolProfileModel.getProfile(instituteId);
      const report = await AttendanceService.getMonthlyReport(classId, monthInt, yearInt);
      
      const sql = `
        SELECT 
          c.class_name,
          s.section_name,
          st.staff_first_name,
          st.staff_last_name
        FROM class c
        LEFT JOIN section s ON s.section_id = c.section_id
        LEFT JOIN staff st ON st.staff_id = c.staff_id
        WHERE c.class_id = $1
      `;
      const classRes = await pool.query(sql, [classId]);
      const classInfo = classRes.rows[0];

      const classTeacherName = classInfo && classInfo.staff_first_name
        ? `${classInfo.staff_first_name} ${classInfo.staff_last_name || ''}`.trim()
        : 'Not Assigned';

      const daysInMonth = new Date(yearInt, monthInt, 0).getDate();
      const monthNames = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[monthInt - 1];

      const templatePath = path.join(__dirname, '../templates/attendance/monthly_sheet.ejs');
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      
      const html = ejs.render(templateContent, {
        school,
        ...report,
        className: classInfo ? `${classInfo.class_name} ${classInfo.section_name}` : 'N/A',
        monthName,
        daysInMonth,
        classTeacherName
      }, {
        filename: templatePath // CRITICAL: Required for relative includes in EJS
      });

      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run'],
        headless: "new"
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A3',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true, // Use the @page size from EJS
        margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
      });

      // Log activity if userId provided
      if (userId) {
        try {
          const { DashboardService } = await import("./dashboard_service.js");
          await DashboardService.addActivityEntry(
            userId,
            'attendance_report_download',
            `Downloaded Monthly Attendance: ${classInfo ? classInfo.class_name + ' ' + classInfo.section_name : 'N/A'} - ${monthName} ${yearInt}`,
            instituteId
          );
        } catch (e) { console.error("Logging error:", e); }
      }

      return pdfBuffer;
    } catch (error) {
      console.error('generateMonthlyAttendancePDF error:', error);
      throw error;
    } finally {
      await this._safeBrowserClose(browser);
    }
  },

  async generateBulkMarkSheets(studentIds, userId, templateId = null, instituteId = null) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) throw new Error("No student IDs");
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run'] });
      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const pdfBuffer = await this.generateMarkSheet(id, userId, browser, templateId, instituteId);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating MarkSheet for student ${id}:`, err);
        }
      }

      await this._safeBrowserClose(browser);
      return Buffer.from(await mergedPdf.save());
    } catch (err) {
      await this._safeBrowserClose(browser);
      throw err;
    }
  },

  /**
   * Generate a marksheet PDF for a specific student and exam.
   * Uses the school's selected marksheet template (template1 or template2).
   * Falls back to all marks if examName is not provided.
   */
  async generateMarksheetForExam(studentId, examName, userId = null, providedBrowser = null, instituteId = null) {
    let browser = providedBrowser;
    let shouldCloseBrowser = !providedBrowser;
    try {
      const student = await StudentModel.findById(studentId, instituteId);
      if (!student) throw new Error("Student not found");

      const school = await SchoolProfileModel.getProfile(student.institute_id);
      if (!school) throw new Error("School profile not configured");

      // Fetch marks for this specific exam
      let marks = [];
      if (examName) {
        const { rows } = await pool.query(
          `SELECT
             sub.subject_name,
             e.total_score AS max_marks,
             eg.marks_obtained AS obtained_marks,
             eg.grade
           FROM exam_grades eg
           JOIN exam e ON e.exam_id = eg.exam_id
           JOIN subject sub ON sub.subject_id = e.subject_id
           WHERE eg.student_id = $1 AND LOWER(e.exam_name) = LOWER($2) AND e.is_deleted = false
           ORDER BY sub.subject_name`,
          [studentId, examName]
        );
        marks = rows;
      } else {
        marks = await ExamsModel.getStudentFullReport(studentId);
      }

      const totalMarks = marks.reduce((sum, m) => sum + Number(m.obtained_marks || 0), 0);
      const maxTotal = marks.reduce((sum, m) => sum + Number(m.max_marks || 0), 0);
      const percentage = maxTotal > 0 ? ((totalMarks / maxTotal) * 100).toFixed(2) : 0;

      const templateName = school.selected_mark_sheet_template || 'template2';
      const templatePath = path.join(__dirname, '..', 'templates', 'mark-sheet', `${templateName}.ejs`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Marksheet template not found: ${templateName}`);
      }

      const marksheetConfig = (school.document_config && school.document_config['MARK_SHEET']) || {
        header: true, footer: true, border: true, stamp: true, signature: true
      };

      const bodyHtml = await ejs.renderFile(templatePath, {
        student,
        marks,
        totalMarks,
        maxTotal,
        percentage,
        school,
        config: marksheetConfig,
        examName: examName || 'All Exams'
      });

      let html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;">
${bodyHtml}
</body>
</html>`;

      // For template1, wrap with branding layout
      if (templateName === 'template1') {
        const layoutPath = path.join(__dirname, '..', 'templates', 'common', 'branding_layout.ejs');
        if (fs.existsSync(layoutPath)) {
          html = await ejs.renderFile(layoutPath, {
            body: bodyHtml,
            school,
            config: marksheetConfig,
            docType: 'MARK_SHEET'
          });
        }
      }

      if (!browser) {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await page.close();
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);

      if (userId) await this.logDocumentGeneration(studentId, 'MARK_SHEET', templateName, userId);
      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser) await this._safeBrowserClose(browser);
      console.error("[DocumentService] Error generating exam marksheet:", err);
      throw err;
    }
  },

  async generateBulkFeeReceipts(studentIds, userId, templateId = null, instituteId = null) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) throw new Error("No student IDs");
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run'] });
      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const res = await pool.query(
            "SELECT collection_id FROM fee_collection WHERE student_id = $1 ORDER BY payment_date DESC LIMIT 1",
            [id]
          );
          if (res.rows.length === 0) {
            console.log(`No fee collection found for student ${id}`);
            continue;
          }
          const paymentId = res.rows[0].collection_id;
          const pdfBuffer = await this.generateFeeReceipt(paymentId, userId, browser, templateId, instituteId);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating Fee Receipt for student ${id}:`, err);
        }
      }

      await this._safeBrowserClose(browser);
      if (mergedPdf.getPageCount() === 0) {
        throw new Error("NO_PAYMENTS_FOUND");
      }
      const savedPdf = await mergedPdf.save();
      // Wait, if no valid payments were found, mergedPdf might be empty.
      // PDFDocument.save() still works for empty docs, returning an empty PDF.
      return Buffer.from(savedPdf);
    } catch (err) {
      await this._safeBrowserClose(browser);
      throw err;
    }
  }
};
