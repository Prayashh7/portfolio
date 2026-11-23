import { query } from "../db/pool.js";
import { listRows, publicView } from "../db/crud.js";
import { readSingleton } from "../db/singletons.js";
import { asyncHandler, notFound } from "../utils/http.js";

/*
  Read-only handlers for the public site. Everything here goes through the
  publicColumns projections, so a column added to a table is not published until
  it is deliberately listed as public.
*/

async function loadProfile() {
  const profile = await readSingleton("profile");
  if (!profile) throw notFound("The profile has not been set up yet.");
  return profile;
}

async function loadSettings() {
  const settings = await readSingleton("settings");
  if (!settings) throw notFound("Site settings have not been set up yet.");
  return settings;
}

/* Uncategorised skills would otherwise disappear from the page without a trace,
   so they are collected into a trailing group instead of being dropped. */
function groupSkills(categories, skills) {
  const groups = new Map(categories.map((category) => [category.id, { ...category, skills: [] }]));
  const ungrouped = [];

  for (const skill of skills) {
    const group = groups.get(skill.category_id);
    (group ? group.skills : ungrouped).push(skill);
  }

  const result = [...groups.values()];
  if (ungrouped.length > 0) {
    result.push({
      id: null,
      name: "Other",
      slug: "other",
      description: null,
      sort_order: 9999,
      skills: ungrouped,
    });
  }
  return result;
}

async function loadSkills() {
  const [categories, skills] = await Promise.all([listRows("skill-categories"), listRows("skills")]);
  return groupSkills(categories, skills);
}

export const getProfile = asyncHandler(async (req, res) => {
  res.json(await loadProfile());
});

export const getSettings = asyncHandler(async (req, res) => {
  res.json(await loadSettings());
});

export const getSkills = asyncHandler(async (req, res) => {
  res.json(await loadSkills());
});

/* One handler shape for every flat public collection. */
export const getCollection = (key) =>
  asyncHandler(async (req, res) => {
    res.json(await listRows(key));
  });

export const getProjectBySlug = asyncHandler(async (req, res) => {
  const { rows } = await query(
    "SELECT * FROM projects WHERE slug = $1 AND is_visible = true",
    [req.params.slug]
  );
  const project = rows[0];
  if (!project) throw notFound("There is no project at that address.");

  const { rows: images } = await query(
    `SELECT id, url, alt, sort_order FROM project_images
     WHERE project_id = $1 ORDER BY sort_order ASC, id ASC`,
    [project.id]
  );

  // The list projection omits description to keep that payload small; the detail
  // view is the one place it is served.
  res.json({ ...publicView("projects", project), description: project.description, images });
});

export const getPortfolio = asyncHandler(async (req, res) => {
  const [
    profile,
    settings,
    projects,
    skill_categories,
    services,
    experience,
    education,
    achievements,
    certifications,
    social_links,
  ] = await Promise.all([
    loadProfile(),
    loadSettings(),
    listRows("projects"),
    loadSkills(),
    listRows("services"),
    listRows("experience"),
    listRows("education"),
    listRows("achievements"),
    listRows("certifications"),
    listRows("social-links"),
  ]);

  res.json({
    profile,
    settings,
    projects,
    skill_categories,
    services,
    experience,
    education,
    achievements,
    certifications,
    social_links,
  });
});

export const getHealth = asyncHandler(async (req, res) => {
  const uptime_s = Math.round(process.uptime());
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: "ok", uptime_s });
  } catch {
    res.status(503).json({ status: "degraded", database: "unreachable", uptime_s });
  }
});
