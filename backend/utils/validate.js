import { z } from "zod";
import { invalid } from "./http.js";

/*
  Runs a zod schema against a request body and turns any failure into the 422
  shape the frontend expects: a message plus one message per offending field.
*/
export function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;

  const fields = {};
  for (const issue of result.error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) fields[key] ??= "This field cannot be edited.";
      continue;
    }
    const key = issue.path[0] ?? "_";
    fields[key] ??= issue.message;
  }

  throw invalid("Please check the highlighted fields.", fields);
}

/* ------------------------------------------------------- shared validators */

const trimToNull = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const emptyToNull = (value) => (value === "" || value === undefined ? null : value);

export function requiredString(max, pattern, message) {
  let schema = z
    .string({ required_error: "This field is required.", invalid_type_error: "Enter some text." })
    .min(1, "This field is required.")
    .max(max, `Keep this under ${max} characters.`);
  if (pattern) schema = schema.regex(pattern, message);
  return z.preprocess((value) => (typeof value === "string" ? value.trim() : value), schema);
}

export function nullableString(max, pattern, message) {
  let schema = z.string().max(max, `Keep this under ${max} characters.`);
  if (pattern) schema = schema.regex(pattern, message);
  return z.preprocess(trimToNull, z.union([z.null(), schema]));
}

export const nullableInteger = (min, max) =>
  z.preprocess(
    emptyToNull,
    z.union([
      z.null(),
      z.coerce
        .number()
        .int("Enter a whole number.")
        .min(min, `Must be ${min} or more.`)
        .max(max, `Must be ${max} or less.`),
    ])
  );

export const integerWithDefault = z.coerce
  .number()
  .int("Enter a whole number.")
  .min(0, "Cannot be negative.")
  .max(100_000, "That is too large.");

/* HTML form controls and JSON both reach here, so "true"/"false" strings are
   accepted alongside real booleans. z.coerce.boolean() would read "false" as true. */
export const flag = z.preprocess(
  (value) => (value === "true" ? true : value === "false" ? false : value),
  z.boolean({ invalid_type_error: "Choose yes or no." })
);

export const nullableDate = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")])
);

export const tagList = z.preprocess(
  (value) =>
    typeof value === "string" ? value.split(",").map((part) => part.trim()).filter(Boolean) : value,
  z
    .array(z.string().trim().min(1, "Empty tags are not allowed.").max(60, "That tag is too long."))
    .max(30, "Thirty tags is plenty.")
);

export const emailField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.string().min(1, "This field is required.").email("Enter a valid email address.").max(200)
);

export const nullableEmail = z.preprocess(
  (value) => (typeof value === "string" ? trimToNull(value.toLowerCase()) : value),
  z.union([z.null(), z.string().email("Enter a valid email address.").max(200)])
);

export const nullableNumber = (min, max) =>
  z.preprocess(
    emptyToNull,
    z.union([
      z.null(),
      z.coerce
        .number()
        .min(min, `Must be ${min} or more.`)
        .max(max, `Must be ${max} or less.`),
    ])
  );

export const enumField = (values, message) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.enum(values, { errorMap: () => ({ message }) })
  );


const LINK = /^(https?:\/\/|mailto:|\/)/;
const LINK_MESSAGE = "Use a full https:// address or a path starting with /.";

export const nullableLink = nullableString(600, LINK, LINK_MESSAGE);
export const requiredLink = requiredString(600, LINK, LINK_MESSAGE);
export const slugField = requiredString(
  120,
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Lowercase letters, numbers and single hyphens only."
);
