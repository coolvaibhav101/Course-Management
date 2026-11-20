export const roleKeys = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  STUDENT: "STUDENT",
} as const;

export type RoleKey = (typeof roleKeys)[keyof typeof roleKeys];

/**
 * Normalize a role string returned by the backend/login API to our constants.
 * Handles common variants like "super-admin", "admin", "org-admin", "student".
 */
export function normalizeRole(role: string | null | undefined): RoleKey {
  if (!role) return roleKeys.STUDENT;
  const lower = role.toLowerCase();
  if (lower.includes("super") || lower === "admin") return roleKeys.SUPER_ADMIN;
  if (lower.includes("org")) return roleKeys.ORG_ADMIN;
  return roleKeys.STUDENT;
}

export const usersDefaultLogin = {
  [roleKeys.SUPER_ADMIN]: {
    name: "Super Admin",
    email: "superadmin@portal.edu",
    organizationId: undefined,
    organizationName: undefined,
  },
  [roleKeys.ORG_ADMIN]: {
    name: "Organization Admin",
    email: "orgadmin@techacademy.edu",
    organizationId: "org-1",
    organizationName: "Tech Academy",
  },
  [roleKeys.STUDENT]: {
    name: "Hannah Martinez",
    email: "hannah@techacademy.edu",
    organizationId: "org-1",
    organizationName: "Tech Academy",
  },
};
