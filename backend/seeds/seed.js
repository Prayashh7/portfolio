import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { pool, withTransaction } from "../db/pool.js";

/*
  Loads seeds/content.json into an empty database.

  Safe to run twice. By default it only fills gaps: existing rows are left alone,
  so running it after editing content in the dashboard will not undo that work.
  `npm run seed -- --force` replaces the seeded content with the file again.
*/

const FORCE = process.argv.includes("--force");
const HERE = path.dirname(fileURLToPath(import.meta.url));

const log = (message) => console.log(`[seed] ${message}`);

/* --------------------------------------------------------------- singletons */

async function seedSingleton(client, table, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const overwrite = columns.map((column) => `${column} = EXCLUDED.${column}`).join(", ");

  const { rowCount } = await client.query(
    `INSERT INTO ${table} (id, ${columns.join(", ")})
     VALUES (1, ${placeholders.join(", ")})
     ON CONFLICT (id) ${FORCE ? `DO UPDATE SET ${overwrite}` : "DO NOTHING"}`,
    columns.map((column) => data[column])
  );

  log(rowCount > 0 ? `${table}: written` : `${table}: already set, left as it is`);
}

/* -------------------------------------------------------------- collections */

async function insertRows(client, table, rows) {
  for (const row of rows) {
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
      columns.map((column) => row[column])
    );
  }
}

/* Used for tables with no natural key: there is nothing to match an incoming row
   against, so the choice is fill-an-empty-table or replace it wholesale. */
async function fillTable(client, table, rows) {
  const { rows: counted } = await client.query(`SELECT count(*)::int AS total FROM ${table}`);

  if (counted[0].total > 0) {
    if (!FORCE) {
      log(`${table}: ${counted[0].total} row(s) already there, left as they are`);
      return;
    }
    await client.query(`DELETE FROM ${table}`);
  }

  await insertRows(client, table, rows);
  log(`${table}: ${rows.length} row(s) written`);
}

/* Projects and skill categories both have a slug, so they can be matched. */
async function upsertBySlug(client, table, rows) {
  let written = 0;

  for (const row of rows) {
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const overwrite = columns
      .filter((column) => column !== "slug")
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(", ");

    const { rowCount } = await client.query(
      `INSERT INTO ${table} (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       ON CONFLICT (slug) ${FORCE ? `DO UPDATE SET ${overwrite}` : "DO NOTHING"}`,
      columns.map((column) => row[column])
    );
    written += rowCount;
  }

  log(`${table}: ${written} of ${rows.length} row(s) written`);
}

async function seedSkills(client, categories) {
  const withoutSkills = categories.map(({ skills, ...category }) => category);
  await upsertBySlug(client, "skill_categories", withoutSkills);

  const { rows: saved } = await client.query("SELECT id, slug FROM skill_categories");
  const idBySlug = new Map(saved.map((category) => [category.slug, category.id]));

  const skills = categories.flatMap((category) =>
    category.skills.map((skill, index) => ({
      category_id: idBySlug.get(category.slug) ?? null,
      name: skill.name,
      level: skill.level ?? null,
      note: skill.note ?? null,
      sort_order: index + 1,
    }))
  );

  await fillTable(client, "skills", skills);
}

/* ------------------------------------------------------------- admin account */

async function seedAdmin(client) {
  const { email, password, name } = env.admin;

  if (!email || !password) {
    log("no admin account created — ADMIN_EMAIL and ADMIN_PASSWORD are not set in backend/.env");
    return;
  }

  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters. Update backend/.env and run this again.");
  }

  const existing = await client.query("SELECT id FROM users WHERE lower(email) = $1", [email]);

  if (existing.rowCount > 0) {
    if (!FORCE) {
      log(`admin ${email} already exists — password left unchanged`);
      return;
    }
    await client.query("UPDATE users SET password_hash = $2, name = $3 WHERE lower(email) = $1", [
      email,
      await bcrypt.hash(password, 12),
      name,
    ]);
    log(`admin ${email}: password reset from ADMIN_PASSWORD`);
    return;
  }

  await client.query(
    "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')",
    [email, name, await bcrypt.hash(password, 12)]
  );
  log(`admin ${email} created`);
}

/* ---------------------------------------------------------------------- run */

async function run() {
  const content = JSON.parse(await fs.readFile(path.join(HERE, "content.json"), "utf8"));

  if (FORCE) log("--force: seeded content will be overwritten");

  await withTransaction(async (client) => {
    await seedAdmin(client);
    await seedSingleton(client, "profile", content.profile);
    await upsertBySlug(client, "projects", content.projects);
    await seedSkills(client, content.skill_categories);
    await fillTable(client, "services", content.services);
    await fillTable(client, "experience", content.experience);
    await fillTable(client, "education", content.education);
    await fillTable(client, "certifications", content.certifications);
    await fillTable(client, "achievements", content.achievements);
    await fillTable(client, "social_links", content.social_links);

    /* Last, because it references projects. */
    await seedSingleton(client, "site_settings", content.site_settings);
  });

  log("done");
}

try {
  await run();
} catch (error) {
  console.error(`[seed] failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
