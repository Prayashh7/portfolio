# API contract

Base URL: `http://localhost:4000` in development, `VITE_API_BASE_URL` in the frontend.
Everything below is prefixed with `/api`.

Field names are `snake_case` everywhere, matching the database columns exactly. There is
no camelCase mapping layer — one less place for a typo to hide, and a JSON response can be
compared against a `SELECT` without translation.

## Conventions

**Success** returns the payload directly — an object or an array, never wrapped.

**Errors** return the matching HTTP status and:

```json
{ "error": { "message": "Human readable summary", "fields": { "email": "Enter a valid email" } } }
```

`fields` is present only for `422` validation failures.

| Status | Meaning |
| --- | --- |
| `400` | Malformed request (bad JSON, bad id) |
| `401` | Not signed in, or the session expired |
| `403` | Signed in but the CSRF token is missing or wrong |
| `404` | No such record |
| `422` | Validation failed — see `fields` |
| `429` | Rate limit hit |
| `500` | Unhandled server error (message is always generic in production) |

**Timestamps** are ISO 8601 UTC strings. **Dates** (`start_date`, `end_date`) are `YYYY-MM-DD`.

**Media paths** are stored relative: `/media/prayash-portrait.webp`. The frontend resolves
them against `VITE_MEDIA_BASE_URL` (defaults to the API origin). Paths that do not begin with
`/media/` — like `og_image_url` — are site-relative and left alone.

## The protection boundary

- `GET /api/*` — public, read-only, returns visible records only.
- `POST /api/contact` — public, rate limited.
- `POST /api/auth/login` — public, rate limited.
- **`/api/admin/*` — everything under here requires a valid session.** One router mount,
  one `requireAuth` middleware. Nothing outside this prefix can write to the database.

Admin `GET` endpoints mirror the public ones but include hidden records and internal fields.

## Public endpoints

### `GET /api/portfolio`

Everything the public site needs, in one request. The individual endpoints below exist too
(useful for the admin dashboard and for anyone poking at the API), but the site itself makes
this single call on load.

```json
{
  "profile": { "...": "see GET /api/profile" },
  "settings": { "...": "see GET /api/settings" },
  "projects": [],
  "skill_categories": [{ "id": 1, "name": "Frontend", "slug": "frontend", "description": "…", "sort_order": 1, "skills": [] }],
  "services": [],
  "experience": [],
  "education": [],
  "achievements": [],
  "certifications": [],
  "social_links": []
}
```

Empty arrays are returned as empty arrays, never omitted. The frontend hides any section whose
array is empty — that is how `experience` stays out of the page until there is something to put in it.

### `GET /api/profile`

```json
{
  "name": "Prayash Bartaula",
  "title": "Full-Stack Developer",
  "tagline": "…",
  "bio": "…",
  "short_bio": "…",
  "location": "Hetauda, Nepal",
  "timezone_label": "UTC+05:45",
  "latitude": 27.428713,
  "longitude": 85.032242,
  "email": "prayashb824@gmail.com",
  "phone": "+977-9840390478",
  "website_url": "https://prayashbartaula.com.np",
  "image_url": "/media/prayash-portrait.webp",
  "image_depth_url": "/media/prayash-portrait-depth.png",
  "about_image_url": "/media/prayash-about.webp",
  "resume_url": null,
  "availability_status": "open",
  "availability_note": "…",
  "updated_at": "2026-08-22T10:00:00.000Z"
}
```

`id`, `created_at` are omitted from the public response.

### `GET /api/projects`

Visible projects, ordered by `sort_order`, then `id`. Each item:

```json
{
  "id": 1,
  "name": "Mero Bhariya",
  "slug": "mero-bhariya",
  "category": "Web platform",
  "role": "Full build and deployment",
  "summary": "…",
  "technologies": ["JavaScript", "CSS"],
  "cover_image_url": "/media/project-mero-bhariya.webp",
  "live_url": "https://merobhariya.me/",
  "github_url": null,
  "year": 2025,
  "is_featured": false,
  "sort_order": 2
}
```

`description` is omitted from the list to keep the payload small; it is only in the detail response.

