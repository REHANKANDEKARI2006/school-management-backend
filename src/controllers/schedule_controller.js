const ScheduleController = {

  async getSchoolSchedule(req, res) {
    res.send("Get full school weekly schedule");
  },

  async getMySchedule(req, res) {
    const userId = req.query.userId; // optional for now
    res.send(`Get personal schedule for user: ${userId || "N/A"}`);
  },

  async createSchedule(req, res) {
    const { day, time, subject, teacher, classId } = req.body;

    res.send({
      message: "Schedule created",
      data: { day, time, subject, teacher, classId }
    });
  },

  async updateSchedule(req, res) {
    const scheduleId = req.params.id;

    res.send(`Update schedule with ID: ${scheduleId}`);
  },

  async deleteSchedule(req, res) {
    const scheduleId = req.params.id;

    res.send(`Delete schedule with ID: ${scheduleId}`);
  }

};

export default ScheduleController;
