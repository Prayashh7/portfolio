# Prayash Bartaula — Portfolio

A full-stack personal portfolio: a React front end with a WebGL portrait scene, backed by an
Express API and PostgreSQL, with a private dashboard that edits every word and image on the site.

Live site: [prayashbartaula.com.np](https://prayashbartaula.com.np) · Code:
[github.com/Prayashh7](https://github.com/Prayashh7)

```
frontend/   React 18 · Vite · React Router · Three.js (react-three-fiber) · GSAP
backend/    Node · Express · PostgreSQL · JWT auth · Zod validation
docs/       API.md — the full endpoint contract
tools/      Static checks that run without installing anything
```

## How it is put together

The front end owns layout, motion, 3D and responsiveness. The database owns content. No headline,
bio, project, skill, service, certification, social link or contact detail is written into a React
component — every one of them arrives from the API and is edited in the dashboard.

That split is the whole point of the architecture, and it is enforced rather than intended: the
string `Prayash` appears in `frontend/src` exactly once, in the title of the 404 page, and in
`index.html` as the pre-JavaScript default that a crawler reads before React runs. Changing the
tagline, adding a project or swapping the portrait is a form submission, not a deploy.

The public site loads in a single request. `GET /api/portfolio` returns the profile, settings and
every collection at once, so the first paint costs one round trip; the per-section endpoints
(`/api/profile`, `/api/projects`, `/api/skills`, and so on) exist for anything that needs to refetch
one piece. Public responses are built from explicit column allowlists, so a column added to a
project or a skill stays private until it is deliberately published. Site settings are the one
inversion: everything in that table is page copy, so it publishes by default, with a named private
set for the contact notification address.

## Running it locally

You need Node 20 or newer and a PostgreSQL 14 or newer database. Two terminals, backend first.

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set three things: `DATABASE_URL` for your database, `JWT_SECRET` to a long random
string, and `ADMIN_PASSWORD` to the password you want for the dashboard. Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The server refuses to start without `DATABASE_URL` and `JWT_SECRET`, and refuses a secret shorter
than 32 characters, so a misconfigured deployment fails immediately instead of at the first request.

Then create the schema, load the content, and start it:

```bash
npm run migrate
npm run seed
npm run dev
```

The API comes up on `http://localhost:4000`. `GET /api/health` reports whether it can reach the
database.

`migrate` applies each file in `db/migrations/` once, inside its own transaction, and records it in
`schema_migrations` — re-running it is a no-op, so it is safe on every deploy. `seed` only fills
gaps: rows that already exist are left alone, so seeding again after editing content in the
dashboard will not undo that work. `npm run seed -- --force` overwrites the seeded content with
`seeds/content.json` again, and resets the admin password from `ADMIN_PASSWORD`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The site runs on `http://localhost:5173`. In development Vite proxies `/api` and `/media` to the
backend, so the browser stays on one origin and cookies behave exactly as they will in production.
Sign in to the dashboard at `/admin`, with the email and password from the backend `.env`.

## The dashboard

`/admin` is a real CMS, not a settings page. It manages the profile, site copy and SEO, the nine
content collections, project galleries, uploaded images and contact messages.

| Screen | What it edits |
| --- | --- |
| Overview | counts per collection, unread messages, recent enquiries |
| Profile | name, title, tagline, bio, location, contact details, portrait images, availability |
| Words and settings | every section heading and intro, contact copy, SEO title and description, OG image, accent colour |
| Projects | the five case studies, their gallery images, ordering and visibility |
| Services · Skill groups · Skills | what you offer and what you work with |
| Experience · Education · Certifications · Achievements | the record |
| Social links · Messages · Images | reach, the inbox, and the media library |

Every collection screen is one generic list and one generic form driven by two config files —
`backend/db/resources.js` describes the columns once for the API, `frontend/src/pages/admin/fields.js`
describes them once for the form. Adding a field is an entry in each, not a new screen.

The small uppercase label above each section, and the four group labels in the Record section, are
structural markers in the layout rather than content — they name where you are on the page, the way
the nav does, and they stay in the components. Everything the labels sit above is editable.

Visibility is a column, not a delete. Anything with `is_visible` can be hidden from the public site
while staying in the dashboard, which is how a project comes down for an afternoon without losing
its content.

## The portrait

The uploaded photograph is not used raw. It was processed into a stylised portrait and a matching
depth map, and the hero scene reads that pair as a point cloud: the depth map displaces each point
along the z-axis, so the face has real parallax and responds to the pointer rather than sitting flat
on the page. The grid is about 37,000 points on a desktop and 15,000 on a phone — the count is
chosen from the viewport rather than fixed, because a phone renders the same image at a fraction of
the size.

Three assets do the work, all served from the backend and all set in the dashboard:

| Field | File | Used by |
| --- | --- | --- |
| `image_url` | `prayash-portrait.webp` | the still portrait, and the fallback |
| `image_depth_url` | `prayash-portrait-depth.png` | the point-cloud displacement |
| `about_image_url` | `prayash-about.webp` | the About section |

The scene degrades on purpose. Without WebGL, with `prefers-reduced-motion: reduce` set, or if the
canvas throws, it falls back to the still portrait through an error boundary — the face is always
there. The render loop stops entirely when the hero scrolls out of view, and device pixel ratio is
capped at 2 so a high-DPI screen does not quietly render four times the pixels.

To change the photograph: upload a portrait and a depth map under Images, then point `image_url` and
`image_depth_url` at them in Profile. No code changes, no rebuild.

## Deploying

The two halves deploy independently. The front end is a static bundle for any host — Netlify,
Vercel, Cloudflare Pages. The back end needs Node and Postgres — Render, Railway, Fly.

Build the site with `npm run build` in `frontend/`, which emits `dist/`. Set `VITE_API_BASE_URL` to
the deployed API (including `/api`) and `VITE_MEDIA_BASE_URL` to the same origin without it. Because
the router handles routes like `/work/mero-bhariya` on the client, the host has to serve
`index.html` for every path — `public/_redirects` already does that on Netlify; on other hosts it is
one rewrite rule.

On the API side, set `NODE_ENV=production`, `CORS_ORIGINS` to the exact site origin,
`DATABASE_SSL=true` for a hosted database, and run `npm run migrate` on each deploy. Nothing else is
needed — migrations are idempotent.

One deployment detail is easy to get wrong. If the site and the API sit on the same registrable
domain (`prayashbartaula.com.np` and `api.prayashbartaula.com.np`), leave `COOKIE_SAMESITE=lax`. If
they are on different domains — the site on Netlify, the API on Render — set `COOKIE_SAMESITE=none`,
or the browser will discard the session cookie and signing in will appear to succeed and then fail.
`none` requires HTTPS, so it only works with `NODE_ENV=production`.

After the first deploy, regenerate the sitemap from the live data:

```bash
cd frontend
node scripts/sitemap.mjs https://api.prayashbartaula.com.np/api https://prayashbartaula.com.np
```

Uploaded images are written to `backend/public/media/uploads/` on the API host, which means the API
needs a persistent disk. A host with an ephemeral filesystem will lose uploads on redeploy; seeded
artwork is committed and survives either way.

## Security

Nothing secret is in the repository. Both `.env` files are ignored, both have a committed
`.env.example`, and `backend/config/env.js` is the only file in the project that reads
`process.env` — so there is one place to look when a value is wrong, and no way for a credential to
be read from somewhere unexpected.

Passwords are bcrypt hashes at cost 12, and a wrong email and a wrong password produce the same
answer after the same amount of work, so the login form does not reveal which accounts exist. The
session is a JWT in an `httpOnly` cookie, so page scripts cannot read it and an XSS bug cannot
exfiltrate it; because browsers attach that cookie to cross-site requests too, a second readable
cookie holds a random token that must be echoed in an `X-CSRF-Token` header, compared with a
constant-time digest. Everything under `/api/admin` is behind those two checks mounted once for the
whole router, so a route added later cannot accidentally be left public.

Request bodies are validated with Zod against a strict schema per resource: an unrecognised key is
rejected outright, not ignored. Table and column names are interpolated into SQL only from static
config, never from a request, and every value is a numbered parameter. Uploads take their extension
from a mimetype allowlist rather than the filename and get a random basename, `image/svg+xml` is not
on that allowlist because SVG can carry script, and only files matching the generated-name pattern
can be deleted through the API — the seeded artwork cannot. Rate limits sit on the API as a whole,
on login, and on the contact form. CORS is an explicit origin allowlist with no wildcards. With
`DATABASE_SSL=true` the database certificate is verified, and the flag that turns that off exists but
is named for what it costs and warns in the log when it is on. In production, error responses carry a
message and nothing that would help map the system; the full error goes to the server log.

## Checks

`tools/` holds four checkers that need no `node_modules`, which is useful in CI before a build:

```bash
python3 tools/check.py frontend    # imports resolve · brackets · JSX tags · CSS coverage
python3 tools/check.py backend
python3 tools/check-fields.py      # dashboard fields match the API's writable columns
python3 tools/check-schema.py      # SQL schema matches the API and the seed
python3 tools/check-routes.py      # every frontend call resolves to a mounted endpoint
```

## Layout

```
backend/
  app.js              middleware, CORS, static media, route mounts
  server.js           startup, database check, graceful shutdown
  config/env.js       the only file that reads process.env
  controllers/        public · auth · contact · admin · uploads
  db/
    migrations/       001_init.sql — 14 tables
    resources.js      the nine collections, described once
    singletons.js     profile and site_settings
    crud.js           generic queries built from that config
  middleware/         auth (JWT + CSRF) · rate limits · error handling
  seeds/content.json  the real content, loaded by npm run seed
  public/media/       portrait, depth map, project artwork

frontend/src/
  pages/              HomePage · ProjectPage · NotFoundPage · admin/
  components/         Hero · PortraitScene · Work · Skills · Services · About · Contact …
  hooks/              usePortfolio · useAuth · useReveal · usePointer · useReducedMotion
  services/api.js     the single place the frontend talks to the API
  styles/             tokens · base · layout · hero · sections · work · contact · admin
```

---

Built by Prayash Bartaula. Hetauda, Nepal — working with clients anywhere.
