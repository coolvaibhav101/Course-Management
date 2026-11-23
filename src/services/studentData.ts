// Response mapping lives here so it can be aligned with backend JSON independently
// of the screens. Endpoint/request contracts are confirmed by the Postman examples;
// My-courses, chapter, and completion-details fields are confirmed;
// course progress and chapter-completion responses still need examples.
export interface EnrolledCourse {
  id: string;
  title: string;
  lessons: string;
  progress?: number;
  image?: string;
  total_chapters?: number;
  completed_chapters?: number;
  grade?: string;
}

export interface StudentChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  video_url?: string;
  is_completed: boolean;
}

export interface StudentCourseContent {
  id: string;
  title: string;
  description: string;
  chapters: StudentChapter[];
}

export interface StudentCourseProgress {
  course_id: string;
  progress?: number;
  total_chapters?: number;
  completed_chapters?: number;
  completed_chapter_ids: string[];
}

export interface StudentCompletionDetails {
  total_courses?: number;
  completed_courses?: number;
  total_chapters?: number;
  completed_chapters?: number;
  average_progress?: number;
  streak_days?: number;
  hours_learned?: number;
  average_test_score?: number;
  courses: EnrolledCourse[];
}

export interface StudentAnnouncement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  sender?: string;
  is_read?: boolean;
}

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function unwrap(value: unknown): unknown {
  const data = object(value).data;
  return data && typeof data === "object" ? data : value;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function number(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function percentage(value: unknown): number | undefined {
  const parsed = number(value);
  return parsed === undefined ? undefined : Math.min(100, parsed);
}

function completed(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "completed";
}

function list(value: unknown, key: string): unknown[] {
  const unwrapped = unwrap(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  const data = object(unwrapped);
  const items = data[key] ?? data.results;
  if (!Array.isArray(items)) throw new Error(`Unexpected ${key} response`);
  return items;
}

function progressFields(data: JsonObject) {
  const progressData = object(data.progress);
  const total = number(data.total_chapters ?? data.chapter_count ?? progressData.total_chapters);
  const done = number(data.completed_chapters ?? data.completed_chapter_count ?? progressData.completed_chapters);
  const progress = percentage(
    data.progress_percent ?? data.progress_percentage ?? data.completion_percentage ??
      progressData.progress_percentage ?? progressData.percentage ??
      (typeof data.progress === "object" ? undefined : data.progress),
  ) ?? (total !== undefined && done !== undefined
    ? (total === 0 ? 0 : Math.min(100, (done / total) * 100))
    : undefined);
  return { progress, total_chapters: total, completed_chapters: done };
}

function course(value: unknown): EnrolledCourse {
  const enrollment = object(value);
  const nested = object(enrollment.course);
  const data = { ...nested, ...enrollment };
  const id = text(nested.id ?? enrollment.course_id ?? enrollment.id);
  if (!id) throw new Error("Course response is missing its ID");
  const fields = progressFields(data);
  return {
    id,
    title: text(data.title ?? data.course_title ?? data.name) || "Untitled course",
    lessons: text(data.lessons) || (fields.total_chapters === undefined
      ? "" : `${fields.total_chapters} ${fields.total_chapters === 1 ? "chapter" : "chapters"}`),
    image: text(data.image ?? data.thumbnail) || undefined,
    grade: text(data.grade) || undefined,
    ...fields,
  };
}

export function parseEnrolledCourses(value: unknown): EnrolledCourse[] {
  return list(value, "courses").map(course);
}

export function parseStudentAnnouncements(value: unknown): StudentAnnouncement[] {
  return list(value, "announcements").map((value) => {
    const data = object(value);
    const id = text(data.id);
    if (!id) throw new Error("Announcement response is missing its ID");
    const creator = object(data.created_by);
    return {
      id,
      title: text(data.title),
      message: text(data.message),
      created_at: text(data.created_at),
      sender: text(data.created_by_name ?? creator.name ?? creator.email ?? data.created_by) || undefined,
      is_read: typeof data.is_read === "boolean" ? data.is_read : undefined,
    };
  });
}

export function parseCourseContent(value: unknown, courseId: string): StudentCourseContent {
  const unwrapped = unwrap(value);
  const data = object(unwrapped);
  const metadata = { ...object(data.course), ...data };
  const chapters = list(unwrapped, "chapters").map((value, index) => {
    const chapter = object(value);
    const id = text(chapter.id ?? chapter.chapter_id);
    if (!id) throw new Error("Chapter response is missing its ID");
    return {
      id,
      title: text(chapter.title) || `Chapter ${index + 1}`,
      content: text(chapter.content),
      order: number(chapter.order) ?? index + 1,
      video_url: text(chapter.video_url ?? chapter.video ?? chapter.media_url) || undefined,
      is_completed: completed(chapter.is_completed ?? chapter.completed ?? chapter.status),
    };
  }).sort((a, b) => a.order - b.order);
  return {
    id: text(metadata.id ?? metadata.course_id) || courseId,
    title: text(metadata.title ?? metadata.course_title) || "Course content",
    description: text(metadata.description),
    chapters,
  };
}

export function parseCourseProgress(value: unknown, courseId: string): StudentCourseProgress {
  const unwrapped = unwrap(value);
  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    throw new Error("Unexpected course progress response");
  }
  const data = object(unwrapped);
  const ids = Array.isArray(data.completed_chapter_ids) ? data.completed_chapter_ids :
    Array.isArray(data.completed_chapters) ? data.completed_chapters : [];
  const completedIds = ids.map((item) => text(object(item).chapter_id ?? object(item).id ?? item)).filter(Boolean);
  if (Array.isArray(data.chapters)) {
    for (const item of data.chapters) {
      const chapter = object(item);
      if (completed(chapter.is_completed ?? chapter.completed ?? chapter.status)) {
        const id = text(chapter.chapter_id ?? chapter.id);
        if (id) completedIds.push(id);
      }
    }
  }
  const fields = progressFields(data);
  return {
    course_id: text(data.course_id) || courseId,
    ...fields,
    completed_chapters: fields.completed_chapters ??
      (Array.isArray(data.completed_chapter_ids) || Array.isArray(data.completed_chapters) || Array.isArray(data.chapters)
        ? new Set(completedIds).size : undefined),
    completed_chapter_ids: [...new Set(completedIds)],
  };
}

export function parseCompletionDetails(value: unknown): StudentCompletionDetails {
  const unwrapped = unwrap(value);
  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    throw new Error("Unexpected completion details response");
  }
  const data = object(unwrapped);
  return {
    total_courses: number(data.total_courses ?? data.enrolled_courses),
    completed_courses: number(data.completed_courses),
    total_chapters: number(data.total_chapters),
    completed_chapters: number(data.completed_chapters),
    average_progress: percentage(data.average_progress ?? data.overall_progress ?? data.progress_percentage),
    streak_days: number(data.streak_days),
    hours_learned: number(data.hours_learned),
    average_test_score: percentage(data.average_test_score),
    courses: Array.isArray(data.courses) ? data.courses.map(course) : [],
  };
}
