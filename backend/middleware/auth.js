import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { forbidden, unauthorized } from "../utils/http.js";

/*
  The session is a JWT in an httpOnly cookie, so page scripts cannot read it and
  an XSS bug cannot exfiltrate it. Because the browser attaches that cookie to
  cross-site requests too, a second readable cookie holds a random token that
  must be echoed in a header — an attacker's page can trigger the request but
  cannot read the cookie to build the matching header.
*/

const SESSION_COOKIE = "token";
const CSRF_COOKIE = "csrf_token";

/* SameSite comes from the environment because only the deployment knows whether
   the site and the API share a domain. See COOKIE_SAMESITE in .env.example. */
function cookieOptions() {
  return {
    sameSite: env.cookieSameSite,
    secure: env.isProduction || env.cookieSameSite === "none",
    path: "/",
  };
}

export function issueSession(res, user) {
  const csrf = crypto.randomBytes(24).toString("base64url");
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, csrf }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  const options = { ...cookieOptions(), maxAge: env.sessionMaxAgeMs };
  res.cookie(SESSION_COOKIE, token, { ...options, httpOnly: true });
  res.cookie(CSRF_COOKIE, csrf, { ...options, httpOnly: false });
  return csrf;
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...cookieOptions(), httpOnly: false });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(unauthorized("Sign in to continue."));

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, email: payload.email, role: payload.role, csrf: payload.csrf };
    next();
  } catch {
    clearSession(res);
    next(unauthorized("Your session has expired. Please sign in again."));
  }
}

/* Hashing both sides first gives timingSafeEqual the equal-length buffers it
   requires, without leaking the token length. */
function matches(a, b) {
  const left = crypto.createHash("sha256").update(String(a)).digest();
  const right = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

export function requireCsrf(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();

  const header = req.get("X-CSRF-Token");
  const expected = req.user?.csrf;
  if (!header || !expected || !matches(header, expected)) {
    return next(forbidden("Your form token was missing or stale. Reload the page and try again."));
  }
  next();
}
