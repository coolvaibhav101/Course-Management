import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// Exercise the actual service and authenticated fetch client without a browser
// or live credentials. TypeScript is already a project dependency.
function setup(responses, servicePath = "src/services/student.ts") {
  const calls = [];
  const storage = new Map([["auth_token", "test-access"], ["refresh_token", "test-refresh"]]);
  const cache = new Map();
  const context = vm.createContext({
    console, Error, URL, URLSearchParams, FormData, process: { env: { NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000/api" } },
    window: { localStorage: null, location: { href: "" } },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    fetch: async (url, config) => {
      calls.push({ url, ...config });
      const next = responses.shift();
      assert.ok(next, `Unexpected request: ${url}`);
      if (next.error) throw new Error(next.error);
      return new Response(next.status === 204 ? null : JSON.stringify(next.body), {
        status: next.status ?? 200, headers: { "Content-Type": "application/json" },
      });
    },
  });
  function load(path) {
    const filename = resolve(path);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const localRequire = (specifier) => load(specifier.startsWith("@/")
      ? `${specifier.slice(2)}.ts`
      : resolve(dirname(filename), `${specifier}.ts`));
    const fn = vm.runInContext(`(function(require, module, exports) {${compiled}\n})`, context, { filename });
    fn(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { service: load(servicePath), calls, storage };
}

test("all five endpoints use Bearer authorization and the selected IDs", async () => {
  const { service, calls } = setup([
    { body: { results: [{ id: "enrollment-1", course: { id: "course-1", title: "Networks" }, total_chapters: 2, completed_chapters: 1 }] } },
    { body: { id: "course-1", title: "Networks", chapters: [{ id: "chapter-2", title: "Second", order: 2, content: "<p>Hello</p>" }, { id: "chapter-1", title: "First", order: 1 }] } },
    { body: { total_chapters: 2, completed_chapter_ids: ["chapter-1"], progress_percentage: 50 } },
    { status: 204 },
    { body: { student_id: "11111111-1111-4111-8111-111111111111", student_name: "student@example.com", total_courses: 9, completed_courses: 0, average_progress: 0 } },
  ]);
  const courses = await service.getEnrolledCourses();
  assert.equal(courses[0].id, "course-1");
  assert.equal(courses[0].progress, 50);
  const content = await service.getCourseContent(courses[0].id);
  assert.equal(content.chapters[0].id, "chapter-1");
  const progress = await service.getCourseProgress(courses[0].id);
  assert.equal(progress.completed_chapters, 1);
  await service.completeChapter(content.chapters[1].id);
  const summary = await service.getCompletionDetails();
  assert.equal(summary.total_courses, 9);
  assert.equal(summary.completed_courses, 0);
  assert.equal(summary.average_progress, 0);
  assert.equal(summary.total_chapters, undefined);
  assert.equal(summary.completed_chapters, undefined);
  assert.deepEqual(calls.map((call) => call.url), [
    "http://localhost:8000/api/students/my-courses/",
    "http://localhost:8000/api/courses/course-1/",
    "http://localhost:8000/api/students/course-1/progress/",
    "http://localhost:8000/api/students/complete-chapter/",
    "http://localhost:8000/api/students/completion-details/",
  ]);
  assert.deepEqual(calls.map((call) => call.method), ["GET", "GET", "GET", "POST", "GET"]);
  assert.ok(calls.every((call) => call.headers.Authorization === "Bearer test-access"));
  assert.deepEqual(JSON.parse(calls[3].body), { chapter_id: "chapter-2" });
});

test("PUT chapter updates preserve multipart fields and let the browser set the upload boundary", async () => {
  const { service: connection, calls } = setup([{ status: 204 }], "src/utils/connection.ts");
  const payload = new FormData();
  payload.append("title", "Chapter 5");
  payload.append("content", "<p>Updated lesson</p>");
  payload.append("order", "7");
  payload.append("video", new Blob(["video-fixture"], { type: "video/mp4" }), "lesson.mp4");
  await connection.api.put("/courses/course-1/chapters/chapter-5/", payload);
  assert.equal(calls[0].url, "http://localhost:8000/api/courses/course-1/chapters/chapter-5/");
  assert.equal(calls[0].method, "PUT");
  assert.equal(calls[0].headers.Authorization, "Bearer test-access");
  assert.equal(calls[0].headers["Content-Type"], undefined);
  assert.equal(calls[0].body, payload);
  assert.equal(calls[0].body.get("order"), "7");
  assert.equal(calls[0].body.get("video").name, "lesson.mp4");
  assert.equal(calls[0].body.has("media_url"), false);
});

test("PUT JSON requests keep their JSON body and content type", async () => {
  const { service: connection, calls } = setup([{ status: 204 }], "src/utils/connection.ts");
  await connection.api.put("/courses/course-1/", { title: "Updated course" });
  assert.equal(calls[0].body, '{"title":"Updated course"}');
  assert.equal(calls[0].headers["Content-Type"], "application/json");
});

test("request errors remain errors, while an empty course list remains empty", async () => {
  const { service } = setup([
    { body: [] }, { status: 403, body: { message: "Forbidden" } },
    { body: { unexpected: [] } }, { error: "offline" },
  ]);
  assert.equal((await service.getEnrolledCourses()).length, 0);
  await assert.rejects(service.getCourseContent("course-1"), /Forbidden/);
  await assert.rejects(service.getEnrolledCourses(), /Unexpected courses response/);
  await assert.rejects(service.completeChapter("chapter-1"), /offline/);
});

test("missing IDs are rejected without issuing requests; URL segments are encoded", async () => {
  const { service, calls } = setup([{ body: { chapters: [] } }]);
  await assert.rejects(service.getCourseContent(""), /Course ID is required/);
  await assert.rejects(service.getCourseProgress(" "), /Course ID is required/);
  await assert.rejects(service.completeChapter(""), /Chapter ID is required/);
  assert.equal(calls.length, 0);
  await service.getCourseContent("course/1");
  assert.equal(calls[0].url, "http://localhost:8000/api/courses/course%2F1/");
});

test("course details preserve metadata, chapter content, has_video flags, and order", async () => {
  const { service, calls } = setup([{ body: { data: { id: "course-1", title: "Django", description: "Learn Django", chapters: [
    { id: "chapter-2", title: "Second", content: "<h2>Second lesson</h2>", has_video: true, order: 2 },
    { id: "chapter-1", title: "Introduction", content: "Django is very flexible framework.", has_video: false, video_url: "https://example.com/old.mp4", order: 1 },
  ] } } }, { body: { id: "course-2", title: "Empty course", chapters: [] } }, { body: { unexpected: [] } }]);
  const content = await service.getCourseContent("course-1");
  assert.equal(content.id, "course-1");
  assert.equal(content.title, "Django");
  assert.equal(content.description, "Learn Django");
  assert.deepEqual(Array.from(content.chapters, chapter => chapter.id), ["chapter-1", "chapter-2"]);
  assert.equal(content.chapters[0].title, "Introduction");
  assert.equal(content.chapters[0].content, "Django is very flexible framework.");
  assert.equal(content.chapters[0].has_video, false);
  assert.equal(content.chapters[1].has_video, true);
  assert.equal(content.chapters[0].video_url, undefined);
  assert.equal((await service.getCourseContent("course-2")).chapters.length, 0);
  await assert.rejects(service.getCourseContent("course-3"), /Unexpected chapters response/);
  assert.ok(calls.every(call => call.cache === "no-store" && call.headers.Authorization === "Bearer test-access"));
  assert.deepEqual(calls.map(call => call.url), [
    "http://localhost:8000/api/courses/course-1/",
    "http://localhost:8000/api/courses/course-2/",
    "http://localhost:8000/api/courses/course-3/",
  ]);
});

test("chapter video URLs use the selected IDs and authenticated uncached endpoint", async () => {
  const { service, calls } = setup([{ body: { video_url: "https://cdn.example.com/lesson.mp4?token=test" } }]);
  assert.equal(await service.getChapterVideoUrl("course/1", "chapter/2"), "https://cdn.example.com/lesson.mp4?token=test");
  assert.equal(calls[0].url, "http://localhost:8000/api/courses/course%2F1/chapters/chapter%2F2/video-url/");
  assert.equal(calls[0].headers.Authorization, "Bearer test-access");
  assert.equal(calls[0].cache, "no-store");
});

test("video URL requests reject missing IDs before fetching and propagate unusable URLs or server failures", async () => {
  const { service, calls } = setup([
    { body: { video_url: "javascript:alert(1)" } }, { body: {} }, { status: 403, body: { message: "Forbidden" } },
  ]);
  await assert.rejects(service.getChapterVideoUrl("", "chapter-1"), /Course ID is required/);
  await assert.rejects(service.getChapterVideoUrl("course-1", ""), /Chapter ID is required/);
  assert.equal(calls.length, 0);
  await assert.rejects(service.getChapterVideoUrl("course-1", "chapter-1"), /video URL/i);
  await assert.rejects(service.getChapterVideoUrl("course-1", "chapter-1"), /video URL/i);
  await assert.rejects(service.getChapterVideoUrl("course-1", "chapter-1"), /Forbidden/);
});

test("an expired access token refreshes and retries the student request", async () => {
  const { service, calls, storage } = setup([
    { status: 401, body: { message: "Expired" } },
    { body: { access: "renewed-access" } },
    { body: { total_courses: 0 } },
  ]);
  assert.equal((await service.getCompletionDetails()).total_courses, 0);
  assert.equal(calls[1].url, "http://localhost:8000/api/auth/refresh/");
  assert.deepEqual(JSON.parse(calls[1].body), { refresh: "test-refresh" });
  assert.equal(calls[2].headers.Authorization, "Bearer renewed-access");
  assert.equal(storage.get("auth_token"), "renewed-access");
});

test("unknown progress fields stay unavailable instead of inventing values", async () => {
  const { service } = setup([{ body: [{ id: "course-1", title: "Networks" }] }, { body: {} }]);
  const courses = await service.getEnrolledCourses();
  assert.equal(courses[0].progress, undefined);
  assert.equal(courses[0].total_chapters, undefined);
  const summary = await service.getCompletionDetails();
  assert.equal(summary.average_progress, undefined);
  assert.equal(summary.completed_courses, undefined);
});

test("student inbox loads announcements with authorization and preserves announcement fields", async () => {
  const { service, calls } = setup([{ body: { results: [
    { id: "announcement-1", title: "Course update", message: "First line\nSecond line", created_at: "2026-11-23T14:00:00Z", created_by: { name: "Admin" }, is_read: false },
    { id: "announcement-2", title: "Schedule", message: "New lesson available" },
  ] } }]);
  const announcements = await service.getStudentAnnouncements();
  assert.equal(calls[0].url, "http://localhost:8000/api/announcements/");
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].headers.Authorization, "Bearer test-access");
  assert.equal(calls[0].cache, "no-store");
  assert.equal(announcements[0].title, "Course update");
  assert.equal(announcements[0].message, "First line\nSecond line");
  assert.equal(announcements[0].created_at, "2026-11-23T14:00:00Z");
  assert.equal(announcements[0].sender, "Admin");
  assert.equal(announcements[0].is_read, false);
  assert.equal(announcements[1].sender, undefined);
  assert.equal(announcements[1].is_read, undefined);
});

test("empty announcements stay empty and request or malformed-response failures reach the inbox", async () => {
  const { service } = setup([
    { body: [] }, { status: 403, body: { message: "Forbidden" } }, { body: { unexpected: [] } },
  ]);
  assert.equal((await service.getStudentAnnouncements()).length, 0);
  await assert.rejects(service.getStudentAnnouncements(), /Forbidden/);
  await assert.rejects(service.getStudentAnnouncements(), /Unexpected announcements response/);
});

test("expired student announcement tokens refresh and retry the announcements endpoint", async () => {
  const { service, calls } = setup([
    { status: 401, body: { message: "Expired" } }, { body: { access: "renewed-access" } }, { body: [] },
  ]);
  assert.equal((await service.getStudentAnnouncements()).length, 0);
  assert.equal(calls[1].url, "http://localhost:8000/api/auth/refresh/");
  assert.equal(calls[2].url, "http://localhost:8000/api/announcements/");
  assert.equal(calls[2].headers.Authorization, "Bearer renewed-access");
});

test("my-courses chapter_count maps positive, single, and zero counts without inventing progress", async () => {
  const { service } = setup([{ body: [
    { id: "course-1", title: "Test", created_at: "2026-08-31T13:26:21Z", chapter_count: 5 },
    { id: "course-2", title: "Single chapter", chapter_count: 1 },
    { id: "course-3", title: "Empty course", chapter_count: 0 },
    { id: "course-4", title: "Unknown count" },
  ] }]);
  const courses = await service.getEnrolledCourses();
  assert.deepEqual(Array.from(courses, course => course.total_chapters), [5, 1, 0, undefined]);
  assert.deepEqual(Array.from(courses, course => course.lessons), ["5 chapters", "1 chapter", "0 chapters", ""]);
  assert.ok(courses.every(course => course.progress === undefined && course.completed_chapters === undefined));
});

test("my-courses progress_percent preserves zero and server percentages for Analytics", async () => {
  const { service } = setup([{ body: [
    { id: "course-empty", title: "Empty course", created_at: "2026-03-02T15:36:34.524086Z", chapter_count: 0, completed_chapter_count: 0, progress_percent: 0 },
    { id: "course-partial", title: "Partial course", created_at: "2026-03-02T15:36:34.524086Z", chapter_count: 8, completed_chapter_count: 3, progress_percent: 40 },
    { id: "course-complete", title: "Completed course", created_at: "2026-03-02T15:36:34.524086Z", chapter_count: 4, completed_chapter_count: 4, progress_percent: 100 },
    { id: "course-decimal", title: "Decimal progress", created_at: "2026-03-02T15:36:34.524086Z", chapter_count: 8, completed_chapter_count: 5, progress_percent: "62.5" },
  ] }]);
  const courses = await service.getEnrolledCourses();
  assert.deepEqual(Array.from(courses, course => course.progress), [0, 40, 100, 62.5]);
  assert.deepEqual(Array.from(courses, course => course.completed_chapters), [0, 3, 4, 5]);
});

test("course assignment posts the student ID and unique selected course IDs with authorization", async () => {
  const { service, calls } = setup([{ status: 204 }], "src/services/students.ts");
  await service.assignCoursesToStudent("student/1", ["course-1", "course-2", "course-1"]);
  assert.equal(calls[0].url, "http://localhost:8000/api/students/student%2F1/assign_courses/");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers.Authorization, "Bearer test-access");
  assert.deepEqual(JSON.parse(calls[0].body), { course_ids: ["course-1", "course-2"] });
});

test("course assignment rejects missing IDs or empty selections before making requests", async () => {
  const { service, calls } = setup([], "src/services/students.ts");
  await assert.rejects(service.assignCoursesToStudent("", ["course-1"]), /Student ID is required/);
  await assert.rejects(service.assignCoursesToStudent("student-1", []), /Select at least one course/);
  await assert.rejects(service.assignCoursesToStudent("student-1", [" "]), /Select at least one course/);
  assert.equal(calls.length, 0);
});

test("assignment course picker scopes course requests and propagates loading or assignment failures", async () => {
  const { service, calls } = setup([
    { body: { results: [{ id: "course-1", title: "Networks" }] } },
    { status: 403, body: { message: "Course not allotted to organization" } },
    { error: "offline" },
    { body: [] },
  ], "src/services/students.ts");
  assert.equal((await service.getAssignableCourses("org-1"))[0].id, "course-1");
  assert.equal(calls[0].url, "http://localhost:8000/api/courses/?organization_id=org-1");
  await assert.rejects(service.assignCoursesToStudent("student-1", ["course-2"]), /Course not allotted/);
  await assert.rejects(service.getAssignableCourses("org-1"), /offline/);
  assert.equal((await service.getAssignableCourses("org-1")).length, 0);
});

test("student list refresh uses the organization filter after assignments", async () => {
  const { service, calls } = setup([{ body: [{ id: "student-1", name: "Student", courses: 2 }] }], "src/services/students.ts");
  assert.equal((await service.getStudents("org-1"))[0].courses, 2);
  assert.equal(calls[0].url, "http://localhost:8000/api/students/?organization_id=org-1");
  assert.equal(calls[0].cache, "no-store");
});

test("organization assignment uses the selected course URL and organization-only body", async () => {
  const { service, calls } = setup([{ status: 204 }], "src/services/courses.ts");
  await service.assignCourseToOrganization("course/1", "org-1");
  assert.equal(calls[0].url, "http://localhost:8000/api/courses/course%2F1/assign_to_organization/");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers.Authorization, "Bearer test-access");
  assert.deepEqual(JSON.parse(calls[0].body), { organization_id: "org-1" });
});

