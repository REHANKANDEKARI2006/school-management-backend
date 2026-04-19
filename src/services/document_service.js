import puppeteer from 'puppeteer';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { SchoolProfileModel } from '../models/school_profile_model.js';
import { StudentModel } from '../models/student_Model.js';
import ScheduleModel from '../models/schedule_model.js';
import ExamsModel from '../models/exams_model.js';
import { AttendanceService } from './attendance_Service.js';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DocumentService = {
  
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
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
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
      if (shouldCloseBrowser) await currentBrowser.close();

      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser && currentBrowser) await currentBrowser.close();
      throw err;
    }
  },

  async generateIdCard(studentId, userId, providedBrowser = null) {
    try {
      const student = await StudentModel.findById(studentId);
      if (!student) throw new Error("Student not found");

      const schoolProfile = await SchoolProfileModel.getProfile();
      if (!schoolProfile) throw new Error("School profile not configured");

      const idCardConfig = schoolProfile.id_card_config;
      let canvasLayout = (idCardConfig && idCardConfig.canvas_layout) ? idCardConfig.canvas_layout : null;

      if (!canvasLayout) {
        // Optimized basic layout if none configured
        const pc = schoolProfile.primary_color || '#dc2626';
        canvasLayout = {
          paperSize: 'CR80',
          orientation: 'portrait',
          bgColor: '#ffffff',
          elements: [
            { type:'rectangle', x:0,y:0,width:204,height:88,bgColor:pc,zIndex:1 },
            { type:'school_logo', x:82,y:10,width:40,height:40,borderRadius:20,zIndex:2 },
            { type:'text_box', text:'{{school_name}}', x:12,y:54,width:180,height:18,fontSize:9,fontWeight:'bold',textAlign:'center',textColor:'#ffffff',zIndex:2 },
            { type:'student_photo', x:72,y:78,width:60,height:60,borderRadius:30,borderWidth:3,borderColor:'#ffffff',zIndex:10 },
            { type:'student_name', x:12,y:162,width:180,height:18,fontSize:12,fontWeight:'bold',textAlign:'center',textColor:pc,zIndex:3 }
          ]
        };
      }

      const pdfBuffer = await this._renderCanvasToPdf(canvasLayout, student, schoolProfile, providedBrowser);
      if (userId) await this.logDocumentGeneration(studentId, 'ID_CARD', 'canvas', userId);
      return pdfBuffer;
    } catch (err) {
      console.error("[DocumentService] Error generating ID Card:", err);
      throw err;
    }
  },


  async generateBonafide(studentId, userId, providedBrowser = null) {
    try {
      const student = await StudentModel.findById(studentId);
      if (!student) throw new Error("Student not found");

      const schoolProfile = await SchoolProfileModel.getProfile();
      if (!schoolProfile) throw new Error("School profile not configured");

      const bonafideConfig = schoolProfile.bonafide_config || {};
      let canvasLayout = bonafideConfig.canvas_layout;

      if (!canvasLayout) {
        // Fallback default A4 Bonafide layout
        canvasLayout = {
          paperSize: 'A4',
          orientation: 'portrait',
          bgColor: '#ffffff',
          elements: [
            { type:'school_logo', x:267,y:40,width:60,height:60,zIndex:1 },
            { type:'text_box', text:'{{school_name}}', x:40,y:110,width:515,height:30,fontSize:20,fontWeight:'bold',textAlign:'center',zIndex:1 },
            { type:'text_box', text:'BONAFIDE CERTIFICATE', x:40,y:200,width:515,height:40,fontSize:24,fontWeight:'bold',textAlign:'center',textColor:'#1e293b',zIndex:1 },
            { type:'text_box', text:'This is to certify that {{student_name}} is a bonafide student of this institution.', x:60,y:300,width:475,height:100,fontSize:14,textAlign:'center',zIndex:1 },
            { type:'signature', x:400,y:700,width:120,height:50,zIndex:1 },
            { type:'text_box', text:'Principal Signature', x:400,y:755,width:120,height:20,fontSize:10,textAlign:'center',zIndex:1 }
          ]
        };
      }

      const pdfBuffer = await this._renderCanvasToPdf(canvasLayout, student, schoolProfile, providedBrowser);
      if (userId) await this.logDocumentGeneration(studentId, 'BONAFIDE', 'canvas', userId);
      return pdfBuffer;
    } catch (err) {
      console.error("[DocumentService] Error generating Bonafide:", err);
      throw err;
    }
  },

  async generateMarkSheet(studentId, userId = null, providedBrowser = null) {
    let browser = providedBrowser;
    let shouldCloseBrowser = !providedBrowser;
    try {
      const student = await StudentModel.findById(studentId);
      if (!student) throw new Error("Student not found");

      const school = await SchoolProfileModel.getProfile();
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

      const templateName = school.selected_mark_sheet_template || 'template1';
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

      const layoutPath = path.join(__dirname, '..', 'templates', 'common', 'branding_layout.ejs');
      const html = await ejs.renderFile(layoutPath, {
        body: bodyHtml,
        school,
        config: marksheetConfig,
        docType: 'MARK_SHEET'
      });

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
      if (shouldCloseBrowser) await browser.close();

      if (userId) await this.logDocumentGeneration(studentId, 'MARK_SHEET', templateName, userId);
      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser && browser) await browser.close();
      console.error("[DocumentService] Error generating mark sheet:", err);
      throw err;
    }
  },

  async generateGeneralCertificate(studentId, userId = null, providedBrowser = null) {
    try {
      const student = await StudentModel.findById(studentId);
      if (!student) throw new Error("Student not found");

      const schoolProfile = await SchoolProfileModel.getProfile();
      if (!schoolProfile) throw new Error("School profile not configured");

      const achievementConfig = schoolProfile.achievement_config || {};
      let canvasLayout = achievementConfig.canvas_layout;

      if (!canvasLayout) {
        // Fallback default A4 Achievement layout
        canvasLayout = {
          paperSize: 'A4',
          orientation: 'landscape',
          bgColor: '#ffffff',
          elements: [
            { type:'rectangle', x:0,y:0,width:842,height:595,bgColor:'#f8fafc',zIndex:1 },
            { type:'rectangle', x:20,y:20,width:802,height:555,borderWidth:4,borderColor:schoolProfile.primary_color || '#1e293b',zIndex:2 },
            { type:'school_logo', x:391,y:60,width:60,height:60,zIndex:3 },
            { type:'text_box', text:'CERTIFICATE OF ACHIEVEMENT', x:40,y:150,width:762,height:50,fontSize:32,fontWeight:'bold',textAlign:'center',textColor:schoolProfile.primary_color || '#1e293b',zIndex:3 },
            { type:'text_box', text:'This is presented to', x:40,y:220,width:762,height:25,fontSize:16,textAlign:'center',zIndex:3 },
            { type:'student_name', x:40,y:260,width:762,height:45,fontSize:36,fontWeight:'bold',textAlign:'center',zIndex:3 },
            { type:'text_box', text:'for outstanding performance in {{event}}', x:40,y:320,width:762,height:30,fontSize:18,textAlign:'center',zIndex:3 },
            { type:'signature', x:150,y:450,width:120,height:50,zIndex:3 },
            { type:'text_box', text:'Class Teacher', x:150,y:505,width:120,height:20,fontSize:12,textAlign:'center',zIndex:3 },
            { type:'stamp', x:391,y:430,width:60,height:60,zIndex:3 },
            { type:'signature', x:572,y:450,width:120,height:50,zIndex:3 },
            { type:'text_box', text:'Principal', x:572,y:505,width:120,height:20,fontSize:12,textAlign:'center',zIndex:3 }
          ]
        };
      }

      const pdfBuffer = await this._renderCanvasToPdf(canvasLayout, student, schoolProfile, providedBrowser);
      if (userId) await this.logDocumentGeneration(studentId, 'GENERAL_CERTIFICATE', 'canvas', userId);
      return pdfBuffer;
    } catch (err) {
      console.error("[DocumentService] Error generating general certificate:", err);
      throw err;
    }
  },

  async generateTimetable(classId, userId = null, providedBrowser = null) {
    let browser = providedBrowser;
    let shouldCloseBrowser = !providedBrowser;
    try {
      console.log(`[DocumentService] Generating Timetable for class: ${classId}`);
      
      const schedules = await ScheduleModel.getByFilter({ class_id: classId });
      
      if (!schedules || schedules.length === 0) {
        throw new Error("No schedule found for this class");
      }

      const className = `${schedules[0].class_name}${schedules[0].section_name ? ` - ${schedules[0].section_name}` : ""}`;

      // Group by period
      const periodMap = new Map();
      schedules.forEach(s => {
        if (!periodMap.has(s.period_number)) {
          periodMap.set(s.period_number, {
            period_number: s.period_number,
            timeRange: `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}`,
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
      });

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
      if (shouldCloseBrowser) await browser.close();

      return pdfBuffer;
    } catch (err) {
      if (shouldCloseBrowser && browser) await browser.close();
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

  async generateBulkIdCards(studentIds, userId) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No student IDs provided");
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const pdfBuffer = await this.generateIdCard(id, userId, browser);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating ID card for student ${id}:`, err);
        }
      }

      await browser.close();
      const mergedPdfFile = await mergedPdf.save();
      return Buffer.from(mergedPdfFile);
    } catch (err) {
      if (browser) await browser.close();
      console.error("Error generating bulk ID cards:", err);
      throw err;
    }
  },

  async generateBulkBonafide(studentIds, userId) {
    let browser = null;
    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No student IDs provided");
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const mergedPdf = await PDFDocument.create();

      for (const id of studentIds) {
        try {
          const pdfBuffer = await this.generateBonafide(id, userId, browser);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error generating Bonafide for student ${id}:`, err);
        }
      }

      await browser.close();
      const mergedPdfFile = await mergedPdf.save();
      return Buffer.from(mergedPdfFile);
    } catch (err) {
      if (browser) await browser.close();
      console.error("Error generating bulk Bonafides:", err);
      throw err;
    }
  },

  async getTemplatePreview(type, templateId) {
    let browser = null;
    try {
      const schoolProfile = await SchoolProfileModel.getProfile();
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
        profile_url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
      };

      const logoUrl = schoolProfile.logo_url || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
      const signatureUrl = schoolProfile.signature_url || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";

      // Map frontend type names to folder names
      const folderMap = {
        'id_card': 'id-card',
        'bonafide': 'bonafide',
        'mark_sheet': 'mark-sheet',
        'general_certificate': 'general'
      };
      
      const folderName = folderMap[type] || type;
      const templatePath = path.join(__dirname, '..', 'templates', folderName, `${templateId}.ejs`);
      
      const docTypeMap = {
        'id_card': 'ID_CARD',
        'bonafide': 'BONAFIDE',
        'mark_sheet': 'MARK_SHEET',
        'general_certificate': 'CERTIFICATE'
      };
      const docType = docTypeMap[type] || 'OTHER';

      let html = "";
      if (docType === 'ID_CARD' || docType === 'BONAFIDE') {
         html = await ejs.renderFile(templatePath, { student, school: schoolProfile });
      } else {
         html = await this.renderWithBranding(docType, templatePath, { student });
      }

      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      let pdfOptions = {
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      };

      if (folderName === 'id-card') {
        pdfOptions.width = '2.125in';
        pdfOptions.height = '3.375in';
      } else {
        pdfOptions.format = 'A4';
      }

      const pdfBuffer = await page.pdf(pdfOptions);
      await browser.close();
      return pdfBuffer;
    } catch (err) {
      if (browser) await browser.close();
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

  async generateMonthlyAttendancePDF(classId, month, year, userId) {
    let browser = null;
    try {
      const yearInt = parseInt(year);
      const monthInt = parseInt(month);

      const school = await SchoolProfileModel.getProfile();
      const report = await AttendanceService.getMonthlyReport(classId, monthInt, yearInt);
      
      const sql = `
        SELECT 
          c.class_name,
          s.section_name
        FROM class c
        JOIN section s ON s.section_id = c.section_id
        WHERE c.class_id = $1
      `;
      const classRes = await pool.query(sql, [classId]);
      const classInfo = classRes.rows[0];

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
        daysInMonth
      }, {
        filename: templatePath // CRITICAL: Required for relative includes in EJS
      });

      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A3',
        landscape: true,
        printBackground: true,
        margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
      });

      // Log activity if userId provided
      if (userId) {
        try {
          const { DashboardService } = await import("./dashboard_service.js");
          await DashboardService.addActivityEntry(
            userId,
            'attendance_report_download',
            `Downloaded Monthly Attendance: ${classInfo ? classInfo.class_name + ' ' + classInfo.section_name : 'N/A'} - ${monthName} ${yearInt}`
          );
        } catch (e) { console.error("Logging error:", e); }
      }

      return pdfBuffer;
    } catch (error) {
      console.error('generateMonthlyAttendancePDF error:', error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }
};
