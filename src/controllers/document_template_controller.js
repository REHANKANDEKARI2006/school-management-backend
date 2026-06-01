import { DocumentTemplateModel } from '../models/document_template_model.js';
import { TemplateCustomContentModel } from '../models/template_custom_content_model.js';
import { DocumentService } from '../services/document_service.js';

export const getTemplatesByType = async (req, res) => {
  try {
    const { type } = req.params;
    if (!type) return res.status(400).json({ success: false, message: 'Type is required' });

    const templates = await DocumentTemplateModel.getTemplatesByType(type);
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching document templates:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'ID is required' });

    const template = await DocumentTemplateModel.getTemplateById(id);
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching document template by ID:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const saveTemplate = async (req, res) => {
  try {
    const { document_type, template_name, base_template_id, language, content, character_limit } = req.body;
    
    if (!document_type || !language || !content || !template_name || !base_template_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const sanitizedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    const saved = await DocumentTemplateModel.createTemplate(
      document_type, template_name, base_template_id, language, sanitizedContent, character_limit || null
    );

    res.status(200).json({ success: true, data: saved, message: 'Template saved successfully' });
  } catch (error) {
    console.error('Error saving document template:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'ID is required' });

    const deleted = await DocumentTemplateModel.deleteTemplate(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Template not found' });
    
    res.status(200).json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting document template:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getCustomContent = async (req, res) => {
  try {
    const { docType, templateId, language } = req.params;
    const content = await TemplateCustomContentModel.getContent(docType, templateId, language);
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    console.error('Error fetching custom content:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const saveCustomContent = async (req, res) => {
  try {
    const { document_type, template_id, language, title, paragraph, remarks } = req.body;
    
    if (!document_type || !template_id || !language) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Sanitize basic tags out just in case
    const stripHtml = (str) => (str ? str.replace(/<[^>]*>?/gm, '') : null);

    const saved = await TemplateCustomContentModel.upsertContent(
      document_type, template_id, language, 
      stripHtml(title), stripHtml(paragraph), stripHtml(remarks)
    );

    res.status(200).json({ success: true, data: saved, message: 'Custom content saved successfully' });
  } catch (error) {
    console.error('Error saving custom content:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const previewHtml = async (req, res) => {
  try {
    const { document_type, template_id, language, title, paragraph, remarks } = req.body;
    const stripHtml = (str) => (str ? str.replace(/<[^>]*>?/gm, '') : null);
    
    const html = await DocumentService.generatePreviewHtml(
      document_type, template_id, language,
      stripHtml(title), stripHtml(paragraph), stripHtml(remarks)
    );
    
    res.status(200).json({ success: true, html });
  } catch (error) {
    console.error('Error generating preview HTML:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
