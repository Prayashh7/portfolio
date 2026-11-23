import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

export function notFoundHandler(req, res, next) {
  next(new HttpError(404, "That endpoint does not exist."));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    const body = { message: error.message };
    if (error.fields) body.fields = error.fields;
    return res.status(error.status).json({ error: body });
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(422).json({
      error: {
        message: `That file is larger than the ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB limit.`,
        fields: { file: "Choose a smaller file." },
      },
    });
  }

  if (error.message === "ORIGIN_NOT_ALLOWED") {
    return res.status(403).json({ error: { message: "This origin is not allowed to call the API." } });
  }

  /* body-parser rejects malformed or oversized JSON before any handler runs. */
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "That request body is not valid JSON." } });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: { message: "That request body is too large." } });
  }

  /* Anything reaching here is a bug. Log it in full for the operator; tell the
     caller nothing that would help them map the system. */
  console.error(`[error] ${req.method} ${req.originalUrl}`, error);

  const body = { message: "Something went wrong on the server." };
  if (!env.isProduction) body.detail = error.message;
  res.status(500).json({ error: body });
}
