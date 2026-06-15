import { HolidayService } from '../services/holiday_service.js';
import pool from '../config/db.js';

export const HolidayController = {
  // GET /api/holidays?year=2026&month=4
  async getHolidays(req, res) {
    try {
      const { year, month } = req.query;
      const currentYear = year || new Date().getFullYear();
      
      let holidays;
      if (month) {
        holidays = await HolidayService.getHolidaysByMonth(currentYear, month, req.instituteId);
      } else {
        holidays = await HolidayService.getHolidays(currentYear, req.instituteId);
      }

      res.status(200).json({
        success: true,
        data: holidays
      });
    } catch (error) {
      console.error('HolidayController.getHolidays Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch holidays',
        error: error.message
      });
    }
  },

  // Admin: GET /api/holidays/custom
  async getCustomHolidays(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM custom_holidays WHERE institute_id = $1 ORDER BY holiday_date DESC',
        [req.instituteId]
      );
      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch custom holidays',
        error: error.message
      });
    }
  },

  // Admin: POST /api/holidays/custom
  async createCustomHoliday(req, res) {
    try {
      const { holiday_name, holiday_date, category, description, is_recurring } = req.body;
      const userId = req.user?.user_id;

      let result;
      if (is_recurring) {
        // Extract day and month from the date provided in the picker
        const dateObj = new Date(holiday_date);
        const day = dateObj.getUTCDate();
        const month = dateObj.getUTCMonth() + 1;
        
        result = await pool.query(
          `INSERT INTO recurring_holidays (holiday_name, day, month, state_tag, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING *`,
          [holiday_name, day, month, category]
        );
      } else {
        result = await pool.query(
          `INSERT INTO custom_holidays (holiday_name, holiday_date, category, description, created_by, institute_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [holiday_name, holiday_date, category, description, userId, req.instituteId]
        );
      }

      res.status(201).json({
        success: true,
        message: is_recurring ? 'Recurring holiday added successfully' : 'Custom holiday added successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('createCustomHoliday error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create holiday',
        error: error.message
      });
    }
  },

  // Admin: PUT /api/holidays/custom/:id
  async updateCustomHoliday(req, res) {
    try {
      const { id } = req.params;
      const { holiday_name, holiday_date, category, description } = req.body;

      let result;
      if (id.startsWith('rec_')) {
        const numericId = id.split('_')[1];
        const dateObj = new Date(holiday_date);
        const day = dateObj.getUTCDate();
        const month = dateObj.getUTCMonth() + 1;
        
        result = await pool.query(
          `UPDATE recurring_holidays 
           SET holiday_name = $1, day = $2, month = $3, state_tag = $4
           WHERE id = $5
           RETURNING *`,
          [holiday_name, day, month, category, numericId]
        );
      } else {
        const numericId = id.startsWith('cus_') ? id.split('_')[1] : id;
        result = await pool.query(
          `UPDATE custom_holidays 
           SET holiday_name = $1, holiday_date = $2, category = $3, description = $4, updated_at = now()
           WHERE id = $5 AND institute_id = $6
           RETURNING *`,
          [holiday_name, holiday_date, category, description, numericId, req.instituteId]
        );
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Holiday not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Holiday updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update custom holiday',
        error: error.message
      });
    }
  },

  // Admin: DELETE /api/holidays/custom/:id
  async deleteCustomHoliday(req, res) {
    try {
      const { id } = req.params;
      
      if (id.startsWith('rec_')) {
        const numericId = id.split('_')[1];
        await pool.query('DELETE FROM recurring_holidays WHERE id = $1', [numericId]);
      } else {
        const numericId = id.startsWith('cus_') ? id.split('_')[1] : id;
        await pool.query('DELETE FROM custom_holidays WHERE id = $1 AND institute_id = $2', [numericId, req.instituteId]);
      }
      
      res.status(200).json({
        success: true,
        message: 'Holiday deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete custom holiday',
        error: error.message
      });
    }
  }
};