### `GET /api/projects/:slug`

The full project, including `description` and:

```json
{ "images": [{ "id": 1, "url": "/media/…", "alt": "…", "sort_order": 0 }] }
```

`404` if the slug does not exist or the project is hidden.

### `GET /api/skills`

Categories with their visible skills nested, both ordered by `sort_order`:

```json
[{ "id": 1, "name": "Frontend", "slug": "frontend", "description": "…", "sort_order": 1,
   "skills": [{ "id": 1, "name": "React.js", "level": "advanced", "note": null, "icon": null, "sort_order": 1 }] }]
```

`level` is one of `working`, `confident`, `advanced`, or `null` when it does not apply.

### `GET /api/experience` · `/api/education` · `/api/services` · `/api/achievements` · `/api/certifications` · `/api/social-links`

Flat arrays of visible records ordered by `sort_order`, then `id`. Columns as defined in
`backend/db/migrations/001_init.sql`, minus `created_at`, `updated_at` and `is_visible`.

### `GET /api/settings`

Every `site_settings` column except `id`, `created_at`, `updated_at` — and except
`contact_recipient_email`. The server addresses the notification email itself, so the public page
never needs to know where messages are delivered.

### `POST /api/contact`

```json
{ "name": "…", "email": "…", "subject": "…", "message": "…" }
```

| Field | Rules |
| --- | --- |
| `name` | required, 2–120 chars |
| `email` | required, valid email, ≤ 200 chars |
| `subject` | optional, ≤ 200 chars |
| `message` | required, 10–4000 chars |

`201` → `{ "id": 12, "created_at": "2026-08-22T10:00:00.000Z" }`

The response carries no copy. The confirmation the visitor reads comes from
`settings.contact_success_message`, which keeps that wording editable in the dashboard instead of
compiled into either half of the app.

`422` → per-field errors. `429` → 5 submissions per hour per IP.
`403` → the owner has switched `contact_form_enabled` off.

No CSRF token is required. The endpoint performs no privileged action on behalf of a signed-in
user, so a CSRF check would add friction without adding protection. Rate limiting and validation
are the relevant defences here.

The message is stored before the notification email is attempted, and a mail failure is logged
rather than returned. A visitor who wrote a message should not be told it failed when it did not.

## Auth

Session is a JWT in an `httpOnly`, `sameSite=lax`, `secure`-in-production cookie named `token`,
so page JavaScript cannot read it. A second, readable cookie `csrf_token` is set at the same time;
its value must be echoed in the `X-CSRF-Token` header on every `/api/admin/*` request that is not
a `GET`, and on `POST /api/auth/logout`. That is a standard double-submit check: a cross-site
attacker can make the browser send the cookie but cannot read it to build the header.

### `POST /api/auth/login`

`{ "email": "…", "password": "…" }` → `200` with `{ "user": { "id": 1, "email": "…", "name": "…", "role": "admin" } }`
and both cookies set. `401` on bad credentials — the same message either way, so the response
cannot be used to discover which emails exist. Rate limited to 8 attempts per 15 minutes per IP.

### `POST /api/auth/logout`

Clears both cookies. `204`. Requires the CSRF header.

### `GET /api/auth/me`

`200` with `{ "user": {...} }` when the cookie is valid, `401` otherwise. The admin app calls this
on load to decide between the dashboard and the login screen.

## Admin endpoints

All require a valid session. All non-`GET` requests require the `X-CSRF-Token` header.

### Collection resources

`projects`, `skills`, `skill-categories`, `experience`, `education`, `services`, `achievements`,
`certifications`, `social-links` all expose the same five operations:

| Method | Path | Result |
| --- | --- | --- |
| `GET` | `/api/admin/<resource>` | all records, hidden included |
| `GET` | `/api/admin/<resource>/:id` | one record |
| `POST` | `/api/admin/<resource>` | `201` + created record |
| `PUT` | `/api/admin/<resource>/:id` | `200` + updated record |
| `DELETE` | `/api/admin/<resource>/:id` | `204` |

