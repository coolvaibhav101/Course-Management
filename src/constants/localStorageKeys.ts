export const LOCAL_STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",

  // User
  USER_INFO: "user_info",
  USER_ROLE: "user_role",

  // Admin
  ADMIN_DATA: "admin_data",
  ADMIN_PERMISSIONS: "admin_permissions",

  // App Settings
  THEME: "theme",
  LANGUAGE: "language",

  // Flags
  IS_LOGGED_IN: "is_logged_in",
} as const;
