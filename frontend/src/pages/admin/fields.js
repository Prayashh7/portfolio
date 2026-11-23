/*
  The dashboard forms, described as data.

  The backend already describes every collection once (backend/db/resources.js);
  this is the matching description for the interface, and the two agree on column
  names. Adding a column to a table means adding a line here — not writing another
  form. Every field listed is a writable column, so no request can carry anything
  the API would reject as unrecognised.
*/

const LEVEL_OPTIONS = [
  { value: "working", label: "Working knowledge" },
  { value: "confident", label: "Confident" },
  { value: "advanced", label: "Advanced" },
];

/* Matches the set drawn in components/Icon.jsx. */
const ICON_OPTIONS = [
  { value: "layers", label: "Layers" },
  { value: "monitor", label: "Monitor" },
  { value: "server", label: "Server" },
  { value: "orbit", label: "Orbit" },
  { value: "spark", label: "Spark" },
];

const visibility = {
  name: "is_visible",
  label: "Visible on the site",
  type: "toggle",
  default: true,
};

const order = {
  name: "sort_order",
  label: "Order",
  type: "number",
  help: "Lower numbers come first.",
};

export const collections = {
  projects: {
    label: "Projects",
    singular: "project",
    subtitle: "Everything in the work section, in the order shown.",
    columns: [
      { key: "name", label: "Project" },
      { key: "category", label: "Category" },
      { key: "year", label: "Year" },
    ],
    groups: [
      {
        legend: "The project",
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          {
            name: "slug",
            label: "Slug",
            type: "slug",
            required: true,
            help: "Used in the address: /work/your-slug",
          },
          {
            name: "summary",
            label: "Summary",
            type: "textarea",
            rows: 3,
            help: "One or two sentences. Shown in the work list.",
          },
          {
            name: "description",
            label: "Case notes",
            type: "textarea",
            rows: 10,
            help: "Shown on the project page. Leave a blank line between paragraphs.",
          },
          { name: "category", label: "Category", type: "text" },
          { name: "role", label: "Role", type: "text" },
          { name: "year", label: "Year", type: "number" },
          {
            name: "technologies",
            label: "Technologies",
            type: "tags",
            help: "Comma separated.",
          },
        ],
      },
      {
        legend: "Links and placement",
        fields: [
          { name: "cover_image_url", label: "Cover image", type: "image" },
          { name: "live_url", label: "Live site", type: "url" },
          { name: "github_url", label: "Repository", type: "url" },
          { name: "is_featured", label: "Featured", type: "toggle" },
          visibility,
          order,
        ],
      },
    ],
  },

  services: {
    label: "Services",
    singular: "service",
    subtitle: "What you take on, as listed under Services.",
    columns: [
      { key: "name", label: "Service" },
      { key: "icon", label: "Icon" },
    ],
    groups: [
      {
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea", rows: 4 },
          { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { name: "stack", label: "Stack", type: "tags", help: "Comma separated." },
          visibility,
          order,
        ],
      },
    ],
  },

  "skill-categories": {
    label: "Skill groups",
    singular: "skill group",
    subtitle: "The headings skills are filed under. Uncategorised skills appear under Other.",
    columns: [
      { key: "name", label: "Group" },
      { key: "slug", label: "Slug" },
    ],
    groups: [
      {
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "slug", label: "Slug", type: "slug", required: true },
          { name: "description", label: "Note", type: "textarea", rows: 2 },
          order,
        ],
      },
    ],
  },

  skills: {
    label: "Skills",
    singular: "skill",
    subtitle: "Individual skills and how far each one goes.",
    columns: [
      { key: "name", label: "Skill" },
      { key: "level", label: "Level" },
    ],
    groups: [
      {
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          {
            name: "category_id",
            label: "Group",
            type: "reference",
            source: "skill-categories",
            help: "Leave empty to file this under Other.",
          },
          { name: "level", label: "Level", type: "select", options: LEVEL_OPTIONS },
          { name: "note", label: "Note", type: "text" },
          { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          visibility,
          order,
        ],
      },
    ],
  },

  experience: {
    label: "Experience",
    singular: "role",
    subtitle: "Positions held. The section hides itself while this is empty.",
    columns: [
      { key: "position", label: "Position" },
      { key: "company", label: "Company" },
    ],
    groups: [
      {
        fields: [
          { name: "position", label: "Position", type: "text", required: true },
          { name: "company", label: "Company", type: "text", required: true },
          { name: "location", label: "Location", type: "text" },
          { name: "description", label: "Description", type: "textarea", rows: 4 },
          { name: "start_date", label: "Started", type: "date" },
          { name: "end_date", label: "Ended", type: "date" },
          { name: "is_current", label: "Still there", type: "toggle" },
          visibility,
          order,
        ],
      },
    ],
  },

  education: {
    label: "Education",
    singular: "course",
    columns: [
      { key: "degree", label: "Course" },
      { key: "institution", label: "Institution" },
    ],
    groups: [
      {
        fields: [
          { name: "degree", label: "Course", type: "text", required: true },
          { name: "institution", label: "Institution", type: "text", required: true },
          { name: "field", label: "Field", type: "text" },
          { name: "location", label: "Location", type: "text" },
          { name: "description", label: "Description", type: "textarea", rows: 4 },
          { name: "start_date", label: "Started", type: "date" },
          { name: "end_date", label: "Ended", type: "date" },
          { name: "is_current", label: "Still studying", type: "toggle" },
          visibility,
          order,
        ],
      },
    ],
  },

  certifications: {
    label: "Certifications",
    singular: "certification",
    columns: [
      { key: "name", label: "Certification" },
      { key: "organization", label: "Issued by" },
      { key: "year", label: "Year" },
    ],
    groups: [
      {
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "organization", label: "Issued by", type: "text" },
          { name: "year", label: "Year", type: "number" },
          { name: "description", label: "Description", type: "textarea", rows: 3 },
          { name: "credential_url", label: "Credential link", type: "url" },
          visibility,
          order,
        ],
      },
    ],
  },

  achievements: {
    label: "Achievements",
    singular: "achievement",
    subtitle: "Kept short and factual.",
    columns: [
      { key: "title", label: "Achievement" },
      { key: "year", label: "Year" },
    ],
    groups: [
      {
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea", rows: 3 },
          { name: "year", label: "Year", type: "number" },
          visibility,
          order,
        ],
      },
    ],
  },

  "social-links": {
    label: "Social links",
    singular: "link",
    subtitle: "Shown in the footer. Hide a link to keep it for later.",
    columns: [
      { key: "label", label: "Label" },
      { key: "platform", label: "Platform" },
      { key: "handle", label: "Handle" },
    ],
    groups: [
      {
        fields: [
          { name: "label", label: "Label", type: "text", required: true },
          {
            name: "platform",
            label: "Platform key",
            type: "text",
            required: true,
            help: "Lowercase identifier, for example github or linkedin.",
          },
          { name: "url", label: "Address", type: "url", required: true },
          { name: "handle", label: "Handle", type: "text" },
          visibility,
          order,
        ],
      },
    ],
  },
};

