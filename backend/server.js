import app from "./app.js";
import { env } from "./config/env.js";
import { ensureUploadDir } from "./controllers/uploads.js";
import { pool, query } from "./db/pool.js";

await ensureUploadDir();

/* A database that is down should not stop the process — /api/health reports it and
   the server recovers on its own once the database comes back. It is worth one
   clear line at startup, though, because the alternative is a confusing first
   request. */
try {
  await query("SELECT 1");
} catch (error) {
  console.warn(`[db] not reachable yet: ${error.message}`);
  console.warn("[db] check DATABASE_URL, then run `npm run migrate && npm run seed`.");
}

const server = app.listen(env.port, () => {
  console.log(`[server] http://localhost:${env.port} — ${env.nodeEnv}`);
  console.log(`[server] allowed origins: ${env.corsOrigins.join(", ")}`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 8000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}