test("organization assignment validates identifiers before requesting", async () => {
  const { service, calls } = setup([], "src/services/courses.ts");
  await assert.rejects(service.assignCourseToOrganization("", "org-1"), /Course ID is required/);
  await assert.rejects(service.assignCourseToOrganization("course-1", ""), /Organization ID is required/);
  await assert.rejects(service.assignCoursesToOrganization([], "org-1"), /Select at least one course/);
  assert.equal(calls.length, 0);
});

test("multiple organization assignments report partial success and retry only failed courses", async () => {
  const { service, calls } = setup([
    { status: 204 }, { status: 403, body: { message: "Cannot assign" } }, { status: 204 },
  ], "src/services/courses.ts");
  const result = await service.assignCoursesToOrganization(["course-1", "course-2", "course-1"], "org-1");
  assert.deepEqual(Array.from(result.assigned), ["course-1"]);
  assert.deepEqual(Array.from(result.failed), ["course-2"]);
  const retry = await service.assignCoursesToOrganization(result.failed, "org-1");
  assert.deepEqual(Array.from(retry.assigned), ["course-2"]);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url, "http://localhost:8000/api/courses/course-2/assign_to_organization/");
});

test("student creation uses the confirmed five-field request and Bearer authorization", async () => {
  const { service, calls } = setup([{ status: 201, body: { id: "student-1" } }], "src/services/students.ts");
  const payload = {
    name: " Student Test ", email: " student@example.com ", phone: " 1234567854 ",
    enrolment_number: " ENR-002 ", temporary_password: "test-only-password",
    role: "STUDENT", organization_id: "org-1", enrollment_number: "old-field", temp_password: "old-field",
  };
  await service.createStudent(payload);
  assert.equal(calls[0].url, "http://localhost:8000/api/students/");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers.Authorization, "Bearer test-access");
  assert.deepEqual(JSON.parse(calls[0].body), {
    name: "Student Test", email: "student@example.com", phone: "1234567854",
    enrolment_number: "ENR-002", temporary_password: "test-only-password",
  });
});

