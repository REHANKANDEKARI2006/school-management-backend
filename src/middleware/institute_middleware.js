import pool from "../config/db.js";

export default async function instituteMiddleware(req, res, next) {
  try {
    // 1. Extract institute_id from header (X-Institute-ID), query param, or request body
    const headerVal = req.headers["x-institute-id"];
    const queryVal = req.query?.institute_id;
    const bodyVal = req.body?.institute_id;
    
    const rawId = headerVal || queryVal || bodyVal;
    
    if (!rawId) {
      console.warn(`[MIDDLEWARE WARNING] Missing institute_id on route ${req.method} ${req.originalUrl}`);
      return res.status(400).json({
        success: false,
        message: "X-Institute-ID header or institute_id parameter is required"
      });
    }
    
    const instituteId = parseInt(rawId, 10);
    if (isNaN(instituteId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid institute_id format"
      });
    }
    
    // 2. req.user should be populated by authMiddleware (which runs before this middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User context missing"
      });
    }
    
    const { role_id, institute_id: userInstituteId, user_id } = req.user;
    
    // 3. If role_id is Master Admin (1), they can access any school.
    // Verify that the requested institute_id exists in the database.
    if (Number(role_id) === 1) {
      const instCheck = await pool.query(
        "SELECT institute_id FROM institute WHERE institute_id = $1 AND name != 'Setup Placeholder School'",
        [instituteId]
      );
      if (instCheck.rows.length === 0) {
        console.warn(`[SECURITY WARNING] Master Admin ${user_id} requested non-existent institute_id ${instituteId}`);
        return res.status(403).json({
          success: false,
          message: "Forbidden: Requested school does not exist"
        });
      }
      
      // Set req.instituteId for query use
      req.instituteId = instituteId;
      return next();
    }
    
    // 4. For all other roles, the requested instituteId MUST match the user's instituteId!
    if (Number(userInstituteId) !== instituteId) {
      console.error(
        `[SECURITY WARNING] Unauthorized cross-school access attempt! User ${user_id} (School ${userInstituteId}, Role ${role_id}) tried to access School ${instituteId} on ${req.method} ${req.originalUrl}`
      );
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to access data from this school"
      });
    }
    
    // Set req.instituteId for query use
    req.instituteId = instituteId;
    next();
  } catch (err) {
    console.error("Error in instituteMiddleware:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error in data isolation check"
    });
  }
}
