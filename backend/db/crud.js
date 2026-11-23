import { query } from "./pool.js";
import { resources } from "./resources.js";
import { invalid, notFound } from "../utils/http.js";
import { parseBody } from "../utils/validate.js";

/*
  Generic queries for the nine collections described in resources.js.

  Table and column names are interpolated into these statements. That is safe
  here, and only here, because every identifier comes from the static config in
  resources.js — never from a request. All *values* are passed as numbered
  parameters, so nothing a user sends is ever part of a SQL string.
*/

function config(key) {
  const found = resources[key];
  if (!found) throw new Error(`Unknown resource "${key}"`);
  return found;
}

function translate(error) {
  switch (error.code) {
    case "23505": {
      const column = /Key \(([^)]+)\)/.exec(error.detail || "")?.[1];
      return invalid(
        "That value is already in use.",
        column ? { [column]: "That value is already in use." } : null
      );
    }
    case "23503":
      return invalid("That linked record does not exist.");
    case "23514":
      return invalid("That value is not allowed for this field.");
    case "22P02":
      return invalid("One of the values has the wrong type.");
    default:
      return error;
  }
}

export async function listRows(key, { includeHidden = false } = {}) {
  const spec = config(key);
  const columns = includeHidden ? "*" : spec.publicColumns.join(", ");
  const filter = !includeHidden && spec.hasVisibility ? "WHERE is_visible = true" : "";
  const { rows } = await query(
    `SELECT ${columns} FROM ${spec.table} ${filter} ORDER BY ${spec.order}`
  );
  return rows;
}

export async function findRow(key, id) {
  const spec = config(key);
  const { rows } = await query(`SELECT * FROM ${spec.table} WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound("That record no longer exists.");
  return rows[0];
}

export async function insertRow(key, body) {
  const spec = config(key);
  const data = parseBody(spec.createSchema, body);
  const columns = Object.keys(data);
  const placeholders = columns.map((_, index) => `$${index + 1}`);

  try {
    const { rows } = await query(
      `INSERT INTO ${spec.table} (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      columns.map((column) => data[column])
    );
    return rows[0];
  } catch (error) {
    throw translate(error);
  }
}

export async function updateRow(key, id, body) {
  const spec = config(key);
  const data = parseBody(spec.updateSchema, body);
  const columns = Object.keys(data);
  if (columns.length === 0) throw invalid("Nothing was changed.");

  const assignments = columns.map((column, index) => `${column} = $${index + 2}`);

  try {
    const { rows } = await query(
      `UPDATE ${spec.table} SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`,
      [id, ...columns.map((column) => data[column])]
    );
    if (!rows[0]) throw notFound("That record no longer exists.");
    return rows[0];
  } catch (error) {
    throw translate(error);
  }
}

export async function deleteRow(key, id) {
  const spec = config(key);
  const { rowCount } = await query(`DELETE FROM ${spec.table} WHERE id = $1`, [id]);
  if (rowCount === 0) throw notFound("That record no longer exists.");
}

/* Narrows a full row down to the columns the public site is allowed to see. */
export function publicView(key, row) {
  if (!row) return null;
  const spec = config(key);
  return Object.fromEntries(spec.publicColumns.map((column) => [column, row[column]]));
}
