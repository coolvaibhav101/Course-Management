export interface OrganizationAdmin {
  name: string;
  email: string;
  phone: string;
}

/** GET /organizations/ returns admin; write requests use org_admin. */
export interface Organization {
  id: string;
  name: string;
  description: string;
  student_limit: number;
  expiry_date: string;
  status: string;
  created_at: string;
  student_count: number;
  course_count: number;
  admin: OrganizationAdmin | null;
  average_completion: number;
  // When IDs are missing, a zero course_count still confirms no assignments.
  course_ids?: string[];
}

export interface OrganizationFormData {
  id?: string;
  name: string;
  description: string;
  student_limit: number;
  expiry_date: string;
  status: string;
  org_admin: OrganizationAdmin & { temp_password: string };
  course_ids?: string[];
  course_count?: number;
}

export function newOrganizationForm(): OrganizationFormData {
  return {
    name: '',
    description: '',
    student_limit: 100,
    expiry_date: '',
    status: 'ACTIVE',
    org_admin: { name: '', email: '', phone: '', temp_password: '' },
    course_ids: [],
  };
}

export function organizationToForm(organization: Organization): OrganizationFormData {
  return {
    id: organization.id,
    name: organization.name,
    description: organization.description ?? '',
    student_limit: organization.student_limit,
    expiry_date: organization.expiry_date,
    status: organization.status,
    org_admin: {
      name: organization.admin?.name ?? '',
      email: organization.admin?.email ?? '',
      phone: organization.admin?.phone ?? '',
      temp_password: '',
    },
    course_ids: Array.isArray(organization.course_ids)
      ? [...organization.course_ids]
      : organization.course_count === 0 ? [] : undefined,
    course_count: organization.course_count,
  };
}

/** Organization edits update details; courses are added through their own endpoint. */
export function organizationPayload(data: OrganizationFormData, isNew: boolean) {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || '',
    student_limit: data.student_limit,
    expiry_date: data.expiry_date,
    status: data.status || 'ACTIVE',
    org_admin: {
      name: data.org_admin.name.trim(),
      email: data.org_admin.email.trim(),
      phone: data.org_admin.phone.trim(),
      ...(data.org_admin.temp_password ? { temp_password: data.org_admin.temp_password } : {}),
    },
    ...(isNew ? { course_ids: data.course_ids ?? [] } : {}),
  };
}
