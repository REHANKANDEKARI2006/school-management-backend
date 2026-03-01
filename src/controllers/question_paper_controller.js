// src/controllers/question_paper_controller.js
import QuestionPaperModel from "../models/question_paper_model.js";

const QuestionPaperController = {

    async savePaper(req, res) {
        try {
            const data = await QuestionPaperModel.saveQuestionPaper(req.body);
            res.json({ success: true, message: "Question paper saved", data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    async getPaperByExam(req, res) {
        try {
            const exam_id = req.params.exam_id;
            const data = await QuestionPaperModel.getQuestionPaperByExamId(exam_id);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

};

export default QuestionPaperController;
