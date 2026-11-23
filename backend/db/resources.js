import { z } from "zod";
import {
  flag,
  integerWithDefault,
  nullableDate,
  nullableInteger,
  nullableLink,
  nullableString,
  requiredLink,
  requiredString,
  slugField,
  tagList,
} from "../utils/validate.js";

/*
  Nine collections share the same five operations, so they are described here as
  data instead of implemented nine times. `crud.js` turns these entries into SQL.

  Two things this file guarantees, and the reason table and column names can be
  interpolated into SQL at all:
    - `table` and every column name originate here, never from a request.
    - `writable` is the complete list of columns a request may set. Anything else
      in a request body is rejected, not ignored.
*/

/* One validator per column name. The columns mean the same thing in every table
   they appear in, so a single map covers all nine collections. */
const columnSchemas = {
  name: requiredString(200),
  title: requiredString(200),
  label: requiredString(120),
  platform: requiredString(60),
  company: requiredString(200),
  position: requiredString(200),
  institution: requiredString(200),
  degree: requiredString(200),
  slug: slugField,

  field: nullableString(200),
  organization: nullableString(200),
  location: nullableString(160),
  category: nullableString(80),
  role: nullableString(120),
  summary: nullableString(400),
  description: nullableString(4000),
  note: nullableString(200),
  icon: nullableString(60),
  handle: nullableString(120),

  url: requiredLink,
  live_url: nullableLink,
  github_url: nullableLink,
  credential_url: nullableLink,
  cover_image_url: nullableLink,

  technologies: tagList,
  stack: tagList,

  year: nullableInteger(1900, 2100),
  category_id: nullableInteger(1, 2_147_483_647),
  sort_order: integerWithDefault,

  is_visible: flag,
  is_featured: flag,
  is_current: flag,

  start_date: nullableDate,
  end_date: nullableDate,

  level: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.union([
      z.null(),
      z.enum(["working", "confident", "advanced"], {
        errorMap: () => ({ message: "Choose working, confident or advanced." }),
      }),
    ])
  ),
};

function buildSchema(writable, required) {
  const shape = {};
  for (const column of writable) {
    const schema = columnSchemas[column];
    if (!schema) throw new Error(`No validator defined for column "${column}"`);
    shape[column] = required.includes(column) ? schema : schema.optional();
  }
  return z.object(shape).strict();
}

function define(config) {
  return {
    ...config,
    order: config.order ?? "sort_order ASC, id ASC",
    hasVisibility: config.writable.includes("is_visible"),
    createSchema: buildSchema(config.writable, config.required),
    updateSchema: buildSchema(config.writable, []),
  };
}

/* Keys are the API path segments from docs/API.md, which use hyphens where the
   table names use underscores. */
export const resources = {
  projects: define({
    table: "projects",
    writable: [
      "name",
      "slug",
      "summary",
      "description",
      "category",
      "role",
      "year",
      "technologies",
      "cover_image_url",
      "live_url",
      "github_url",
      "is_featured",
      "is_visible",
      "sort_order",
    ],
    required: ["name", "slug"],
    // `description` is deliberately absent: the list stays small and the full
    // text is served by GET /api/projects/:slug.
    publicColumns: [
      "id",
      "name",
      "slug",
      "summary",
      "category",
      "role",
      "year",
      "technologies",
      "cover_image_url",
      "live_url",
      "github_url",
      "is_featured",
      "sort_order",
    ],
  }),

  "skill-categories": define({
    table: "skill_categories",
    writable: ["name", "slug", "description", "sort_order"],
    required: ["name", "slug"],
    publicColumns: ["id", "name", "slug", "description", "sort_order"],
  }),

  skills: define({
    table: "skills",
    writable: ["category_id", "name", "level", "note", "icon", "sort_order", "is_visible"],
    required: ["name"],
    publicColumns: ["id", "category_id", "name", "level", "note", "icon", "sort_order"],
  }),

  services: define({
    table: "services",
    writable: ["name", "description", "icon", "stack", "sort_order", "is_visible"],
    required: ["name"],
    publicColumns: ["id", "name", "description", "icon", "stack", "sort_order"],
  }),

  experience: define({
    table: "experience",
    writable: [
      "company",
      "position",
      "location",
      "description",
      "start_date",
      "end_date",
      "is_current",
      "sort_order",
      "is_visible",
    ],
    required: ["company", "position"],
    publicColumns: [
      "id",
      "company",
      "position",
      "location",
      "description",
      "start_date",
      "end_date",
      "is_current",
      "sort_order",
    ],
  }),

  education: define({
    table: "education",
    writable: [
      "institution",
      "degree",
      "field",
      "location",
      "description",
      "start_date",
      "end_date",
      "is_current",
      "sort_order",
      "is_visible",
    ],
    required: ["institution", "degree"],
    publicColumns: [
      "id",
      "institution",
      "degree",
      "field",
      "location",
      "description",
      "start_date",
      "end_date",
      "is_current",
      "sort_order",
    ],
  }),

  achievements: define({
    table: "achievements",
    writable: ["title", "description", "year", "sort_order", "is_visible"],
    required: ["title"],
    publicColumns: ["id", "title", "description", "year", "sort_order"],
  }),

  certifications: define({
    table: "certifications",
    writable: [
      "name",
      "organization",
      "year",
      "description",
      "credential_url",
      "sort_order",
      "is_visible",
    ],
    required: ["name"],
    publicColumns: [
      "id",
      "name",
      "organization",
      "year",
      "description",
      "credential_url",
      "sort_order",
    ],
  }),

  "social-links": define({
    table: "social_links",
    writable: ["platform", "label", "url", "handle", "sort_order", "is_visible"],
    required: ["platform", "label", "url"],
    publicColumns: ["id", "platform", "label", "url", "handle", "sort_order"],
  }),
};

export const resourceKeys = Object.keys(resources);
