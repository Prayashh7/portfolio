import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, withTransaction } from "./pool.js";

/*
  Applies every .sql file in ./migrations that has not been applied yet, in
  filename order, each inside its own transaction. Re-running is a no-op, so it
  is safe to call on every deploy.
*/

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.filename));

  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
  const pending = files.filter((name) => !applied.has(name));

  if (pending.length === 0) {
    console.log(`[migrate] up to date (${applied.size} applied)`);
    return;
  }

  for (const filename of pending) {
    const sql = await readFile(path.join(migrationsDir, filename), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    });
    console.log(`[migrate] applied ${filename}`);
  }

  console.log(`[migrate] done, ${pending.length} applied`);
}

try {
  await run();
} catch (error) {
  console.error(`[migrate] failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
