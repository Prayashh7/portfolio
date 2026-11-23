# Deploying to cPanel (single origin)

Both halves of the site run from one origin: Express serves the API *and* the
built frontend from `https://prayashbartaula.com.np`. There is no Netlify in this
setup, which is deliberate — a single origin means no CORS negotiation and no
cross-site cookie, the two things that quietly break a split deployment.

Server paths below assume the account layout `/home/parscomn/prayashbartaula.com.np`.

## What changed to make this work

Three things were wrong before, in the order they bite:

`CREATE EXTENSION citext` in `001_init.sql` cannot succeed on this host. Shared
cPanel Postgres ships without the contrib extensions, so the file has no
`citext.control` to read and the migration aborted with exit code 1 — no tables,
so every API call failed. The `users.email` column is now plain `text` with a
unique index on `lower(email)`. Behaviour is unchanged because `emailField` in
`utils/validate.js` already lowercased every address on the way in, and
`env.admin.email` now does the same for the seed. Login and the seed compare
`lower(email) = $1`, which uses that index.

Express served only `/api` and `/media`, so there was nothing to answer a
request for `/`. `app.js` now serves `env.frontendDist` as static files with a
history-API fallback, mounted after the API routes so it can never shadow them.
If no build is present on disk the block is skipped and the process runs as an
API-only server exactly as before.

`services/api.js` falls back to `/api` when `VITE_API_BASE_URL` is unset. On
Netlify that resolved to `https://<site>.netlify.app/api`, which does not exist —
every request 404'd and the page rendered blank. Same origin makes that default
correct, so **leave `VITE_API_BASE_URL` unset when building.**

## 1. Build the frontend locally

```bash
cd frontend
npm install
npm run build      # do NOT set VITE_API_BASE_URL
```

Confirm `frontend/dist/index.html` exists and that the hashed files under
`frontend/dist/assets/` are referenced with root-relative paths (`/assets/...`).

## 2. Upload

Keep the layout the repo already uses — `env.frontendDist` defaults to
`../frontend/dist` resolved from `backend/`, so no env var is needed:

```
/home/parscomn/prayashbartaula.com.np/
├── package.json          <- the app-root copy, scripts point into backend/
├── backend/              <- source, WITHOUT .env
└── frontend/
    └── dist/             <- the build output from step 1
```

Do **not** upload `backend/.env`. Every value in it is already set as a cPanel
environment variable, and the account's document root is this directory — a
readable `.env` here would expose `JWT_SECRET` and the database password. After
deploying, confirm `https://prayashbartaula.com.np/backend/.env` does not return
file contents.

Delete the leftover `backend.zip` from the document root for the same reason.

## 3. Fix the environment variables

Delete this one:

| Variable | Why |
| --- | --- |
| `NODE_OPTIONS` | Set to `--no-experimental-fetch`. The backend never calls `fetch`, so it buys nothing, and the flag was **removed in Node 22** — an unrecognised flag in `NODE_OPTIONS` makes Node refuse to start at all. |

These are already correct for single-origin and need no change:

| Variable | Value | Note |
| --- | --- | --- |
| `CORS_ORIGINS` | `https://prayashbartaula.com.np` | Same-origin `POST` still sends an `Origin` header, so this must match the site exactly. |
| `COOKIE_SAMESITE` | `lax` | Correct here. It would need `none` only if the site and API were on different registrable domains. |
| `DATABASE_SSL` | `false` | Right for a local socket. |
| `NODE_ENV` | `production` | Enables `trust proxy`, asset caching and `upgrade-insecure-requests`. |
| `PORT` | `4000` | Ignored — Passenger patches `listen()` to bind its own socket. Harmless. |

## 4. Run, in this order

From **Setup Node.js App**:

1. **Run NPM Install** — installs from the app-root `package.json`.
2. **Run JS script → `migrate`** — expect `[migrate] applied 001_init.sql`.
   Any mention of an extension control file means an old copy of the SQL is
   still on the server.
3. **Run JS script → `seed`** — expect `admin prayashb824@gmail.com created`.
4. **Restart**.

## 5. Verify

- `https://prayashbartaula.com.np/api/health` returns JSON with the database reachable.
- `https://prayashbartaula.com.np/` renders the site, not a blank page.
- A deep link such as `/admin/projects` loads directly instead of 404ing — that
  is the history fallback doing its job.
- Log in at `/admin`. If the session does not stick, check `COOKIE_SAMESITE` and
  that the site is on HTTPS.
- `https://prayashbartaula.com.np/api/nope` returns a JSON 404, not the HTML
  shell. If it returns HTML, the fallback is mounted in the wrong place.
- Open the browser console and confirm there are no Content-Security-Policy
  violations. The policy in `app.js` allows the Google Fonts stylesheet and
  font files, `https:` images for off-site project covers, and locks scripts to
  `'self'`.

## Changing the admin email or password

There is no screen for this in the dashboard — the account is created from
`ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`, and those are the only way in.

Before the first seed, just set them to what you want and run `seed`. Afterwards,
edit them in **Setup Node.js App** and run **Run JS script → `set-admin`**.

Do **not** reach for `seed -- --force` to do this. It does reset the password, but
it rewrites every content table from `content.json` on the way past — `fillTable`
issues a plain `DELETE` first — so it would wipe everything edited in the
dashboard. `set-admin` writes to `users` and nothing else.

`set-admin` behaves this way:

| Situation | What it does |
| --- | --- |
| `ADMIN_EMAIL` matches the existing account | Resets that account's password and name |
| `ADMIN_EMAIL` is new and there is one account | Renames it, keeping the same row |
| `users` is empty | Creates the account |
| Two or more accounts and none matches | Refuses, and lists what is there |

The password must be at least 10 characters. Casing in the email does not matter —
it is lowercased before it is stored or compared.

Two things this does *not* change: `profile.email`, which is the address shown on
the public site, and `site_settings.contact_recipient_email`, where contact-form
replies go. Both are dashboard fields.

Changing the password does not end sessions that are already signed in — the JWT
is verified against `JWT_SECRET` alone, with no password check. If the point is to
lock someone out, rotate `JWT_SECRET` as well and restart; that invalidates every
issued cookie.

Because cPanel runs npm from the application root, the app-root `package.json`
needs the script too, with the path prefixed:

```json
"set-admin": "node backend/scripts/set-admin.js"
```

## Decommissioning Netlify

Once the domain serves the site, delete the Netlify site or point it at the
domain, so `prayashh-portfolio.netlify.app` stops serving a broken copy that
still tries to fetch `/api` from itself.

## A note on the repository

`github.com/Prayashh7/My_Portfolio` currently contains only the contents of
`frontend/`. The backend reached the server as a zip upload, so the deployed API
and the local source can drift apart with nothing to reconcile them. Worth
pushing the whole project — `backend/`, `frontend/`, `tools/`, `docs/` — with
`.env` excluded, as it already is by `.gitignore`.
