// src/controllers/fees_controller.js

export const FeesController = {
  
  async getAllCategories(req, res) {
    res.send("Get all fee categories");
  },

  async createCategory(req, res) {
    const { name, description, installmentsAllowed } = req.body;
    res.send({
      message: "Category created",
      data: { name, description, installmentsAllowed }
    });
  },

  async updateCategory(req, res) {
    const categoryId = parseInt(req.params.id);
    res.send(`Update category with id: ${categoryId}`);
  },

  async deleteCategory(req, res) {
    const categoryId = parseInt(req.params.id);
    res.send(`Delete category with id: ${categoryId}`);
  }

};
