// src/controllers/question_paper_controller.js
import { fileURLToPath } from 'url';
import path from 'path';
import puppeteer from 'puppeteer';
import ejs from 'ejs';
import QuestionPaperModel from "../models/question_paper_model.js";
import { SchoolProfileModel } from "../models/school_profile_model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QuestionPaperController = {
  // GET /api/question-papers/upcoming-exams
  async getUpcomingExams(req, res) {
    try {
      const data = await QuestionPaperModel.getUpcomingExams();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/question-papers/draft
  async createDraft(req, res) {
    try {
      const data = await QuestionPaperModel.createDraft(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/question-papers/:id
  async getById(req, res) {
    try {
      const data = await QuestionPaperModel.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Paper not found' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/question-papers
  async list(req, res) {
    try {
      const { class_id, subject_id, status, is_template, limit, offset } = req.query;
      const data = await QuestionPaperModel.list({
        class_id, subject_id, status, is_template,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PATCH /api/question-papers/:id
  async updatePaper(req, res) {
    try {
      const data = await QuestionPaperModel.updatePaper(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/question-papers/:id/publish
  async publishPaper(req, res) {
    try {
      const data = await QuestionPaperModel.updatePaper(req.params.id, { status: 'Published' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/question-papers/:id
  async deletePaper(req, res) {
    try {
      await QuestionPaperModel.delete(req.params.id);
      res.json({ success: true, message: 'Paper deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/question-papers/:id/duplicate
  async duplicate(req, res) {
    try {
      const { title } = req.body;
      const data = await QuestionPaperModel.duplicate(req.params.id, title);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/question-papers/:paper_id/sections
  async upsertSection(req, res) {
    try {
      const data = await QuestionPaperModel.upsertSection(req.body.section_id, req.params.paper_id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/question-papers/sections/:section_id/questions
  async upsertQuestion(req, res) {
    try {
      const data = await QuestionPaperModel.upsertQuestion(req.body.question_id, req.params.section_id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/question-papers/sections/:section_id
  async deleteSection(req, res) {
    try {
      await QuestionPaperModel.deleteSection(req.params.section_id);
      res.json({ success: true, message: 'Section deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/question-papers/questions/:question_id
  async deleteQuestion(req, res) {
    try {
      await QuestionPaperModel.deleteQuestion(req.params.question_id);
      res.json({ success: true, message: 'Question deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/question-papers/:id/generate-pdf
  async generatePDF(req, res) {
    let browser = null;
    try {
      const paper = await QuestionPaperModel.getById(req.params.id);
      if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

      const school = await SchoolProfileModel.getProfile();
      const generateAnswerKey = req.body.generateAnswerKey === true;
      const config = (school && school.document_config && school.document_config['EXAMINATION_PAPER']) || { header: true, footer: true };

      let html = req.body.html;
      if (!html) {
        const templatePath = path.join(__dirname, '..', 'templates', 'question-paper', 'revamped_paper.ejs');
        html = await ejs.renderFile(templatePath, { paper, school, generateAnswerKey, config });
      }

      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: req.body.html ? { top: '0', bottom: '0', left: '0', right: '0' } : {
          top: '5mm',
          bottom: '5mm',
          left: '5mm',
          right: '5mm'
        },
        preferCSSPageSize: true
      });
      await browser.close();

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              req.user?.user_id,
              'paper_generated',
              `Question paper generated: ${paper.title}`
          );
      } catch (e) { console.error(e); }

      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF generation failed:", err);
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default QuestionPaperController;
