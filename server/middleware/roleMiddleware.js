export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error('Forbidden: insufficient role');
    }

    next();
  };
};

export const adminRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
export const superAdminRoles = [ROLES.SUPER_ADMIN];
export const managerRoles = [ROLES.SUPER_ADMIN, ROLES.MANAGER];
export const managerAndAdminRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER];
