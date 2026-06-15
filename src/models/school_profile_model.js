import pool from "../config/db.js";

export const SchoolProfileModel = {
  async getProfile(instituteId) {
    const id = instituteId || 3;
    const { rows } = await pool.query(`SELECT * FROM school_profile WHERE id = $1`, [id]);
    if (rows.length > 0) {
      return rows[0];
    }

    try {
      const instRes = await pool.query(
        "SELECT name, email, phone, address, logo_url FROM institute WHERE institute_id = $1",
        [id]
      );
      if (instRes.rows.length > 0) {
        const inst = instRes.rows[0];
        const insertQuery = `
          INSERT INTO school_profile (
            id, school_name, organization_name, email, phone, address, principal_name, logo_url, academic_year,
            selected_id_card_template, selected_bonafide_template, selected_mark_sheet_template,
            selected_general_certificate_template, selected_leaving_certificate_template, selected_fee_receipt_template
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *;
        `;
        const insertRes = await pool.query(insertQuery, [
          id,
          inst.name || "School Name",
          inst.name || "Organization Name",
          inst.email || "school@demo.edu.in",
          inst.phone || "+1 234 567 8900",
          inst.address || "School Address",
          "Principal Name",
          inst.logo_url || "",
          "2026-27",
          "template1",
          "template1",
          "template1",
          "template1",
          "template1",
          "template1"
        ]);
        return insertRes.rows[0];
      }
    } catch (err) {
      console.error("Failed to create default school profile:", err);
    }
    return null;
  },

  async upsertProfile(instituteId, data) {
    const id = instituteId;
    if (!id) {
      throw new Error("instituteId is required to update school profile");
    }
    const {
      school_name, address, phone, email, affiliation_number, principal_name,
      logo_url, signature_url, primary_color, academic_year,
      selected_id_card_template, selected_bonafide_template,
      selected_mark_sheet_template, selected_general_certificate_template, selected_leaving_certificate_template,
      secondary_logo_url, stamp_url, header_layout_type, footer_text,
      show_watermark, document_config, id_card_config,
      school_type, accreditation_line, website_url, organization_name,
      header_bg_color, header_text_color, separator_style, separator_color, separator_thickness,
      footer_bg_color, footer_text_color, footer_left_text, footer_right_text, page_number_format, show_generation_date,
      cashier_signature_url, bonafide_config, achievement_config,
      selected_fee_receipt_template, fee_receipt_config, document_theme, is_document_theme_enabled
    } = data;

    // Check if profile exists
    const existing = await this.getProfile(id);

    if (existing) {
      if (school_name) {
        await pool.query('UPDATE institute SET name = $1 WHERE institute_id = $2', [school_name, id]);
      }
      // Update
      const { rows } = await pool.query(
        `UPDATE school_profile SET 
          school_name = COALESCE($1, school_name),
          address = COALESCE($2, address),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          affiliation_number = COALESCE($5, affiliation_number),
          principal_name = COALESCE($6, principal_name),
          logo_url = COALESCE($7, logo_url),
          signature_url = COALESCE($8, signature_url),
          primary_color = COALESCE($9, primary_color),
          academic_year = COALESCE($10, academic_year),
          selected_id_card_template = COALESCE($11, selected_id_card_template),
          selected_bonafide_template = COALESCE($12, selected_bonafide_template),
          selected_mark_sheet_template = COALESCE($13, selected_mark_sheet_template),
          selected_general_certificate_template = COALESCE($14, selected_general_certificate_template),
          secondary_logo_url = COALESCE($15, secondary_logo_url),
          stamp_url = COALESCE($16, stamp_url),
          header_layout_type = COALESCE($17, header_layout_type),
          footer_text = COALESCE($18, footer_text),
          show_watermark = COALESCE($19, show_watermark),
          document_config = COALESCE($20, document_config),
          id_card_config = COALESCE($21, id_card_config),
          school_type = COALESCE($22, school_type),
          accreditation_line = COALESCE($23, accreditation_line),
          website_url = COALESCE($24, website_url),
          header_bg_color = COALESCE($25, header_bg_color),
          header_text_color = COALESCE($26, header_text_color),
          separator_style = COALESCE($27, separator_style),
          separator_color = COALESCE($28, separator_color),
          separator_thickness = COALESCE($29, separator_thickness),
          footer_bg_color = COALESCE($30, footer_bg_color),
          footer_text_color = COALESCE($31, footer_text_color),
          footer_left_text = COALESCE($32, footer_left_text),
          footer_right_text = COALESCE($33, footer_right_text),
          page_number_format = COALESCE($34, page_number_format),
          show_generation_date = COALESCE($35, show_generation_date),
          cashier_signature_url = COALESCE($36, cashier_signature_url),
          bonafide_config = COALESCE($37, bonafide_config),
          achievement_config = COALESCE($38, achievement_config),
          organization_name = COALESCE($39, organization_name),
          selected_fee_receipt_template = COALESCE($40, selected_fee_receipt_template),
          fee_receipt_config = COALESCE($41, fee_receipt_config),
          document_theme = COALESCE($42, document_theme),
          is_document_theme_enabled = COALESCE($43, is_document_theme_enabled),
          selected_leaving_certificate_template = COALESCE($44, selected_leaving_certificate_template),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $45
        RETURNING *`,
        [
          school_name, address, phone, email, affiliation_number, principal_name,
          logo_url, signature_url, primary_color, academic_year,
          selected_id_card_template, selected_bonafide_template,
          selected_mark_sheet_template, selected_general_certificate_template,
          secondary_logo_url, stamp_url, header_layout_type, footer_text,
          show_watermark, document_config, id_card_config,
          school_type, accreditation_line, website_url,
          header_bg_color, header_text_color, separator_style, separator_color, separator_thickness,
          footer_bg_color, footer_text_color, footer_left_text, footer_right_text, page_number_format, show_generation_date,
          cashier_signature_url, bonafide_config, achievement_config, organization_name,
          selected_fee_receipt_template, fee_receipt_config, document_theme, is_document_theme_enabled,
          selected_leaving_certificate_template,
          id
        ]
      );
      return rows[0];
    } else {
      // Insert
      const { rows } = await pool.query(
        `INSERT INTO school_profile (
          id, school_name, address, phone, email, affiliation_number, principal_name,
          logo_url, signature_url, primary_color, academic_year,
          selected_id_card_template, selected_bonafide_template,
          selected_mark_sheet_template, selected_general_certificate_template,
          secondary_logo_url, stamp_url, header_layout_type, footer_text,
          show_watermark, document_config, id_card_config,
          school_type, accreditation_line, website_url,
          header_bg_color, header_text_color, separator_style, separator_color, separator_thickness,
          footer_bg_color, footer_text_color, footer_left_text, footer_right_text, page_number_format, show_generation_date,
          cashier_signature_url, bonafide_config, achievement_config, organization_name,
          selected_fee_receipt_template, fee_receipt_config, document_theme, is_document_theme_enabled,
          selected_leaving_certificate_template
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
          $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
        ) RETURNING *`,
        [
          id, school_name, address, phone, email, affiliation_number, principal_name,
          logo_url, signature_url, primary_color, academic_year,
          selected_id_card_template, selected_bonafide_template,
          selected_mark_sheet_template, selected_general_certificate_template,
          secondary_logo_url, stamp_url, header_layout_type, footer_text,
          show_watermark, document_config, id_card_config,
          school_type, accreditation_line, website_url,
          header_bg_color, header_text_color, separator_style, separator_color, separator_thickness,
          footer_bg_color, footer_text_color, footer_left_text, footer_right_text, page_number_format, show_generation_date,
          cashier_signature_url, bonafide_config, achievement_config, organization_name,
          selected_fee_receipt_template, fee_receipt_config, document_theme, is_document_theme_enabled,
          selected_leaving_certificate_template
        ]
      );
      return rows[0];
    }
  }
};
