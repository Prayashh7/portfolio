import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const HERE = path.dirname(fileURLToPath(import.meta.url));

/*
  The only file in the backend that reads process.env. Everything else imports
  `env` from here, so there is exactly one place to look when a value is wrong
  and no way for a secret to be read from somewhere unexpected.

  Importing this module validates the environment. A missing database URL or a
  weak signing secret stops the process here rather than surfacing as a confusing
  failure on the first request.
*/

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy backend/.env.example to backend/.env and fill it in.`
    );
  }
  return value;
}

function optional(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function boolean(name, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function integer(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new Error(`${name} must be a number (got "${value}")`);
  return parsed;
}

function durationToMs(value) {
  const match = /^(\d+)\s*([smhd])?$/.exec(value);
  if (!match) throw new Error(`JWT_EXPIRES_IN must look like 30m, 12h or 7d (got "${value}")`);
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2] || "s"];
}

const nodeEnv = optional("NODE_ENV", "development");
const jwtSecret = required("JWT_SECRET");

if (jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET must be at least 32 characters. Generate one with:\n" +
      `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
  );
}

const jwtExpiresIn = optional("JWT_EXPIRES_IN", "7d");

/*
  SameSite is decided by the deployment, not guessed here.

  "lax" is right when the site and the API share a registrable domain — a site on
  prayashbartaula.com.np with the API on api.prayashbartaula.com.np. Split across
  two providers (say Netlify and Render) the browser treats the API as third
  party and drops the session cookie unless this is "none", which browsers only
  honour on HTTPS.
*/
const cookieSameSite = optional("COOKIE_SAMESITE", "lax").toLowerCase();

if (!["lax", "strict", "none"].includes(cookieSameSite)) {
  throw new Error(`COOKIE_SAMESITE must be lax, strict or none (got "${cookieSameSite}")`);
}

if (cookieSameSite === "none" && nodeEnv !== "production") {
  throw new Error("COOKIE_SAMESITE=none needs HTTPS, so it only works with NODE_ENV=production.");
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: integer("PORT", 4000),

  databaseUrl: required("DATABASE_URL"),
  databaseSsl: boolean("DATABASE_SSL", false),
  databaseSslNoVerify: boolean("DATABASE_SSL_NO_VERIFY", false),

  jwtSecret,
  jwtExpiresIn,
  sessionMaxAgeMs: durationToMs(jwtExpiresIn),
  cookieSameSite,

  corsOrigins: optional("CORS_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  maxUploadBytes: integer("MAX_UPLOAD_MB", 6) * 1024 * 1024,

  /*
    Where the built frontend lives, for single-origin deployments where Express
    serves the site as well as the API. The default matches the repo layout —
    backend/ and frontend/ side by side. A relative FRONTEND_DIST is resolved
    against backend/, an absolute one is used as given. If nothing is built
    there, app.js quietly serves the API only.
  */
  frontendDist: path.resolve(HERE, "..", optional("FRONTEND_DIST", "../frontend/dist")),

  // Read by the seed script only, and only when no admin account exists yet.
  admin: Object.freeze({
    /* Lowercased so the seeded row matches what emailField sends at login —
       the users table is unique on lower(email), not on the raw string. */
    email: optional("ADMIN_EMAIL").toLowerCase(),
    password: optional("ADMIN_PASSWORD"),
    name: optional("ADMIN_NAME", "Administrator"),
  }),

  // An empty host means the contact form stores messages without emailing.
  smtp: Object.freeze({
    host: optional("SMTP_HOST"),
    port: integer("SMTP_PORT", 587),
    secure: boolean("SMTP_SECURE", false),
    user: optional("SMTP_USER"),
    pass: optional("SMTP_PASS"),
    from: optional("SMTP_FROM"),
    notifyTo: optional("CONTACT_NOTIFY_TO"),
  }),
});
