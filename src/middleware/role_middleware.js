export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        console.error(`ROLE 401 => Unauthorized: role missing for ${req.method} ${req.originalUrl}. req.user:`, req.user);
        return res.status(401).json({
          success: false,
          message: "Unauthorized: role missing",
        });
      }

      const userRoleId = Number(req.user.role_id);

      if (!allowedRoles.includes(userRoleId)) {
        console.error(`ROLE 403 => Access denied for ${req.method} ${req.originalUrl}. User role:`, userRoleId, "Allowed:", allowedRoles);
        return res.status(403).json({
          success: false,
          message: "Access denied (role not allowed)",
        });
      }

      next();
    } catch (err) {
      console.error(`ROLE 500 => Role check failed for ${req.method} ${req.originalUrl}. Error:`, err.message);
      return res.status(500).json({
        success: false,
        message: "Role check failed",
      });
    }
  };
};