test("student creation rejects missing required data or an email in the phone field", async () => {
  const { service, calls } = setup([], "src/services/students.ts");
  const payload = { name: "Student", email: "student@example.com", phone: "1234567854", enrolment_number: "ENR-002", temporary_password: "test-only-password" };
  await assert.rejects(service.createStudent({ ...payload, enrolment_number: " " }), /required fields/);
  await assert.rejects(service.createStudent({ ...payload, temporary_password: "" }), /required fields/);
  await assert.rejects(service.createStudent({ ...payload, phone: "student@example.com" }), /valid phone number/);
  assert.equal(calls.length, 0);
});

test("student creation preserves server field errors for the form to display", async () => {
  const { service } = setup([{ status: 400, body: { email: ["A student with this email already exists."] } }], "src/services/students.ts");
  await assert.rejects(service.createStudent({ name: "Student", email: "student@example.com", phone: "1234567854", enrolment_number: "ENR-002", temporary_password: "test-only-password" }), (error) => {
    assert.equal(error.status, 400);
    assert.deepEqual(error.data.email, ["A student with this email already exists."]);
    return true;
  });
});

test("student creation displays nested validation errors and the HTTP status", async () => {
  const { service } = setup([{ status: 400, body: {
    errors: { email: ["This email is already registered."], enrolment_number: ["This number is already used."], organization: ["Student limit reached."] },
    status: "error",
  } }], "src/services/students.ts");
  try {
    await service.createStudent({ name: "Student", email: "student@example.com", phone: "1234567854", enrolment_number: "ENR-002", temporary_password: "test-only-password" });
    assert.fail("Expected validation failure");
  } catch (error) {
    assert.equal(service.getStudentCreationErrorMessage(error), "Email: This email is already registered. Enrolment number: This number is already used. Organization: Student limit reached. (HTTP 400)");
  }
});

test("student creation separates network, permission, and server failures", async () => {
  const cases = [
    { response: { error: "Failed to fetch" }, message: /Could not reach the server/ },
    { response: { status: 403, body: {} }, message: /organization admin.*HTTP 403/ },
    { response: { status: 500, body: "<!doctype html><html>Internal Server Error</html>" }, message: /^The server could not add the student.*HTTP 500/ },
    { response: { status: 400, body: { detail: "Organization is expired." } }, message: /^Organization is expired\. \(HTTP 400\)$/ },
    { response: { status: 400, body: "Invalid enrolment number." }, message: /^Invalid enrolment number\. \(HTTP 400\)$/ },
  ];
  for (const { response, message } of cases) {
    const { service } = setup([response], "src/services/students.ts");
    await assert.rejects(service.createStudent({ name: "Student", email: "student@example.com", phone: "1234567854", enrolment_number: "ENR-002", temporary_password: "test-only-password" }), error => {
      assert.match(service.getStudentCreationErrorMessage(error), message);
      return true;
    });
  }
});