`PUT` is a partial update: only the keys present in the body are written. Any key not on the
resource's writable list is rejected with `422` rather than silently ignored, so a typo in a field
name fails loudly instead of quietly discarding an edit.

Writable fields per resource:

| Resource | Writable fields |
| --- | --- |
| `projects` | `name`, `slug`, `summary`, `description`, `category`, `role`, `year`, `technologies`, `cover_image_url`, `live_url`, `github_url`, `is_featured`, `is_visible`, `sort_order` |
| `skill-categories` | `name`, `slug`, `description`, `sort_order` |
| `skills` | `category_id`, `name`, `level`, `note`, `icon`, `sort_order`, `is_visible` |
| `experience` | `company`, `position`, `location`, `description`, `start_date`, `end_date`, `is_current`, `sort_order`, `is_visible` |
| `education` | `institution`, `degree`, `field`, `location`, `description`, `start_date`, `end_date`, `is_current`, `sort_order`, `is_visible` |
| `services` | `name`, `description`, `icon`, `stack`, `sort_order`, `is_visible` |
| `achievements` | `title`, `description`, `year`, `sort_order`, `is_visible` |
| `certifications` | `name`, `organization`, `year`, `description`, `credential_url`, `sort_order`, `is_visible` |
| `social-links` | `platform`, `label`, `url`, `handle`, `sort_order`, `is_visible` |

`name`/`title`/`company`/`institution`/`label` are required on `POST`. `slug` must match
`^[a-z0-9]+(?:-[a-z0-9]+)*$` and be unique — a collision returns `422`, not `500`.

### Singletons

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/profile` | includes `id`, `created_at` |
| `PUT` | `/api/admin/profile` | partial; writable: every `profile` column except `id`, `created_at`, `updated_at` |
| `GET` | `/api/admin/settings` | |
| `PUT` | `/api/admin/settings` | partial; writable: every `site_settings` column except `id`, `created_at`, `updated_at` |

### Project images

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/projects/:id/images` | |
| `POST` | `/api/admin/projects/:id/images` | `{ "url", "alt", "sort_order" }` |
| `PUT` | `/api/admin/project-images/:imageId` | partial |
| `DELETE` | `/api/admin/project-images/:imageId` | |

### Uploads and media

`POST /api/admin/uploads` — `multipart/form-data`, field name `file`.
Accepts `image/png`, `image/jpeg`, `image/webp`, `image/avif` and `image/gif`; max 6 MB
(`MAX_UPLOAD_MB`).

`image/svg+xml` is deliberately **not** accepted. An SVG can carry script, and these files are
served from the same origin as the rest of the media, so accepting one would be accepting a stored
cross-site scripting vector.

The stored filename is generated server-side from a random token plus the extension implied by the
validated mimetype — the client's filename is never used to build a path, so `../` in a filename
cannot escape the upload directory.

`201` → `{ "url": "/media/uploads/8f2c….webp", "filename": "8f2c….webp", "size": 51234, "mimetype": "image/webp" }`

The returned `url` is what goes into `cover_image_url`, `image_url`, and so on.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/media` | seeded artwork and uploads, newest first; each entry has `removable` |
| `DELETE` | `/api/admin/uploads/:filename` | only filenames this API generated; seeded artwork cannot be deleted through the API |

### Messages

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/messages` | newest first; `?unread=true` filters |
| `PATCH` | `/api/admin/messages/:id` | `{ "is_read": true }` |
| `DELETE` | `/api/admin/messages/:id` | |

### `GET /api/admin/overview`

Counts for the dashboard landing screen, so it does not have to fetch nine collections to show
nine numbers:

```json
{
  "counts": { "projects": 5, "skills": 36, "services": 4, "experience": 0,
              "education": 1, "achievements": 3, "certifications": 1, "social_links": 3 },
  "messages": { "total": 0, "unread": 0 },
  "recent_messages": []
}
```

## Health

`GET /api/health` → `{ "status": "ok", "database": "ok", "uptime_s": 128 }`, or `503` with
`"database": "unreachable"`. No version numbers, no environment details, nothing that helps
someone fingerprint the deployment.
