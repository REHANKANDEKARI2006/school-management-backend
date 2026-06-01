import { SchoolProfileService } from "../services/school_profile_service.js";
import pool from "../config/db.js";

export const SchoolProfileController = {
  async getProfile(req, res) {
    try {
      const data = await SchoolProfileService.getProfile();
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching school profile" });
    }
  },

  async upsertProfile(req, res) {
    try {
      const data = await SchoolProfileService.upsertProfile(req.body);
      res.status(200).json({ success: true, message: "School profile updated successfully", data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error updating school profile" });
    }
  },

  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      // Instantly update the database to ensure real-time application across all documents
      await pool.query('UPDATE school_profile SET logo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [req.file.path]);
      
      res.status(200).json({
        success: true,
        message: "Logo uploaded successfully",
        data: { url: req.file.path }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error uploading logo" });
    }
  },

  async uploadSignature(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      // Instantly update the database to ensure real-time application across all documents
      await pool.query('UPDATE school_profile SET signature_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [req.file.path]);

      res.status(200).json({
        success: true,
        message: "Signature uploaded successfully",
        data: { url: req.file.path }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error uploading signature" });
    }
  },

  async uploadSecondaryLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      res.status(200).json({
        success: true,
        message: "Secondary Logo uploaded successfully",
        data: { url: req.file.path }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error uploading secondary logo" });
    }
  },

  async uploadStamp(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      // Instantly update the database to ensure real-time application across all documents
      await pool.query('UPDATE school_profile SET stamp_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [req.file.path]);

      res.status(200).json({
        success: true,
        message: "Stamp uploaded successfully",
        data: { url: req.file.path }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error uploading stamp" });
    }
  }
};
