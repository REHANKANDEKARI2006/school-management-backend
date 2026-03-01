// src/models/schedule_model.js
import db from "../config/db.js";

const ScheduleModel = {

  async getAll() {
    const { rows } = await db.query(`
      SELECT 
        sch.*,
        c.class_name,
        sub.subject_name,
        st.staff_first_name,
        st.staff_last_name
      FROM schedule sch
      JOIN class c ON sch.class_id = c.class_id
      LEFT JOIN subject sub ON sch.subject_id = sub.subject_id
      LEFT JOIN staff st ON sch.staff_id = st.staff_id
      ORDER BY sch.class_id, sch.day_of_week, sch.period_number, sch.start_time
    `);
    return rows;
  },

  async getByFilter({ staff_id, class_id }) {
    let query = `
      SELECT 
        sch.*,
        c.class_name,
        sub.subject_name,
        st.staff_first_name,
        st.staff_last_name
      FROM schedule sch
      JOIN class c ON sch.class_id = c.class_id
      LEFT JOIN subject sub ON sch.subject_id = sub.subject_id
      LEFT JOIN staff st ON sch.staff_id = st.staff_id
      WHERE 1=1
    `;
    const values = [];

    if (staff_id) {
      values.push(staff_id);
      query += ` AND sch.staff_id = $${values.length}`;
    }

    if (class_id) {
      values.push(class_id);
      query += ` AND sch.class_id = $${values.length}`;
    }

    query += " ORDER BY sch.day_of_week, sch.period_number, sch.start_time";

    const { rows } = await db.query(query, values);
    return rows;
  },

  async create(data) {
    const {
      class_id,
      staff_id,
      subject_id,
      schedule_date,
      day_of_week,
      period_number,
      start_time,
      end_time,
      room_id,
      is_break
    } = data;

    const { rows } = await db.query(
      `INSERT INTO schedule
      (class_id, staff_id, subject_id, schedule_date, day_of_week, period_number, start_time, end_time, room_id, is_break)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        class_id,
        staff_id || null,
        subject_id || null,
        schedule_date || null,
        day_of_week,
        period_number,
        start_time,
        end_time,
        room_id || null,
        is_break || false
      ]
    );

    return rows[0];
  },

  async replaceClassSchedule(class_id, scheduleArray) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Clear existing schedule for this class
      await client.query("DELETE FROM schedule WHERE class_id = $1", [class_id]);

      // Bulk insert the new schedule
      for (const item of scheduleArray) {
        await client.query(
          `INSERT INTO schedule
          (class_id, staff_id, subject_id, schedule_date, day_of_week, period_number, start_time, end_time, room_id, is_break)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            class_id,
            item.staff_id || null,
            item.subject_id || null,
            item.schedule_date || null,
            item.day_of_week,
            item.period_number,
            item.start_time,
            item.end_time,
            item.room_id || null,
            item.is_break || false
          ]
        );
      }

      await client.query("COMMIT");
      return { success: true, count: scheduleArray.length };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
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
