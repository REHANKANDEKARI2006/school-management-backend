import db from '../config/db.js';

export class TemplateCustomContentModel {
  static async upsertContent(documentType, templateId, language, title, paragraph, remarks) {
    const query = `
      INSERT INTO template_custom_content (document_type, template_id, language, title, paragraph, remarks, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (document_type, template_id, language) 
      DO UPDATE SET 
        title = EXCLUDED.title,
        paragraph = EXCLUDED.paragraph,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [documentType, templateId, language, title || null, paragraph || null, remarks || null];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async getContent(documentType, templateId, language) {
    const query = `
      SELECT * FROM template_custom_content 
      WHERE document_type = $1 AND template_id = $2 AND language = $3
    `;
    const { rows } = await db.query(query, [documentType, templateId, language]);
    return rows[0] || null;
  }
}
