import { z } from "zod";
import { query } from "./pool.js";
import { invalid } from "../utils/http.js";
import {
  enumField,
  flag,
  nullableEmail,
  nullableInteger,
  nullableLink,
  nullableNumber,
  nullableString,
  parseBody,
  requiredString,
} from "../utils/validate.js";

/*
  `profile` and `site_settings` each hold exactly one row, pinned to id = 1 by a
  check constraint. They are handled here rather than through resources.js because
  they are never listed, created or deleted — only read and patched.
*/

const profileColumns = {
  name: requiredString(200),
  title: requiredString(200),
  tagline: nullableString(300),
  bio: nullableString(6000),
  short_bio: nullableString(600),
  location: nullableString(160),
  timezone_label: nullableString(40),
  latitude: nullableNumber(-90, 90),
  longitude: nullableNumber(-180, 180),
  email: nullableEmail,
  phone: nullableString(40),
  website_url: nullableLink,
  image_url: nullableLink,
  image_depth_url: nullableLink,
  about_image_url: nullableLink,
  resume_url: nullableLink,
  availability_status: enumField(
    ["open", "limited", "closed"],
    "Choose open, limited or closed."
  ),
  availability_note: nullableString(400),
};

const settingsColumns = {
  hero_eyebrow: nullableString(160),
  hero_headline: nullableString(300),
  hero_lede: nullableString(600),
  hero_primary_cta_label: nullableString(60),
  hero_primary_cta_href: nullableLink,
  hero_secondary_cta_label: nullableString(60),
  hero_secondary_cta_href: nullableLink,
  about_heading: nullableString(160),
  about_body: nullableString(2000),
  services_heading: nullableString(160),
  services_intro: nullableString(600),
  projects_heading: nullableString(160),
  projects_intro: nullableString(600),
  skills_heading: nullableString(160),
  skills_intro: nullableString(600),
  background_heading: nullableString(160),
  background_intro: nullableString(600),
  contact_heading: nullableString(160),
  contact_intro: nullableString(600),
  contact_form_note: nullableString(400),
  contact_success_message: nullableString(400),
  contact_form_enabled: flag,
  contact_recipient_email: nullableEmail,
  footer_note: nullableString(400),
  seo_title: nullableString(120),
  seo_description: nullableString(320),
  og_image_url: nullableLink,
  accent_color: nullableString(9, /^#[0-9a-fA-F]{3,8}$/, "Use a hex colour such as #22D3EE."),
  featured_project_id: nullableInteger(1, 2_147_483_647),
};

/* Settings columns the public site never receives. */
const PRIVATE_SETTINGS = new Set(["contact_recipient_email"]);

const partial = (columns) =>
  z
    .object(
      Object.fromEntries(Object.entries(columns).map(([key, schema]) => [key, schema.optional()]))
    )
    .strict();

export const singletons = {
  profile: {
    table: "profile",
    schema: partial(profileColumns),
    writable: Object.keys(profileColumns),
    publicColumns: [
      "name",
      "title",
      "tagline",
      "bio",
      "short_bio",
      "location",
      "timezone_label",
      "latitude",
      "longitude",
      "email",
      "phone",
      "website_url",
      "image_url",
      "image_depth_url",
      "about_image_url",
      "resume_url",
      "availability_status",
      "availability_note",
      "updated_at",
    ],
  },
  settings: {
    table: "site_settings",
    schema: partial(settingsColumns),
    writable: Object.keys(settingsColumns),
    /*
      Every column in this table is page copy, so the public list is a subtraction
      rather than an allowlist — a heading added later should appear on the page
      without also having to be published by hand.

      The exception is the notification address: the server sends the email, so the
      page has no reason to know where it goes. Anything else that is not meant to
      be readable belongs on the profile or in an environment variable, not here.
    */
    publicColumns: Object.keys(settingsColumns).filter(
      (column) => !PRIVATE_SETTINGS.has(column)
    ),
  },
};

export async function readSingleton(key, { includeHidden = false } = {}) {
  const spec = singletons[key];
  const columns = includeHidden ? "*" : spec.publicColumns.join(", ");
  const { rows } = await query(`SELECT ${columns} FROM ${spec.table} WHERE id = 1`);
  return rows[0] ?? null;
}

export async function updateSingleton(key, body) {
  const spec = singletons[key];
  const data = parseBody(spec.schema, body);
  const columns = Object.keys(data);
  if (columns.length === 0) throw invalid("Nothing was changed.");

  const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
  const { rows } = await query(
    `UPDATE ${spec.table} SET ${assignments.join(", ")} WHERE id = 1 RETURNING *`,
    columns.map((column) => data[column])
  );

  if (!rows[0]) {
    throw invalid("There is no row to update yet. Run `npm run seed` to create it.");
  }
  return rows[0];
}
