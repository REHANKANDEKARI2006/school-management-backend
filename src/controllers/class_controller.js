export const ClassController = {

  async getAllClasses(req, res) {
    res.send("Get all classes");
  },

  async getClassById(req, res) {
    const classId = parseInt(req.params.id, 10);
    res.send(`Get single class by id: ${classId}`);
  },

  async createClass(req, res) {
    const classData = req.body.classData;
    res.send(`Class Created: ${JSON.stringify(classData)}`);
  },

  async updateClass(req, res) {
    const classId = parseInt(req.params.id, 10);
    res.send(`Update some fields for existing class with ID: ${classId}`);
  },

  async deleteClass(req, res) {
    const classId = parseInt(req.params.id, 10);
    res.send(`Delete class with ID: ${classId}`);
  }

};
