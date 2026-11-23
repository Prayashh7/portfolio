import { z } from "zod";
import { query } from "../db/pool.js";
import { deleteRow, findRow, insertRow, listRows, updateRow } from "../db/crud.js";
import { readSingleton, updateSingleton } from "../db/singletons.js";
import { asyncHandler, invalid, notFound, parseId } from "../utils/http.js";
import {
  flag,
  integerWithDefault,
  nullableString,
  parseBody,
  requiredLink,
} from "../utils/validate.js";

/*
  Handlers behind requireAuth. These see whole rows, including hidden records and
  columns the public projections leave out — that is the point of the dashboard.
*/

/* ------------------------------------------------------------- collections */

export const listAll = (key) =>
  asyncHandler(async (req, res) => {
    res.json(await listRows(key, { includeHidden: true }));
  });

export const getOne = (key) =>
  asyncHandler(async (req, res) => {
    res.json(await findRow(key, parseId(req.params.id)));
  });

export const create = (key) =>
  asyncHandler(async (req, res) => {
    res.status(201).json(await insertRow(key, req.body));
  });

export const update = (key) =>
  asyncHandler(async (req, res) => {
    res.json(await updateRow(key, parseId(req.params.id), req.body));
  });

export const remove = (key) =>
  asyncHandler(async (req, res) => {
    await deleteRow(key, parseId(req.params.id));
    res.status(204).end();
  });

/* -------------------------------------------------------------- singletons */

export const getSingleton = (key) =>
  asyncHandler(async (req, res) => {
    const row = await readSingleton(key, { includeHidden: true });
    if (!row) throw notFound("That row does not exist yet. Run `npm run seed` to create it.");
    res.json(row);
  });

export const patchSingleton = (key) =>
  asyncHandler(async (req, res) => {
    res.json(await updateSingleton(key, req.body));
  });

/* ---------------------------------------------------------- project images */

const imageSchema = z
  .object({ url: requiredLink, alt: nullableString(300).optional(), sort_order: integerWithDefault.optional() })
  .strict();

const imagePatchSchema = z
  .object({
    url: requiredLink.optional(),
    alt: nullableString(300).optional(),
    sort_order: integerWithDefault.optional(),
  })
  .strict();

async function assertProjectExists(projectId) {
  const { rowCount } = await query("SELECT 1 FROM projects WHERE id = $1", [projectId]);
  if (rowCount === 0) throw notFound("That project no longer exists.");
}

export const listProjectImages = asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.id);
  await assertProjectExists(projectId);
  const { rows } = await query(
    `SELECT id, project_id, url, alt, sort_order, created_at, updated_at
     FROM project_images WHERE project_id = $1 ORDER BY sort_order ASC, id ASC`,
    [projectId]
  );
  res.json(rows);
});

export const addProjectImage = asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.id);
  await assertProjectExists(projectId);
  const data = parseBody(imageSchema, req.body);

  const { rows } = await query(
    `INSERT INTO project_images (project_id, url, alt, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [projectId, data.url, data.alt ?? null, data.sort_order ?? 0]
  );
  res.status(201).json(rows[0]);
});

export const updateProjectImage = asyncHandler(async (req, res) => {
  const imageId = parseId(req.params.imageId);
  const data = parseBody(imagePatchSchema, req.body);
  const columns = Object.keys(data);
  if (columns.length === 0) throw invalid("Nothing was changed.");

  const assignments = columns.map((column, index) => `${column} = $${index + 2}`);
  const { rows } = await query(
    `UPDATE project_images SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`,
    [imageId, ...columns.map((column) => data[column])]
  );
  if (!rows[0]) throw notFound("That image no longer exists.");
  res.json(rows[0]);
});

export const removeProjectImage = asyncHandler(async (req, res) => {
  const { rowCount } = await query("DELETE FROM project_images WHERE id = $1", [
    parseId(req.params.imageId),
  ]);
  if (rowCount === 0) throw notFound("That image no longer exists.");
  res.status(204).end();
});

/* --------------------------------------------------------- contact inbox */

export const listMessages = asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const { rows } = await query(
    `SELECT id, name, email, subject, message, is_read, created_at
     FROM contact_messages
     ${unreadOnly ? "WHERE is_read = false" : ""}
     ORDER BY created_at DESC
     LIMIT 200`
  );
  res.json(rows);
});

const readFlagSchema = z.object({ is_read: flag }).strict();

export const setMessageRead = asyncHandler(async (req, res) => {
  const { is_read } = parseBody(readFlagSchema, req.body);
  const { rows } = await query(
    `UPDATE contact_messages SET is_read = $2 WHERE id = $1
     RETURNING id, name, email, subject, message, is_read, created_at`,
    [parseId(req.params.id), is_read]
  );
  if (!rows[0]) throw notFound("That message no longer exists.");
  res.json(rows[0]);
});

export const removeMessage = asyncHandler(async (req, res) => {
  const { rowCount } = await query("DELETE FROM contact_messages WHERE id = $1", [
    parseId(req.params.id),
  ]);
  if (rowCount === 0) throw notFound("That message no longer exists.");
  res.status(204).end();
});

/* ------------------------------------------------------------- overview */

/* Counts for the dashboard landing page. The table list is written out here
   rather than derived, so what the query touches is visible at a glance. */
const COUNT_TABLES = [
  "projects",
  "skill_categories",
  "skills",
  "services",
  "experience",
  "education",
  "achievements",
  "certifications",
  "social_links",
];

export const getOverview = asyncHandler(async (req, res) => {
  const selections = COUNT_TABLES.map((table) => `(SELECT count(*) FROM ${table}) AS ${table}`);

  const [{ rows: totals }, { rows: inbox }, { rows: recent }] = await Promise.all([
    query(`SELECT ${selections.join(", ")}`),
    query(
      `SELECT count(*) FILTER (WHERE is_read = false) AS unread, count(*) AS total
       FROM contact_messages`
    ),
    query(
      `SELECT id, name, email, subject, is_read, created_at
       FROM contact_messages ORDER BY created_at DESC LIMIT 5`
    ),
  ]);

  res.json({
    counts: Object.fromEntries(
      Object.entries(totals[0]).map(([table, value]) => [table, Number(value)])
    ),
    messages: { unread: Number(inbox[0].unread), total: Number(inbox[0].total) },
    recent_messages: recent,
  });
});
