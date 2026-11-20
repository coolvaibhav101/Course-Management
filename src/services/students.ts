import api, { ApiError } from "@/src/utils/connection";
import type { Course } from "./courses";

export interface CreateStudentPayload {
  name: string;
  email: string;
  phone: string;
  enrolment_number: string;
  temporary_password: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  enrollment_number?: string;
  enrolment_number?: string;
  organization_id?: string;
  organization_name?: string;
  courses?: number;
  course_ids?: string[];
  progress?: number;
  last_active?: string;
}

/**
 * Fetch students for an organization.
 * TODO: adjust endpoint/path as needed when backend contract is provided.
 */
export async function getStudents(organizationId?: string) {
  const response = await api.get<Student[]>("/students/", {
    params: organizationId ? { organization_id: organizationId } : undefined,
    cache: "no-store",
  });
  if (!Array.isArray(response.data)) throw new Error("Unexpected students response");
  return response.data;
}

/** Use the same org-filtered course list as Organization Courses; failures reach the picker. */
export async function getAssignableCourses(organizationId?: string) {
  const response = await api.get<Course[] | { results: Course[] }>("/courses/", {
    params: organizationId ? { organization_id: organizationId } : undefined,
    cache: "no-store",
  });
  const courses = Array.isArray(response.data) ? response.data : response.data?.results;
  if (!Array.isArray(courses) || courses.some((course) => !course?.id || !course?.title)) {
    throw new Error("Unexpected courses response");
  }
  return courses;
}

/** POST /students/{studentId}/assign_courses/ with the selected course IDs. */
export async function assignCoursesToStudent(studentId: string, courseIds: string[]) {
  if (!studentId?.trim()) throw new Error("Student ID is required");
  if (!Array.isArray(courseIds) || courseIds.length === 0 || courseIds.some((id) => typeof id !== "string" || !id.trim())) {
    throw new Error("Select at least one course");
  }
  const response = await api.post(`/students/${encodeURIComponent(studentId.trim())}/assign_courses/`, {
    course_ids: [...new Set(courseIds.map((id) => id.trim()))],
  });
  return response.data;
}

/**
 * The authenticated organization admin determines the student's organization.
 * POST /students/ accepts exactly these five fields.
 */
export async function createStudent(payload: CreateStudentPayload) {
  if ([payload.name, payload.email, payload.phone, payload.enrolment_number, payload.temporary_password]
    .some((value) => typeof value !== "string" || !value.trim())) {
    throw new Error("Please fill in all required fields");
  }
  if (!/^\+?[\d\s().-]+$/.test(payload.phone.trim()) || !/\d/.test(payload.phone)) {
    throw new Error("Please enter a valid phone number");
  }
  return api.post("/students/", {
    name: payload.name.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    enrolment_number: payload.enrolment_number.trim(),
    temporary_password: payload.temporary_password,
  });
}

/** Keep backend validation details visible, including nested error responses. */
export function getStudentCreationErrorMessage(error: unknown): string {
  const labels: Record<string, string> = {
    name: "Student name", email: "Email", phone: "Phone number",
    enrolment_number: "Enrolment number", temporary_password: "Temporary password",
    organization: "Organization", organization_id: "Organization",
  };
  const collect = (value: unknown, label = ""): string[] => {
    if (typeof value === "string") {
      const message = value.trim();
      // HTML error pages must not be shown as form validation messages.
      if (!message || /<\/?[a-z][^>]*>/i.test(message)) return [];
      return [label ? `${label}: ${message}` : message];
    }
    if (Array.isArray(value)) return value.flatMap((item) => collect(item, label));
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).flatMap(([key, item]) => {
      if (labels[key]) return collect(item, labels[key]);
      if (["message", "detail", "error", "errors", "data", "non_field_errors"].includes(key)) {
        return collect(item, label);
      }
      if (["status", "status_code", "code", "success"].includes(key)) return [];
      return collect(item, key.replaceAll("_", " "));
    });
  };

  if (error instanceof ApiError) {
    const messages = [...new Set(collect(error.data))];
    if (messages.length) return `${messages.join(" ")} (HTTP ${error.status})`;
    if (/failed to fetch|network|offline|load failed/i.test(error.message)) {
      return "Could not reach the server. Check your connection and try again.";
    }
    if (error.status === 401) return "Your session has expired. Sign in again to add a student.";
    if (error.status === 403) return "You do not have permission to add students. Sign in as an organization admin. (HTTP 403)";
    if (error.status >= 500) return `The server could not add the student. Please try again. (HTTP ${error.status})`;
    return `${error.message} (HTTP ${error.status})`;
  }
  return error instanceof Error ? error.message : "Failed to add student. Please try again.";
}
