import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { cache } from "../utils/cache.js";

export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    console.error(`AUTH 401 => No token provided for ${req.method} ${req.originalUrl}.`);
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const cacheKey = `user_status_${decoded.user_id}`;
    let userState = cache.get(cacheKey);

    if (!userState) {
      const userRes = await pool.query(
        'SELECT status, is_active FROM "user" WHERE user_id = $1',
        [decoded.user_id]
      );

      if (userRes.rows.length === 0) {
        userState = { valid: false, reason: "not_found" };
      } else {
        const u = userRes.rows[0];
        const isValid = u.status !== "deactivated" && u.is_active;
        userState = { valid: isValid, status: u.status, is_active: u.is_active };
      }
      cache.set(cacheKey, userState, 60); // 60s TTL
    }

    if (!userState.valid) {
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
