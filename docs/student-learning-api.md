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
| GET | `/courses/{courseId}/chapters/{chapterId}/video-url/` | Selected chapter video in viewer and editor |
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
chapters. New chapters use POST `/courses/{courseId}/chapters/` with `title`,
`content`, `order`, and an optional `video` file. Existing chapters use PUT
`/courses/{courseId}/chapters/{chapterId}/` with only changed fields. Video-only
updates send only `video`; unchanged saves make no update request. Course detail
updates use PATCH with only changed `title` or `description` fields.
The API's trailing slash is required: a slashless POST receives a 301 redirect,
which converts the browser request to GET and drops its body.

Chapter order is assigned automatically. Drag a chapter handle, use Arrow Up/Down
on the focused handle, or use the move buttons to change its position. Each move
saves chapter IDs and orders through POST `/courses/{courseId}/chapters/reorder/`
with `{ "chapters": [{ "id": "<chapter ID>", "order": 1 }] }`. Unsaved chapters
stay local, and reordering does not publish draft text or upload a selected video.
The reorder request updates the positions together with one POST. A rejected
save keeps the previous visible order and shows the server error without another
reorder request. If a network or server failure leaves the result uncertain,
Reload order fetches server positions while preserving local edits.
Deleting a saved chapter uses DELETE `/courses/{courseId}/chapters/{chapterId}/`
before renumbering the remaining chapters. Discarding an unsaved chapter also
renumbers the list. The unsaved-changes dialog blocks reordering until resolved;
failed order recovery keeps the editor open so Reload order remains available.

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
The supplied chapter response confirms `id`, `title`, `content`, `order`, and
the boolean `has_video`. Both the student viewer and course editor use this flag
to identify video chapters. They fetch a video's URL only for the selected saved
chapter using GET `/courses/{courseId}/chapters/{chapterId}/video-url/`.
The URL request is uncached, obsolete requests are cancelled, and a video load
or playback failure offers Retry video to fetch a fresh URL.
The editor shows Remove video and Replace video alongside an attached video.
Removal stays pending until Save Chapter sends `video: null` through the chapter
PUT endpoint; Undo removal restores the original preview. Selecting a replacement
sends the new `video` file instead. Cancelling selection restores the original,
and video-only changes participate in the unsaved-changes dialog.
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
  `content`, `order`, `has_video`, and optional completion flags.
- Video URL responses as `{ "video_url": "https://..." }`, `{ "url": "https://..." }`,
  optionally inside `data`, or a direct HTTP(S) URL string. Video URLs are not
  taken from course content responses.
- Progress as an object with `progress_percentage`, `completion_percentage`, or
  `progress`, optional `total_chapters` and `completed_chapters`, and optional
  `completed_chapter_ids` or per-chapter completion records.
- Completion details as an object with `total_courses`, `completed_courses`, and
  `average_progress` on a 0–100 scale. The student identity fields do not change the
  totals. Missing values display as unavailable instead of invented numbers.

Run `node --test tests/student-api.test.mjs`, `npm run lint`, and `npm run build`
for local verification. Live tests with an authenticated student and the actual
response bodies remain on the checklist in `remaining-work.md`.
