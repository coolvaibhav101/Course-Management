# Assign Courses to a Student

Organization admins can open Students → Assign Courses, select one or more
courses, and submit. The picker supports search, loading/error/empty states,
retry, and keyboard dismissal. It prevents duplicate submissions and refreshes
the student list after success.

The authenticated API client sends:

```http
POST /api/students/{studentId}/assign_courses/
Authorization: Bearer <access token>
Content-Type: application/json
```

```json
{ "course_ids": ["<selected course ID>"] }
```

IDs come from the student row and course list. The picker uses GET `/courses/`
with `organization_id` when available, as the Organization Courses page does.
When the login data has no organization ID, backend authorization must scope the
course list to the authenticated organization admin.

When the student response includes `course_ids`, those courses show as assigned
and are included in the request to preserve known enrollments. The supplied
assignment screenshot does not establish whether the backend adds courses or
replaces enrollments, nor does it show a readable response body. Confirm these
details and the student response field for assigned IDs before relying on
assignment to students whose existing course IDs are unavailable.

These backend checks are recorded in `remaining-work.md`. Local API tests cover
the endpoint, payload, Bearer authorization, validation, organization filter,
request failures, and student-list refresh.