export const profileGroups = [
  {
    legend: "Identity",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "tagline", label: "Tagline", type: "text" },
      {
        name: "short_bio",
        label: "Short bio",
        type: "textarea",
        rows: 3,
        help: "Used for search results and link previews when no SEO description is set.",
      },
      {
        name: "bio",
        label: "Bio",
        type: "textarea",
        rows: 10,
        help: "The About section. Leave a blank line between paragraphs.",
      },
    ],
  },
  {
    legend: "Place",
    fields: [
      { name: "location", label: "Location", type: "text" },
      { name: "timezone_label", label: "Timezone label", type: "text" },
      { name: "latitude", label: "Latitude", type: "number", step: "any" },
      { name: "longitude", label: "Longitude", type: "number", step: "any" },
    ],
  },
  {
    legend: "Reach",
    fields: [
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "website_url", label: "Website", type: "url" },
    ],
  },
  {
    legend: "Artwork",
    fields: [
      {
        name: "image_url",
        label: "Portrait",
        type: "image",
        help: "The image the hero scene is built from.",
      },
      {
        name: "image_depth_url",
        label: "Depth map",
        type: "image",
        help: "Greyscale companion to the portrait: white is near, black is far. Without it the hero stays flat.",
      },
      { name: "about_image_url", label: "About image", type: "image" },
      {
        name: "resume_url",
        label: "CV link",
        type: "url",
        help: "Address of a hosted PDF. Uploads here accept images only.",
      },
    ],
  },
  {
    legend: "Availability",
    fields: [
      {
        name: "availability_status",
        label: "Status",
        type: "select",
        allowEmpty: false,
        options: [
          { value: "open", label: "Open to work" },
          { value: "limited", label: "Limited availability" },
          { value: "closed", label: "Not available" },
        ],
      },
      { name: "availability_note", label: "Note", type: "text" },
    ],
  },
];

