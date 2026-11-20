import api from "@/src/utils/connection";

export interface Course {
  id: string;
  title: string;
  description?: string;
  student_count?: number;
  organization_count?: number;
  average_completion?: number;
  enrollments?: number;
  avg_progress?: number;
  progress?: number;
  lessons?: string;
  image?: string;
}

/**
 * Fetch courses. Optionally filter by organization or student.
 * TODO: adjust query params when backend contract is provided.
 */
export async function getCourses(filters?: {
  organization_id?: string;
  student_id?: string;
}) {
  try {
    const response = await api.get("/courses/", { params: filters });
    return (response?.data ?? []) as Course[];
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return [] as Course[];
  }
}

/** Add one course to an organization without replacing its other assignments. */
export async function assignCourseToOrganization(courseId: string, organizationId: string) {
  if (!courseId?.trim()) throw new Error("Course ID is required");
  if (!organizationId?.trim()) throw new Error("Organization ID is required");
  const response = await api.post(`/courses/${encodeURIComponent(courseId.trim())}/assign_to_organization/`, {
    organization_id: organizationId.trim(),
  });
  return response.data;
}

/** Report each result so a retry sends only the courses that failed. */
export async function assignCoursesToOrganization(courseIds: string[], organizationId: string) {
  if (!organizationId?.trim()) throw new Error("Organization ID is required");
  if (!Array.isArray(courseIds) || !courseIds.length || courseIds.some((id) => typeof id !== "string" || !id.trim())) {
    throw new Error("Select at least one course");
  }
  const ids = [...new Set(courseIds.map((id) => id.trim()))];
  const results = await Promise.allSettled(ids.map((id) => assignCourseToOrganization(id, organizationId)));
  return {
    assigned: ids.filter((_, index) => results[index].status === "fulfilled"),
    failed: ids.filter((_, index) => results[index].status === "rejected"),
  };
}
