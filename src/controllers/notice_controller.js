export const NoticeController = {

  async getAllNotices(req, res) {
    res.json({
      success: true,
      message: "All notices fetched successfully",
      data: []
    });
  },

  async getNoticeById(req, res) {
    const id = parseInt(req.params.id);
    res.json({
      success: true,
      message: `Notice fetched with ID: ${id}`,
      data: {}
    });
  },

  async createNotice(req, res) {
    const { title, description, author } = req.body;

    res.json({
      success: true,
      message: "Notice created successfully",
      data: { title, description, author }
    });
  },

  async updateNotice(req, res) {
    const id = parseInt(req.params.id);

    res.json({
      success: true,
      message: `Notice updated with ID: ${id}`
    });
  },

  async deleteNotice(req, res) {
    const id = parseInt(req.params.id);

    res.json({
      success: true,
      message: `Notice deleted with ID: ${id}`
    });
  }
};
