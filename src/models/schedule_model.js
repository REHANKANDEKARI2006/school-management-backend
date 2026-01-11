// src/models/schedule_model.js
import db from "../config/db.js";

const ScheduleModel = {

  async getAll() {
    const { rows } = await db.query(
      "SELECT * FROM schedule ORDER BY day_of_week, start_time"
    );
    return rows;
  },

  async getByFilter({ staff_id, class_id, section_id }) {
    let query = "SELECT * FROM schedule WHERE 1=1";
    const values = [];

    if (staff_id) {
      values.push(staff_id);
      query += ` AND staff_id = $${values.length}`;
    }

    if (class_id) {
      values.push(class_id);
      query += ` AND class_id = $${values.length}`;
    }

    if (section_id) {
      values.push(section_id);
      query += ` AND section_id = $${values.length}`;
    }

    const { rows } = await db.query(query, values);
    return rows;
  },

  async create(data) {
    const {
      staff_id,
      subject_id,
      class_id,
      section_id,
      day_of_week,
      start_time,
      end_time,
      activity_type
    } = data;

    const { rows } = await db.query(
      `INSERT INTO schedule
      (staff_id, subject_id, class_id, section_id, day_of_week, start_time, end_time, activity_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        staff_id,
        subject_id,
        class_id,
        section_id,
        day_of_week,
        start_time,
        end_time,
        activity_type
      ]
    );

    return rows[0];
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    let index = 1;

    for (const key in data) {
      fields.push(`${key} = $${index}`);
      values.push(data[key]);
      index++;
    }

    if (fields.length === 0) {
      throw new Error("No valid fields provided");
    }

    const query = `
      UPDATE schedule
      SET ${fields.join(", ")}
      WHERE schedule_id = $${index}
      RETURNING *
    `;

    values.push(id);

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  async delete(id) {
    await db.query(
      "DELETE FROM schedule WHERE schedule_id = $1",
      [id]
    );
  }

};

export default ScheduleModel;
