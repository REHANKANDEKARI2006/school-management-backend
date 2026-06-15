import dbProxy from '../config/db.js';

export const DocumentTemplateModel = {
  async getTemplateById(id, instituteId) {
    const query = `SELECT * FROM document_templates WHERE id = $1 AND institute_id = $2`;
    const result = await dbProxy.query(query, [id, instituteId]);
    return result.rows[0] || null;
  },

  async getTemplatesByType(documentType, instituteId) {
    const query = `
      SELECT id, document_type, template_name, base_template_id, language, character_limit, created_at
      FROM document_templates 
      WHERE document_type = $1 AND institute_id = $2
      ORDER BY created_at DESC
    `;
    const result = await dbProxy.query(query, [documentType, instituteId]);
    return result.rows;
  },

  async createTemplate(documentType, templateName, baseTemplateId, language, content, characterLimit, instituteId) {
    const query = `
      INSERT INTO document_templates (document_type, template_name, base_template_id, language, content, character_limit, institute_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await dbProxy.query(query, [documentType, templateName, baseTemplateId, language, content, characterLimit, instituteId]);
    return result.rows[0];
  },

  async deleteTemplate(id, instituteId) {
    const query = `DELETE FROM document_templates WHERE id = $1 AND institute_id = $2 RETURNING *`;
    const result = await dbProxy.query(query, [id, instituteId]);
    return result.rows[0];
  }
};
