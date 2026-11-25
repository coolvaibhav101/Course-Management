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

export type OrganizationPayload = Partial<Pick<OrganizationFormData, 'name' | 'description' | 'student_limit' | 'expiry_date' | 'status'>> & {
  org_admin?: Partial<OrganizationFormData['org_admin']>;
  course_ids?: string[];
};

/** Organization edits send changed details; courses use their own endpoint. */
export function organizationPayload(data: OrganizationFormData, isNew: boolean, original?: OrganizationFormData): OrganizationPayload {
  const fields = {
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
  };
  if (isNew) return { ...fields, course_ids: data.course_ids ?? [] };
  if (!original) throw new Error('Original organization details are required for an update.');
  const baseline = organizationPayload(original, true);
  const updates = Object.fromEntries(Object.entries(fields).filter(([key, value]) =>
    key !== 'org_admin' && value !== baseline[key as keyof OrganizationPayload],
  )) as OrganizationPayload;
  const adminUpdates = Object.fromEntries(Object.entries(fields.org_admin).filter(([key, value]) =>
    value !== baseline.org_admin?.[key as keyof OrganizationFormData['org_admin']],
  ));
  if (Object.keys(adminUpdates).length) updates.org_admin = adminUpdates;
  return updates;
}
