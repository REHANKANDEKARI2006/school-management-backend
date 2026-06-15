import { Router } from "express";
import { ClassController } from "../controllers/class_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Apply auth and institute isolation middlewares to all routes
router.use(authMiddleware);
router.use(instituteMiddleware);

// ✅ ADMIN LIST — MUST BE ABOVE :id
router.get("/admin/list", ClassController.getAllClassesForAdmin);

// EXISTING ROUTES
router.get("/", ClassController.getAllClasses);
router.get("/:id", ClassController.getClassById);
router.post("/", ClassController.createClass);
router.patch("/:id", ClassController.updateClass);
router.delete("/:id", ClassController.deleteClass);

// DROPDOWN DATA (FILTERED)
router.get("/class-enrollments/list", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.class_id,
        c.class_name || ' - ' || s.section_name AS label
      FROM class c
      JOIN section s ON s.section_id = c.section_id
      WHERE c.institute_id = $1
      ORDER BY c.class_name, s.section_name
    `, [req.instituteId]);

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to load class list" });
  }
});

export default router;
