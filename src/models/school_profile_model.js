import pool from "../config/db.js";
import { cache } from "../utils/cache.js";

export const SchoolProfileModel = {
  async getProfile(instituteId) {
    try {
      const id = instituteId || 3;
      const cacheKey = `school_profile_${id}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const { rows } = await pool.query(`SELECT * FROM school_profile WHERE id = $1`, [id]);
      if (rows.length > 0) {
        cache.set(cacheKey, rows[0], 300); // 5 mins
        return rows[0];
      }
      const instRes = await pool.query(
        "SELECT name, email, phone, address, logo_url FROM institute WHERE institute_id = $1",
        [id]
      );
      if (instRes.rows.length > 0) {
        const inst = instRes.rows[0];
        const profile = {
          id,
          school_name: inst.name || "SchoolOS",
          email: inst.email || "school@demo.edu.in",
          phone: inst.phone || "",
          address: inst.address || "",
          logo_url: inst.logo_url || "",
          primary_color: "#3b82f6"
        };
        cache.set(cacheKey, profile, 300);
        return profile;
      }

      const defaultProfile = {
        id,
        school_name: "Campus Connect",
        email: "admin@school.com",
        phone: "",
        address: "Main Campus",
        logo_url: "",
        primary_color: "#3b82f6"
      };
      cache.set(cacheKey, defaultProfile, 300);
      return defaultProfile;
    } catch (err) {
      console.error("Failed to get school profile:", err);
      return {
        id: instituteId || 3,
        school_name: "Campus Connect",
        email: "admin@school.com",
        phone: "",
        address: "Main Campus",
        logo_url: "",
        primary_color: "#3b82f6"
      };
    }
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

    const safeJson = (val) => {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'object') return JSON.stringify(val);
      if (typeof val === 'string') {
        try {
          JSON.parse(val);
          return val;
        } catch (e) {
          return JSON.stringify(val);
        }
      }
      return JSON.stringify(val);
    };

    // Check directly in database if row exists for this institute
    const dbCheck = await pool.query('SELECT id FROM school_profile WHERE id = $1', [id]);
    const rowExists = dbCheck.rows.length > 0;

    if (school_name) {
      try {
        await pool.query('UPDATE institute SET name = $1 WHERE institute_id = $2', [school_name, id]);
      } catch (instErr) { console.error("Institute name sync warning:", instErr.message); }
    }

    const docCfgJson = safeJson(document_config);
    const idCardCfgJson = safeJson(id_card_config);
    const bonafideCfgJson = safeJson(bonafide_config);
    const achievementCfgJson = safeJson(achievement_config);
    const feeReceiptCfgJson = safeJson(fee_receipt_config);
    const docThemeJson = safeJson(document_theme);

    if (rowExists) {
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
          document_config = COALESCE($20::jsonb, document_config),
          id_card_config = COALESCE($21::jsonb, id_card_config),
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
          bonafide_config = COALESCE($37::jsonb, bonafide_config),
          achievement_config = COALESCE($38::jsonb, achievement_config),
          organization_name = COALESCE($39, organization_name),
          selected_fee_receipt_template = COALESCE($40, selected_fee_receipt_template),
          fee_receipt_config = COALESCE($41::jsonb, fee_receipt_config),
          document_theme = COALESCE($42::jsonb, document_theme),
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
          show_watermark, docCfgJson, idCardCfgJson,
          school_type, accreditation_line, website_url,
          header_bg_color, header_text_color, separator_style, separator_color, separator_thickness,
          footer_bg_color, footer_text_color, footer_left_text, footer_right_text, page_number_format, show_generation_date,
          cashier_signature_url, bonafideCfgJson, achievementCfgJson, organization_name,
          selected_fee_receipt_template, feeReceiptCfgJson, docThemeJson, is_document_theme_enabled,
          selected_leaving_certificate_template,
          id
        ]
      );
      cache.del(`school_profile_${id}`);
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22::jsonb,
          $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37::jsonb, $38::jsonb, $39, $40, $41::jsonb, $42::jsonb, $43, $44, $45
        ) RETURNING *`,
        [
          id, school_name, address, phone, email, affiliation_number, principal_name,
          logo_url, signature_url, primary_color, academic_year,
          selected_id_card_template, selected_bonafide_template,
          selected_mark_sheet_template, selected_general_certificate_template,
          secondary_logo_url, stamp_url, header_layout_type, footer_text,
          show_watermark, docCfgJson, idCardCfgJson,
          school_type, accreditation_line, website_url,
          header_bg_color, header_text_color, separator_style, separator_color, separator_thickness,
          footer_bg_color, footer_text_color, footer_left_text, footer_right_text, page_number_format, show_generation_date,
          cashier_signature_url, bonafideCfgJson, achievementCfgJson, organization_name,
          selected_fee_receipt_template, feeReceiptCfgJson, docThemeJson, is_document_theme_enabled,
          selected_leaving_certificate_template
        ]
      );
      cache.del(`school_profile_${id}`);
      return rows[0];
    }
  }
};
