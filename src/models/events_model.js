// src/models/events_model.js
import pool from "../config/db.js";

const EventsModel = {

  createEvent: async (data) => {
    const query = `
      INSERT INTO events 
      (event_name, description, event_date, venue, event_status_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      data.event_name,
      data.description,
      data.event_date,
      data.venue,
      data.event_status_id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  getAllEvents: async () => {
    const query = `
      SELECT e.*, s.event_status_name
      FROM events e
      LEFT JOIN event_status s ON e.event_status_id = s.event_status_id
      ORDER BY e.event_date DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  getEventStatuses: async () => {
    const query = `SELECT * FROM event_status ORDER BY event_status_id ASC`;
    const result = await pool.query(query);
    return result.rows;
  },

  updateEvent: async (id, data) => {
    const query = `
      UPDATE events SET
        event_name = $1,
        description = $2,
        event_date = $3,
        venue = $4,
        event_status_id = $5,
        updated_at = now()
      WHERE event_id = $6
      RETURNING *;
    `;
    const values = [
      data.event_name,
      data.description,
      data.event_date,
      data.venue,
      data.event_status_id,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  deleteEvent: async (id) => {
    const query = `DELETE FROM events WHERE event_id = $1`;
    await pool.query(query, [id]);
    return true;
  }

};

export default EventsModel;
