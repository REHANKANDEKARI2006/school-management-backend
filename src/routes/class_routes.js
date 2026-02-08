import { Router } from "express";
import { ClassController } from "../controllers/class_controller.js";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// EXISTING ROUTES (NO CHANGE)
router.get("/", ClassController.getAllClasses);
router.get("/:id", ClassController.getClassById);
router.post("/", ClassController.createClass);
router.patch("/:id", ClassController.updateClass);
router.delete("/:id", ClassController.deleteClass);

// ✅ NEW: SINGLE DROPDOWN DATA
router.get("/class-enrollments/list", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.class_id,
        c.class_name || ' - ' || s.section_name AS label
      FROM class c
      JOIN section s ON s.section_id = c.section_id
      ORDER BY c.class_name, s.section_name
    `);

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to load class list" });
  }
});

export default router;
