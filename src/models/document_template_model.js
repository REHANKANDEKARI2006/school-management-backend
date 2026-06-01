import dbProxy from '../config/db.js';

export const DocumentTemplateModel = {
  async getTemplateById(id) {
    const query = `SELECT * FROM document_templates WHERE id = $1`;
    const result = await dbProxy.query(query, [id]);
    return result.rows[0] || null;
  },

  async getTemplatesByType(documentType) {
    const query = `
      SELECT id, document_type, template_name, base_template_id, language, character_limit, created_at
      FROM document_templates 
      WHERE document_type = $1
      ORDER BY created_at DESC
    `;
    const result = await dbProxy.query(query, [documentType]);
    return result.rows;
  },

  async createTemplate(documentType, templateName, baseTemplateId, language, content, characterLimit) {
    const query = `
      INSERT INTO document_templates (document_type, template_name, base_template_id, language, content, character_limit)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await dbProxy.query(query, [documentType, templateName, baseTemplateId, language, content, characterLimit]);
    return result.rows[0];
  },

  async deleteTemplate(id) {
    const query = `DELETE FROM document_templates WHERE id = $1 RETURNING *`;
    const result = await dbProxy.query(query, [id]);
    return result.rows[0];
  }
};
