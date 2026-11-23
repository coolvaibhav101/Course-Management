# Student Learning API Integration

The student learning flow uses `src/utils/connection.ts` for Bearer authorization,
token refresh, and the configured API base URL. The default remains the existing
hosted backend. For local development, set:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

Restart the development server after changing this environment variable. The base
URL includes `/api` and has no trailing slash. Endpoint paths are relative to it.

| Method | Path | Used by |
| --- | --- | --- |
| GET | `/students/my-courses/` | Student courses, dashboard, analytics |
| GET | `/courses/{courseId}/` | Student course viewer |
| GET | `/students/{courseId}/progress/` | Course viewer and refresh after completion |
| POST | `/students/complete-chapter/` | Mark Chapter Complete |
| GET | `/students/completion-details/` | Student dashboard and analytics totals |
| GET | `/announcements/` | Student Messages inbox |

The completion body is exactly:

```json
{ "chapter_id": "<selected chapter ID>" }
```

The course UUID and chapter UUID come from API data. They are not hardcoded.
Launch/Continue links open `/courses/{courseId}`, available to students. Content
HTML is sanitized before display. A successful completion triggers a new progress
request; a failed completion leaves the chapter unchanged. A refresh failure
shows a retry action and disables further completion until progress is available.

Student course content loads with GET `/courses/{courseId}/` using the selected
course ID and Bearer authorization. Chapters are read from the course details
response. The course editor also uses GET `/courses/{courseId}/` to load and refresh
chapters, and POST `/courses/{courseId}/chapters/` to save a chapter. Saves send the existing
multipart fields: `title`, `content`, `order`, and optional video files.
The API's trailing slash is required: a slashless POST receives a 301 redirect,
which converts the browser request to GET and drops its body.

The student inbox displays announcement `title`, `message`, and `created_at`,
with sender and read status only when provided. Announcement lists may be arrays,
`announcements` objects, or paginated `results`, optionally inside `data`.
Empty responses show an empty inbox; failed requests show a retry action.

## Response mapping

The supplied my-courses response confirms an array of courses with `id`, `title`,
`created_at`, `chapter_count`, `completed_chapter_count`, and `progress_percent`.
The mapper uses `progress_percent` for course percentages, including zero, and
`completed_chapter_count` for completed chapters. Analytics uses these values in
Course Progress even when the completion-details request fails.
Cards show the chapter count beneath the title,
including zero, and use “1 chapter” for a single chapter. A missing count is omitted.
The supplied chapter response confirms `id`, `title`, `content`, `media_url`
(which may be null), and `order`.
The completion-details response confirms `student_id`, `student_name`,
`total_courses`, `completed_courses`, and `average_progress`. Dashboard and
Analytics use the three numeric fields, including zero. This response does not
include chapter totals, so those remain unavailable.
Course progress and chapter-completion response bodies remain pending. Local
fixture tests verify frontend behavior; authenticated live verification is still
pending.

Current mapping accepts:

- Course lists as arrays, `{ "courses": [...] }`, or `{ "results": [...] }`,
  optionally inside `data`. Courses use `id`/`course_id`, `title`/`course_title`,
  optional `image`/`thumbnail`, `chapter_count`/`total_chapters`, and progress fields. An enrollment may
  contain a nested `course`; that course's ID takes precedence over enrollment ID.
- Course details as `{ "id": "...", "title": "...", "description": "...", "chapters": [...] }`,
  optionally inside `data`. The mapper also accepts chapter arrays or `{ "results": [...] }`, with
  optional nested course metadata. Chapters use `id`/`chapter_id`, `title`,
  `content`, `order`, optional `video`/`video_url`/`media_url`, and optional
  completion flags.
- Progress as an object with `progress_percentage`, `completion_percentage`, or
  `progress`, optional `total_chapters` and `completed_chapters`, and optional
  `completed_chapter_ids` or per-chapter completion records.
- Completion details as an object with `total_courses`, `completed_courses`, and
  `average_progress` on a 0–100 scale. The student identity fields do not change the
  totals. Missing values display as unavailable instead of invented numbers.

Run `node --test tests/student-api.test.mjs`, `npm run lint`, and `npm run build`
for local verification. Live tests with an authenticated student and the actual
response bodies remain on the checklist in `remaining-work.md`.
