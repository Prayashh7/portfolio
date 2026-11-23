import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(HERE, "public", "media");

/* Single-origin deployments (cPanel) build the frontend and let Express serve
   it. When there is no build on disk — development, or an API-only host — this
   is false and every frontend-related handler below is skipped. */
const FRONTEND_DIST = env.frontendDist;
const SERVE_FRONTEND = existsSync(path.join(FRONTEND_DIST, "index.html"));

const app = express();

/* Behind a reverse proxy the client IP arrives in a header, and rate limiting is
   worthless without it. Left off in development, where there is no proxy to trust. */
if (env.isProduction) app.set("trust proxy", 1);

app.use(
  helmet({
    /* The API and the site are on different origins in every deployment, so
       images have to be readable cross-origin. */
    crossOriginResourcePolicy: { policy: "cross-origin" },

    /*
      Helmet's default CSP is written for an API that returns JSON. Once this
      process also serves the HTML it applies to the page itself, and the
      defaults are too tight in three specific ways:
        - style-src 'self' would drop the Google Fonts stylesheet, and both
          styled-components and inline style attributes need 'unsafe-inline'
        - font-src 'self' would drop the font files from fonts.gstatic.com
        - img-src 'self' data: would drop project covers hosted anywhere else,
          which is a normal thing to paste into the dashboard
      Scripts stay locked to 'self': the Vite build emits no inline script, so
      there is nothing to loosen there. Left off entirely when this process is
      API-only, where the old behaviour was already fine.
    */
    contentSecurityPolicy: SERVE_FRONTEND
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'"],
            workerSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            /* Only meaningful over HTTPS, and it would break the plain-http
               dev server, so it is production-only. Omitted rather than set to
               null, which helmet rejects unless it is trimming a default. */
            ...(env.isProduction ? { upgradeInsecureRequests: [] } : {}),
          },
        }
      : undefined,
  })
);

app.use(
  cors({
    origin(origin, done) {
      // No Origin header means a same-origin or non-browser request.
      if (!origin || env.corsOrigins.includes(origin)) return done(null, true);
      done(new Error("ORIGIN_NOT_ALLOWED"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    maxAge: 86_400,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

/* Served before the rate limiter: a page full of images should not eat into the
   API budget. A missing file falls through to the JSON 404 below. */
app.use(
  "/media",
  express.static(MEDIA_DIR, {
    maxAge: env.isProduction ? "7d" : 0,
    index: false,
    dotfiles: "ignore",
  })
);

app.use("/api", apiLimiter);
app.use("/api", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

/*
  The built site, served from this same origin. Mounted after /api and /media so
  it can never shadow them, and before the 404 handlers so unknown paths reach
  index.html instead of a JSON error.

  Hashed assets are immutable and cached for a year. index.html must not be
  cached, or a browser holding an old copy keeps asking for JS bundles that the
  latest deploy has already deleted. It is reached two ways — directly as
  /index.html, and via the fallback below — so both paths set no-cache.
*/
if (SERVE_FRONTEND) {
  const INDEX_HTML = path.join(FRONTEND_DIST, "index.html");

  app.use(
    express.static(FRONTEND_DIST, {
      index: false,
      maxAge: env.isProduction ? "1y" : 0,
      setHeaders(res, filePath) {
        if (filePath === INDEX_HTML) res.setHeader("Cache-Control", "no-cache");
      },
    })
  );

  /* React Router owns the URL space, so any GET that is not an API call and not
     a real file gets index.html and is resolved client-side. Scoped to GET and
     HEAD: a POST to a bad path is a genuine 404 and should stay one. */
  app.get(/^(?!\/(?:api|media)(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    /* sendFile defaults to `public, max-age=0`, which express.static's
       setHeaders above does not get a say in — this path never goes through it. */
    res.sendFile(INDEX_HTML, { headers: { "Cache-Control": "no-cache" } }, (error) => {
      if (error) next(error);
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
