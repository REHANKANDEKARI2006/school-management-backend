export const AttendanceController = {

  async getAllClasses(req, res) {
    res.send("Get all classes for attendance dropdown");
  },

  async getSubjectsByClass(req, res) {
    const classId = parseInt(req.params.id, 10);
    res.send(`Get all subjects of class ID: ${classId}`);
  },

  async startAttendanceSession(req, res) {
    const { classId, subject } = req.body;
    res.send(`Attendance session started for Class: ${classId}, Subject: ${subject}`);
  }

};
