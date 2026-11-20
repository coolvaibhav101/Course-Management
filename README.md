# Course Management

A Next.js 16 and React 19 frontend with Redux and Tailwind CSS for an educational platform.

The app has role-aware screens for super admins, organization admins, and students.
Super admins manage organizations, courses, users, and announcements. Organization
admins create students and assign courses. Students view enrolled courses, read
chapters, record chapter completion, and view learning progress.

## Local development

Use Node.js 20.9 or later and install the dependencies:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Development mode reloads source
changes automatically. Sign in with an account from the configured backend.

## Backend configuration

The API client defaults to `https://student-portal-wh5i.onrender.com/api`.
To use another backend, create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

Include `/api` without a trailing slash and restart the server after changing this
setting. Environment files are excluded from Git. The shared API client handles
Bearer authorization and access-token refresh.

See [Student learning API integration](docs/student-learning-api.md),
[Student course assignment](docs/student-course-assignment.md), and
[Organization course assignment](docs/organization-course-assignment.md) for the
current endpoint contracts. Backend verification and unfinished integrations are
tracked in [remaining-work.md](remaining-work.md).

## Validation

```bash
node --test tests/student-api.test.mjs tests/organization-data.test.mjs
npm run lint
npm run build
```

The tests exercise the actual TypeScript services with controlled API responses;
they do not require live backend credentials.

## Production server

```bash
npm run build
npm run start
```

`npm run start` serves the compiled build. Rebuild and restart it after source
changes, or use `npm run dev` while developing.

Course cards use a locally stored study photo when no course image is available.
Its source and license are recorded in [public/images/README.md](public/images/README.md).
