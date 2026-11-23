import api from "@/src/utils/connection";
import {
  parseEnrolledCourses,
  parseCourseContent,
  parseCourseProgress,
  parseCompletionDetails,
  parseStudentAnnouncements,
} from "./studentData";

export type {
  EnrolledCourse,
  StudentChapter,
  StudentCourseContent,
  StudentCourseProgress,
  StudentCompletionDetails,
  StudentAnnouncement,
} from "./studentData";

export interface Assignment {
  id: string;
  title: string;
  course: string;
  due_date: string;
  status: "pending" | "submitted" | "graded";
  grade?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: "instructor-led" | "self-paced";
  date: string;
  time: string;
  instructor: string;
  zoom_link?: string;
}

export interface Certificate {
  id: string;
  name: string;
  earned_date: string;
}

/**
 * Student learning endpoints use the existing Bearer-token/refresh client.
 * TODO: confirm the unrelated assignments/calendar/certificates APIs.
 */

export async function getEnrolledCourses() {
  const response = await api.get("/students/my-courses/", {
    cache: "no-store",
  });
  return parseEnrolledCourses(response.data);
}

function requiredId(id: string, label: string) {
  if (!id?.trim()) throw new Error(`${label} is required`);
  return encodeURIComponent(id.trim());
}

export async function getCourseContent(courseId: string) {
  const response = await api.get(
    `/courses/${requiredId(courseId, "Course ID")}/`,
    { cache: "no-store" },
  );
  return parseCourseContent(response.data, courseId);
}

export async function getCourseProgress(courseId: string) {
  const response = await api.get(
    `/students/${requiredId(courseId, "Course ID")}/progress/`,
    { cache: "no-store" },
  );
  return parseCourseProgress(response.data, courseId);
}

export async function completeChapter(chapterId: string) {
  requiredId(chapterId, "Chapter ID");
  // The API identifies the course from the chapter; send only this field.
  const response = await api.post("/students/complete-chapter/", {
    chapter_id: chapterId.trim(),
  });
  return response.data;
}

export async function getCompletionDetails() {
  const response = await api.get("/students/completion-details/", {
    cache: "no-store",
  });
  return parseCompletionDetails(response.data);
}

export async function getAssignments() {
  try {
    const response = await api.get("/students/assignments/");
    return (response?.data ?? []) as Assignment[];
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return [] as Assignment[];
  }
}

export async function getCalendarEvents() {
  try {
    const response = await api.get("/students/calendar/");
    return (response?.data ?? []) as CalendarEvent[];
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return [] as CalendarEvent[];
  }
}

export async function getStudentAnnouncements() {
  const response = await api.get("/announcements/", { cache: "no-store" });
  return parseStudentAnnouncements(response.data);
}

export async function getCertificates() {
  try {
    const response = await api.get("/students/certificates/");
    return (response?.data ?? []) as Certificate[];
  } catch (error) {
    console.error("Failed to fetch certificates:", error);
    return [] as Certificate[];
  }
}
