export const roleKeys = {
  ORG_ADMIN: "ORG_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  student: "student",
};
export const usersDefaultLogin = {
  [roleKeys.ORG_ADMIN]: {
    name: "Super Admin",
    email: "superadmin@portal.edu",
    organizationId: undefined,
    organizationName: undefined,
  },
  [roleKeys.SUPER_ADMIN]: {
    name: "Organization Admin",
    email: "orgadmin@techacademy.edu",
    organizationId: "org-1",
    organizationName: "Tech Academy",
  },
  [roleKeys.student]: {
    name: "Hannah Martinez",
    email: "hannah@techacademy.edu",
    organizationId: "org-1",
    organizationName: "Tech Academy",
  },
};