export const settingsGroups = [
  {
    legend: "Hero",
    fields: [
      { name: "hero_eyebrow", label: "Eyebrow", type: "text" },
      { name: "hero_headline", label: "Headline", type: "textarea", rows: 2 },
      { name: "hero_lede", label: "Lede", type: "textarea", rows: 3 },
      { name: "hero_primary_cta_label", label: "First button", type: "text" },
      { name: "hero_primary_cta_href", label: "First button link", type: "url" },
      { name: "hero_secondary_cta_label", label: "Second button", type: "text" },
      { name: "hero_secondary_cta_href", label: "Second button link", type: "url" },
    ],
  },
  {
    legend: "Section headings",
    fields: [
      { name: "about_heading", label: "About heading", type: "text" },
      { name: "about_body", label: "About standfirst", type: "textarea", rows: 3 },
      { name: "projects_heading", label: "Work heading", type: "text" },
      { name: "projects_intro", label: "Work intro", type: "textarea", rows: 2 },
      { name: "services_heading", label: "Services heading", type: "text" },
      { name: "services_intro", label: "Services intro", type: "textarea", rows: 2 },
      { name: "skills_heading", label: "Skills heading", type: "text" },
      { name: "skills_intro", label: "Skills intro", type: "textarea", rows: 2 },
      { name: "background_heading", label: "Record heading", type: "text" },
      { name: "background_intro", label: "Record intro", type: "textarea", rows: 2 },
    ],
  },
  {
    legend: "Contact",
    fields: [
      { name: "contact_heading", label: "Heading", type: "text" },
      { name: "contact_intro", label: "Intro", type: "textarea", rows: 2 },
      { name: "contact_form_enabled", label: "Show the form", type: "toggle" },
      { name: "contact_form_note", label: "Note beside the button", type: "text" },
      { name: "contact_success_message", label: "Message after sending", type: "text" },
      {
        name: "contact_recipient_email",
        label: "Send notifications to",
        type: "email",
        help: "Never sent to the public site. Falls back to your profile email.",
      },
    ],
  },
  {
    legend: "Site",
    fields: [
      { name: "seo_title", label: "Page title", type: "text" },
      { name: "seo_description", label: "Meta description", type: "textarea", rows: 3 },
      { name: "og_image_url", label: "Share image", type: "image" },
      {
        name: "accent_color",
        label: "Accent colour",
        type: "color",
        help: "Applied at runtime, so a change here needs no rebuild.",
      },
      { name: "footer_note", label: "Footer note", type: "text" },
      {
        name: "featured_project_id",
        label: "Featured project",
        type: "reference",
        source: "projects",
      },
    ],
  },
];

export function flatten(groups) {
  return groups.flatMap((group) => group.fields);
}
