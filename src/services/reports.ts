import api from "@/src/utils/connection";

export interface OrganizationReport {
  completion_rate: number;
  active_students: number;
  total_enrollments: number;
  course_performance: {
    id: string;
    title: string;
    avg_progress: number;
  }[];
}

/**
 * Fetch organization-level reports.
 * TODO: adjust endpoint/path when backend contract is provided.
 */
export async function getOrganizationReports(organizationId?: string) {
  try {
    const response = await api.get(
      `/reports/organization/${organizationId ? `?organization_id=${organizationId}` : ""}`,
    );
    return (response?.data ?? null) as OrganizationReport | null;
  } catch (error) {
    console.error("Failed to fetch organization reports:", error);
    return null;
  }
}
