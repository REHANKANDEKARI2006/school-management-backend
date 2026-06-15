// src/models/schedule_model.js
import db from "../config/db.js";

const ScheduleModel = {

  async getAll(instituteId) {
    const { rows } = await db.query(`
      SELECT 
        sch.*,
        c.class_name,
        sec.section_name,
        sub.subject_name,
        st.staff_first_name,
        st.staff_last_name,
        st.profile_url
      FROM schedule sch
      JOIN class c ON sch.class_id = c.class_id
      LEFT JOIN section sec ON c.section_id = sec.section_id
      LEFT JOIN subject sub ON sch.subject_id = sub.subject_id
      LEFT JOIN staff st ON sch.staff_id = st.staff_id
      WHERE sch.institute_id = $1
      ORDER BY sch.class_id, sch.day_of_week, sch.period_number, sch.start_time
    `, [instituteId]);
    return rows;
  },

  async getByFilter({ staff_id, class_id, week_start, query_date }, instituteId) {
    const values = [instituteId];

    // Build the reference date for substitute lookup
    let dateParam;
    if (query_date) {
      values.push(query_date);
      dateParam = `$${values.length}::date`;
    } else if (week_start) {
      values.push(week_start);
      dateParam = `$${values.length}::date`;
    } else {
      dateParam = 'CURRENT_DATE';
    }

    const weekStr = `date_trunc('week', ${dateParam})`;

    let query = `
      SELECT
        sch.*,
        sch.staff_id AS original_staff_id,
        c.class_name,
        sec.section_name,
        sub.subject_name,
        -- Original teacher info
        st.staff_first_name,
        st.staff_last_name,
        st.profile_url,
        -- Substitute info from new table
        sa.id               AS sub_assignment_id,
        sa.assignment_date  AS sub_date,
        sa.substitute_teacher_id,
        sa.status           AS sub_status,
        -- Effective teacher after substitution
        COALESCE(sub_st.staff_first_name, st.staff_first_name) AS effective_first_name,
        COALESCE(sub_st.staff_last_name,  st.staff_last_name)  AS effective_last_name,
        COALESCE(sub_st.profile_url,      st.profile_url)      AS effective_profile_url,
        CASE WHEN sa.id IS NOT NULL THEN true ELSE false END    AS is_substitute,
        -- Original teacher name for tooltip
        CASE WHEN sa.id IS NOT NULL
             THEN st.staff_first_name || ' ' || st.staff_last_name
             ELSE NULL
         END AS substitute_for,
        -- Event overlay info
        epe.id               AS event_exchange_id,
        e.event_id,
        e.event_name,
        e.event_type,
        cord_st.staff_first_name AS coordinator_first_name,
        cord_st.staff_last_name  AS coordinator_last_name,
        CASE WHEN epe.id IS NOT NULL THEN true ELSE false END AS is_event_period
      FROM schedule sch
      JOIN class c          ON c.class_id     = sch.class_id
      LEFT JOIN section sec ON sec.section_id = c.section_id
      LEFT JOIN subject sub ON sub.subject_id = sch.subject_id
      LEFT JOIN staff st    ON st.staff_id    = sch.staff_id
      -- Join substitute_assignments for the relevant week
      LEFT JOIN substitute_assignments sa
        ON  sa.original_teacher_id = sch.staff_id
        AND sa.period_number       = sch.period_number
        AND sa.class_id            = sch.class_id
        AND sa.assignment_date    >= ${weekStr}
        AND sa.assignment_date     < ${weekStr} + interval '7 days'
        AND EXTRACT(ISODOW FROM sa.assignment_date) = sch.day_of_week
        AND sa.status             IN ('pending_acceptance', 'accepted')
      LEFT JOIN staff sub_st ON sub_st.staff_id = sa.substitute_teacher_id
      -- Join event_period_exchanges for the relevant week
      LEFT JOIN event_period_exchanges epe
        ON  epe.class_id               = sch.class_id
        AND epe.original_period_number = sch.period_number
        AND epe.exchange_date         >= ${weekStr}
        AND epe.exchange_date          < ${weekStr} + interval '7 days'
        AND epe.status                 = 'exchanged'
      LEFT JOIN events e ON e.event_id = epe.event_id
      LEFT JOIN event_class_assignments eca ON eca.event_id = e.event_id AND eca.class_id = sch.class_id
      LEFT JOIN staff cord_st ON cord_st.staff_id = eca.coordinator_teacher_id
      WHERE sch.institute_id = $1
    `;

    if (staff_id) {
      values.push(staff_id);
      // Include rows where this staff is the original teacher OR the substitute
      query += ` AND (sch.staff_id = $${values.length} OR sa.substitute_teacher_id = $${values.length})`;
    }

    if (class_id) {
      values.push(class_id);
      query += ` AND sch.class_id = $${values.length}`;
    }

    query += ' ORDER BY sch.day_of_week, sch.period_number, sch.start_time';

    const { rows } = await db.query(query, values);
    return rows;
  },

  async create(data, instituteId) {
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
      (class_id, staff_id, subject_id, schedule_date, day_of_week, period_number, start_time, end_time, room_id, is_break, institute_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
        is_break || false,
        instituteId
      ]
    );

    return rows[0];
  },

  async replaceClassSchedule(class_id, scheduleArray, instituteId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Clear existing schedule for this class
      await client.query("DELETE FROM schedule WHERE class_id = $1 AND institute_id = $2", [class_id, instituteId]);

      // Bulk insert the new schedule
      for (const item of scheduleArray) {
        await client.query(
          `INSERT INTO schedule
          (class_id, staff_id, subject_id, schedule_date, day_of_week, period_number, start_time, end_time, room_id, is_break, institute_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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
            item.is_break || false,
            instituteId
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

  async update(id, data, instituteId) {
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
      WHERE schedule_id = $${index} AND institute_id = $${index + 1}
      RETURNING *
    `;

    values.push(id);
    values.push(instituteId);

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  async delete(id, instituteId) {
    await db.query(
      "DELETE FROM schedule WHERE schedule_id = $1 AND institute_id = $2",
      [id, instituteId]
    );
  }

};

export default ScheduleModel;
