export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: role missing",
        });
      }

      const userRoleId = Number(req.user.role_id);

      if (!allowedRoles.includes(userRoleId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied (role not allowed)",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Role check failed",
      });
    }
  };
};
