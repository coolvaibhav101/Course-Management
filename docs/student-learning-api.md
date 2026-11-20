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
| GET | `/courses/{courseId}/chapters/` | Student course viewer |
| GET | `/students/{courseId}/progress/` | Course viewer and refresh after completion |
| POST | `/students/complete-chapter/` | Mark Chapter Complete |
| GET | `/students/progress-summary/` | Dashboard and analytics totals |

The completion body is exactly:

```json
{ "chapter_id": "<selected chapter ID>" }
```

The course UUID and chapter UUID come from API data. They are not hardcoded.
Launch/Continue links open `/courses/{courseId}`, available to students. Content
HTML is sanitized before display. A successful completion triggers a new progress
request; a failed completion leaves the chapter unchanged. A refresh failure
shows a retry action and disables further completion until progress is available.

Course content loads with GET `/courses/{courseId}/chapters/` using the selected
course ID and Bearer authorization. This is the same chapters endpoint used by
the course editor; POST on that endpoint creates a chapter.

## Response JSON confirmation pending

The supplied my-courses response confirms an array of courses with `id`, `title`,
`created_at`, `chapter_count`, `completed_chapter_count`, and `progress_percent`.
The mapper uses `progress_percent` for course percentages, including zero, and
`completed_chapter_count` for completed chapters. Analytics uses these values in
Course Progress even when the progress-summary request fails.
Cards show the chapter count beneath the title,
including zero, and use “1 chapter” for a single chapter. A missing count is omitted.
The supplied chapter response confirms `id`, `title`, `content`, `media_url`
(which may be null), and `order`. Progress and summary response bodies remain
pending. Mapping in `src/services/studentData.ts`
must be checked against those examples. Local fixture tests verify frontend
behavior; authenticated live verification is still pending.

Current mapping accepts:

- Course lists as arrays, `{ "courses": [...] }`, or `{ "results": [...] }`,
  optionally inside `data`. Courses use `id`/`course_id`, `title`/`course_title`,
  optional `image`/`thumbnail`, `chapter_count`/`total_chapters`, and progress fields. An enrollment may
  contain a nested `course`; that course's ID takes precedence over enrollment ID.
- Content as a chapter array, `{ "results": [...] }`, or `{ "chapters": [...], "title": "..." }`, with
  optional nested course metadata. Chapters use `id`/`chapter_id`, `title`,
  `content`, `order`, optional `video`/`video_url`/`media_url`, and optional
  completion flags.
- Progress as an object with `progress_percentage`, `completion_percentage`, or
  `progress`, optional `total_chapters` and `completed_chapters`, and optional
  `completed_chapter_ids` or per-chapter completion records.
- Summary as an object with optional `total_courses`, `completed_courses`,
  `total_chapters`, `completed_chapters`, `average_progress`/`overall_progress`,
  and a `courses` array. Missing values display as unavailable instead of invented
  numbers. Percentages are assumed to be on a 0–100 scale.

Run `node --test tests/student-api.test.mjs`, `npm run lint`, and `npm run build`
for local verification. Live tests with an authenticated student and the actual
response bodies remain on the checklist in `remaining-work.md`.
