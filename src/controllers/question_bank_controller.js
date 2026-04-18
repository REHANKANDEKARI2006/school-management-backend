// src/controllers/question_bank_controller.js
import QuestionBankModel from "../models/question_bank_model.js";

const QuestionBankController = {

  // POST /api/question-bank — add a single question
  async addQuestion(req, res) {
    try {
      const data = await QuestionBankModel.addQuestion(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/question-bank/bulk — add multiple questions (CSV import)
  async bulkAdd(req, res) {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions) || !questions.length) {
        return res.status(400).json({ success: false, message: 'questions array is required' });
      }
      const data = await QuestionBankModel.bulkAdd(questions);
      res.status(201).json({ success: true, count: data.length, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/question-bank — search/filter questions
  async search(req, res) {
    try {
      const { class_name, subject, chapter, question_type, difficulty, search, limit, offset } = req.query;
      const data = await QuestionBankModel.search({
        class_name, subject, chapter, question_type, difficulty, search,
        limit:  limit  ? parseInt(limit)  : 50,
        offset: offset ? parseInt(offset) : 0
      });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/question-bank/:id — get one question (with answer for teacher)
  async getById(req, res) {
    try {
      const data = await QuestionBankModel.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Question not found' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PATCH /api/question-bank/:id — update question
  async update(req, res) {
    try {
      const data = await QuestionBankModel.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/question-bank/:id — delete question
  async delete(req, res) {
    try {
      await QuestionBankModel.delete(req.params.id);
      res.json({ success: true, message: 'Question deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default QuestionBankController;
