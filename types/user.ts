import { RoleKey } from "@/src/constants/roleKeys";

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey | string;
  organizationId?: string;
  organizationName?: string;
}

export interface AuthenticatedUser extends User {
  role: RoleKey;
}
