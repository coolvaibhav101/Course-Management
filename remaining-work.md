# Remaining Organization Admin and Student Work

Reviewed against `todo.md` and the current code on October 9, 2026.

Status: deferred while API changes are handled. This checklist records remaining work; it does not implement it. Recheck API-related items after those changes.

Student learning API integration has now been added. Items marked complete below
refer to implementation; live backend verification is still pending.

## Foundation and access

- [ ] Make `ProtectedRoute` redirect unauthorized roles to their first allowed route instead of rendering nothing when `allowedRoles` rejects access.
  - File: `component/ProtectedRoute.tsx`
  - `app/MainPage.tsx` currently handles redirects separately.

## Organization Admin

- [x] Add Assign Courses to each student row, with a searchable course picker and POST `/students/{studentId}/assign_courses/` using `course_ids`; refresh students after success.
- [ ] Verify course assignment against the live backend and confirm whether it adds to or replaces existing enrollments. Known student `course_ids` are preserved in requests; confirm a field/endpoint for existing IDs when students already have courses.
- [ ] Enable the org-admin `/reports` navigation entry so `MainPage` permits the route.
  - File: `src/constants/navItems.ts`
  - The reports page and `OrgReports` component already exist.
- [ ] Finish organization-scoped announcements.
  - Filter the list using the authenticated admin's organization ID.
  - Include that organization in creation requests and restrict audience choices to the admin's scope.
  - Replace mock student recipients with students from the organization.
  - Confirm backend authorization enforces the same scope.
  - Files: `app/announcements/page.tsx`, `component/CreateAnnouncement.tsx`
- [ ] Replace hardcoded report totals and dashboard trends with real data or clear unavailable states.
  - Files: `component/OrgReports.tsx`, `component/OrgDashboard.tsx`

## Student Flow

- [x] Connect course Launch/Continue buttons to the student course viewer at `/courses/{courseId}`.
  - Files: `app/courses/page.tsx`, `component/StudentDashboardHome.tsx`
  - Viewer: `component/student/StudentCourseViewer.tsx`; loads content/progress and posts chapter completion.
- [ ] Connect message sending and support actions; replace placeholder resource links.
  - File: `component/student/MessagingCenter.tsx`
- [ ] Connect Join Zoom and View Full Calendar actions.
  - File: `component/student/ClassSchedule.tsx`
- [ ] Implement certificate downloads.
  - Files: `app/certifications/page.tsx`, `component/student/ProgressDashboard.tsx`
- [ ] Decide where to expose the existing `AssignmentsList` and `LMSLauncher` components and connect their actions.
  - Both components exist but are currently unused by pages.
  - Files: `component/student/AssignmentsList.tsx`, `component/student/LMSLauncher.tsx`
- [x] Connect student dashboard statistics and analytics to the completion-details service; display unavailable values rather than invented totals.
  - Response mapping is provisional until example JSON is provided.
- [ ] Replace the static skill graph and mini calendar with actual student data.
  - Files: `component/StudentDashboardHome.tsx`, `component/student/ProgressDashboard.tsx`
- [ ] Show genuine empty/error states instead of sample courses, schedules, assignments, messages, or certificates when requests fail or return no data.
  - Files: `component/StudentDashboardHome.tsx`, `component/student/`, `app/certifications/page.tsx`

## API Integration

- [x] Align student creation with POST `/students/`: `name`, `email`, `phone`, `enrolment_number`, and `temporary_password`. Omit `role`/`organization_id`; use the authenticated organization admin. Validate required fields/phone and show backend validation errors.
- [ ] Verify student creation with a real organization-admin session and confirm the returned student JSON.
- [x] Show student-creation validation details (including nested responses) and HTTP status both in a toast and beside the submit button; distinguish network, permission, and server failures.
- [x] Align organization list/edit data with the supplied response: read `admin`, write `org_admin`, and keep passwords blank unless explicitly changed.
- [x] Enable adding courses to existing organizations using POST `/courses/{courseId}/assign_to_organization/` with `organization_id`. Course assignments are separate from organization detail updates, and partial failures can be retried individually.
- [ ] Confirm organization PATCH support and a response field/endpoint for already assigned course IDs. Adding courses is enabled even when existing IDs are unknown; existing assignments are kept. Live organization-assignment and duplicate-assignment behavior still need verification.
- [ ] Confirm backend endpoint paths, query parameters, request fields, and response shapes for students, courses, reports, assignments, schedules, messages, announcements, and certificates.
  - Files: `src/services/students.ts`, `src/services/student.ts`, `src/services/courses.ts`, `src/services/reports.ts`
  - These services already exist and contain backend-contract TODO markers.
- [x] Implement the five supplied student learning endpoints through the existing authenticated client.
  - GET `/students/my-courses/`
  - GET `/courses/{courseId}/` for student course content
  - GET `/students/{courseId}/progress/`
  - POST `/students/complete-chapter/` with `{ "chapter_id": "<selected chapter ID>" }`
  - GET `/students/completion-details/`
- [x] Map the supplied my-courses `chapter_count` and show it beneath course titles, including 0 chapters.
- [ ] Obtain example response JSON for course progress and chapter completion, then confirm/update `src/services/studentData.ts` against the actual fields.
  - My-courses, chapter content, and completion-details responses are supplied. Course progress and chapter-completion response bodies remain pending.
  - Provisional mapping and local development configuration are documented in `docs/student-learning-api.md`.
- [x] Add a student completion-details service and connect it to dashboard/analytics data.
- [ ] Add service support for message sending and certificate downloads as backend contracts become available.
- [ ] Propagate request failures so screens can distinguish errors from successful empty responses.
  - Several services currently catch failures and return `[]` or `null`.
  - The five student learning services now propagate failures, and their screens provide retry actions.

## Verification and Tracking

- [ ] Smoke-test login, refresh, logout, navigation, and forbidden routes for `SUPER_ADMIN`, `ORG_ADMIN`, and `STUDENT`.
- [ ] Verify organization isolation for students, courses, announcements, and reports using real backend data.
- [ ] Verify student actions after they are connected.
- [x] Replace the two raw course-card `<img>` usages with shared cards using Next.js `Image`.
- [ ] Resolve the unused `onSave` prop lint warning in `component/CourseEditor.tsx`.
- [x] Run lint, production build, and student API fixture tests after this integration.
- [ ] Update `todo.md` to distinguish completed tasks from remaining work.

## Latest Verification

- Original review: `npm run lint` passed with 0 errors and 3 warnings; `npm run build` passed.
- Student API integration: `npm run lint` passed with 0 errors and 1 existing `CourseEditor` warning.
- `npm run build`: passed, including TypeScript checks and `/courses/[courseId]`.
- `node --test tests/student-api.test.mjs`: all 5 tests passed (endpoint methods/paths, authorization, completion payload, empty/error handling, ID validation, and token refresh).
- Interactive role smoke tests and backend behavior: not verified in this review.

## Optional Follow-ups for Existing UI

These buttons are visible in the current UI but are not explicit requirements in `todo.md`:

- [ ] Connect Students → View Details (`app/students/page.tsx`).
- [ ] Connect Organization Courses → Manage Assignments (`app/courses/page.tsx`).
- [ ] Connect Organization Reports → Export Report (`component/OrgReports.tsx`).
