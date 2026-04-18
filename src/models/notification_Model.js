/**
 * notification_Model.js — Enhanced for Leave Management
 */

import db from '../config/db.js';

export const NotificationModel = {

  async createNotification(data) {
    const {
      user_id,
      sender_user_id = null,
      related_leave_id = null,
      title,
      message,
      type = null,
      action_payload = null
    } = data;

    const { rows } = await db.query(`
      INSERT INTO notifications
        (user_id, sender_user_id, related_leave_id, title, message, type, action_payload, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      RETURNING *
    `, [user_id, sender_user_id, related_leave_id, title, message, type, action_payload ? JSON.stringify(action_payload) : null]);
    return rows[0];
  },

  async getByUser(user_id) {
    const { rows } = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [user_id]);
    return rows;
  },

  async getUnreadCount(user_id) {
    const { rows } = await db.query(`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `, [user_id]);
    return parseInt(rows[0].count, 10);
  },

  async markAsRead(notification_id, user_id) {
    const { rows } = await db.query(`
      UPDATE notifications
      SET is_read = true
      WHERE notification_id = $1 AND user_id = $2
      RETURNING *
    `, [notification_id, user_id]);
    return rows[0];
  },

  async markAllAsRead(user_id) {
    await db.query(`
      UPDATE notifications SET is_read = true WHERE user_id = $1
    `, [user_id]);
  }
};
