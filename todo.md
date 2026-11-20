# Next.js App — Organization & Student Flow Implementation List

## Scope
- Add **Organization Admin** flow to the Next.js Redux app.
- Add **Student** flow to the Next.js Redux app.
- No Instructor flow.
- Keep `/dashboard` as the default landing page for every role.
- No quick/demo login buttons.
- Adapt the static Enrollment app UI to the existing Next.js admin styling (purple/indigo theme, cards, tables).

---

## Phase 1 — Foundation

1. Role constants & navigation
   - File: `src/constants/roleKeys.ts`
     - Normalize roles: `SUPER_ADMIN`, `ORG_ADMIN`, `STUDENT`.
     - Fix mislabeled mock defaults in `usersDefaultLogin`.
   - File: `src/constants/navItems.ts`
     - Keep current structure, ensure routes exist for each role.
   - Add role-string mapper so any casing from login API maps to the constants above.

2. Auth / route guards
   - File: `component/ProtectedRoute.tsx`
     - Add optional `allowedRoles` prop.
     - Redirect unauthorized users to their first allowed route.
   - File: `app/MainPage.tsx`
     - Enforce role-based access on the current route.
   - File: `app/login/page.tsx`
     - Redirect all roles to `/dashboard` on success.
   - File: `app/page.tsx`
     - Redirect authenticated users to `/dashboard`.
   - File: `component/PrivateRoute.tsx`
     - Remove or fix the unused incomplete guard.

3. Cleanup / alignment
   - File: `src/constants/localStorageKeys.ts`
     - Align key names with `connection.ts` and `userSlice.ts`.
   - Add shared TypeScript user types (e.g., `types/user.ts`) instead of using `any`.

---

## Phase 2 — Organization Admin Flow

1. Create new shared component
   - `component/CreateStudent.tsx`
     - Adapted from `Enrollment and User Flow/src/components/CreateStudent.tsx`.
     - Form fields: name, email, phone, enrollment number, temporary password.
     - “Generate password” button.
     - Submit calls backend create-student endpoint.

2. New page
   - `app/students/page.tsx`
     - List students in the org admin’s organization.
     - Search/filter.
     - “Add Student” button → open `CreateStudent`.
     - Loading skeletons.

3. Update existing pages to be role-aware
   - `app/dashboard/page.tsx`
     - `ORG_ADMIN` → org overview: stats, recent student activity.
   - `app/courses/page.tsx`
     - `ORG_ADMIN` → view org-scoped courses (read/manage mode).
   - `app/announcements/page.tsx`
     - `ORG_ADMIN` → can create announcements scoped to their organization; list filtered to org.
   - `app/reports/page.tsx`
     - New page for org admin reports: completion rate, active students, enrollments, course performance.

---

## Phase 3 — Student Flow

1. Reusable student components (under `component/student/`)
   - `WelcomeBanner.tsx`
   - `ProgressDashboard.tsx`
   - `ClassSchedule.tsx`
   - `AssignmentsList.tsx`
   - `MessagingCenter.tsx`
   - `LMSLauncher.tsx`

2. New / updated pages
   - `app/dashboard/page.tsx`
     - `STUDENT` → welcome banner, stats, my courses, skill graph, mini calendar, certifications.
   - `app/courses/page.tsx`
     - `STUDENT` → enrolled course cards with progress and “Launch / Continue”.
   - `app/calendar/page.tsx`
     - `ClassSchedule` component.
   - `app/messages/page.tsx`
     - `MessagingCenter` component (inbox, help & support, send message).
   - `app/reports/page.tsx`
     - `STUDENT` → `ProgressDashboard` (analytics view).
   - `app/certifications/page.tsx`
     - Certificates list with download buttons.

---

## Phase 4 — API Integration

1. Keep using `src/utils/connection.ts`.
2. Add lightweight service/hook files (e.g., `src/services/students.ts`, `src/services/courses.ts`, etc.).
3. Needed backend endpoints (to be provided later):
   - Org admin:
     - GET / POST students for an organization
     - GET org-scoped courses
     - GET / POST org-scoped announcements
     - GET org reports / stats
   - Student:
     - GET enrolled courses
     - GET assignments
     - GET calendar / schedule
     - GET messages / announcements
     - GET progress summary
     - GET certificates

4. If endpoints are not available yet, implement with configurable service hooks and clear TODO markers so they can be swapped later.

---

## Phase 5 — Verification

1. Run `npm run lint`.
2. Run `npm run build`.
3. Smoke-test login + navigation for each role.
4. Fix TypeScript / React 19 issues.
