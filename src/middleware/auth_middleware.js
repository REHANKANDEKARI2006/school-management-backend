import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error(`AUTH 401 => No token provided for ${req.method} ${req.originalUrl}. Headers:`, req.headers);
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check database to ensure the user is active and not deactivated
    const userRes = await pool.query(
      'SELECT status, is_active FROM "user" WHERE user_id = $1',
      [decoded.user_id]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].status === "deactivated" || !userRes.rows[0].is_active) {
      console.error(`AUTH 401 => User ${decoded.user_id} is deactivated or not found.`);
      return res.status(401).json({
        success: false,
        message: "Your account is deactivated!",
        deactivated: true,
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error(`AUTH 401 => Verify failed for ${req.method} ${req.originalUrl}. Token:`, token.substring(0, 10) + "...", "Error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}
