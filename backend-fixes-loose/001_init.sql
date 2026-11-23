-- Initial schema for the portfolio.
-- Applied by `npm run migrate`, which records each file in schema_migrations.

-- No CREATE EXTENSION here on purpose. Shared cPanel hosting ships Postgres
-- without the contrib extensions, so `CREATE EXTENSION citext` fails with
-- "could not open extension control file" and takes the whole migration with
-- it. Case-insensitive email is done with lower() instead — see users below.

-- Keeps updated_at honest without repeating it in every UPDATE statement.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- Admin accounts
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  email         text   NOT NULL,
  password_hash text   NOT NULL,
  name          text,
  role          text   NOT NULL DEFAULT 'admin',
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

/* Stands in for the UNIQUE constraint a citext column would have given us.
   Every write path lowercases the address first (emailField in utils/validate.js,
   and env.admin.email for the seed), so stored values are already lowercase —
   this index is what stops a second row sneaking in with different casing. */
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- --------------------------------------------------------------------------
-- Profile - one row, id is pinned to 1
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile (
  id                  integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name                text NOT NULL,
  title               text NOT NULL,
  tagline             text,
  bio                 text,
  short_bio           text,
  location            text,
  timezone_label      text,
  latitude            numeric(9, 6),
  longitude           numeric(9, 6),
  email               text,
  phone               text,
  website_url         text,
  image_url           text,
  image_depth_url     text,
  about_image_url     text,
  resume_url          text,
  availability_status text NOT NULL DEFAULT 'open'
                      CHECK (availability_status IN ('open', 'limited', 'closed')),
  availability_note   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Work
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               serial PRIMARY KEY,
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  summary          text,
  description      text,
  category         text,
  role             text,
  year             integer,
  technologies     text[] NOT NULL DEFAULT '{}',
  cover_image_url  text,
  live_url         text,
  github_url       text,
  is_featured      boolean NOT NULL DEFAULT false,
  is_visible       boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_visible_idx ON projects (is_visible, sort_order);

CREATE TABLE IF NOT EXISTS project_images (
  id         serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  url        text NOT NULL,
  alt        text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_images_project_idx ON project_images (project_id, sort_order);

-- --------------------------------------------------------------------------
-- Skills, grouped into categories
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_categories (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id          serial PRIMARY KEY,
  category_id integer REFERENCES skill_categories (id) ON DELETE SET NULL,
  name        text NOT NULL,
  level       text CHECK (level IN ('working', 'confident', 'advanced')),
  note        text,
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS skills_category_idx ON skills (category_id, sort_order);

-- --------------------------------------------------------------------------
-- Background
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience (
  id          serial PRIMARY KEY,
  company     text NOT NULL,
  position    text NOT NULL,
  location    text,
  description text,
  start_date  date,
  end_date    date,
  is_current  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS education (
  id          serial PRIMARY KEY,
  institution text NOT NULL,
  degree      text NOT NULL,
  field       text,
  location    text,
  description text,
  start_date  date,
  end_date    date,
  is_current  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  description text,
  icon        text,
  stack       text[] NOT NULL DEFAULT '{}',
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievements (
  id          serial PRIMARY KEY,
  title       text NOT NULL,
  description text,
  year        integer,
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certifications (
  id             serial PRIMARY KEY,
  name           text NOT NULL,
  organization   text,
  year           integer,
  description    text,
  credential_url text,
  sort_order     integer NOT NULL DEFAULT 0,
  is_visible     boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_links (
  id         serial PRIMARY KEY,
  platform   text NOT NULL,
  label      text NOT NULL,
  url        text NOT NULL,
  handle     text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Editable page copy - one row, id is pinned to 1
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id                        integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_eyebrow              text,
  hero_headline             text,
  hero_lede                 text,
  hero_primary_cta_label    text,
  hero_primary_cta_href     text,
  hero_secondary_cta_label  text,
  hero_secondary_cta_href   text,
  about_heading             text,
  about_body                text,
  services_heading          text,
  services_intro            text,
  projects_heading          text,
  projects_intro            text,
  skills_heading            text,
  skills_intro              text,
  background_heading        text,
  background_intro          text,
  contact_heading           text,
  contact_intro             text,
  contact_form_note         text,
  contact_success_message   text,
  contact_form_enabled      boolean NOT NULL DEFAULT true,
  contact_recipient_email   text,
  footer_note               text,
  seo_title                 text,
  seo_description           text,
  og_image_url              text,
  accent_color              text,
  featured_project_id       integer REFERENCES projects (id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Contact form submissions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text,
  message    text NOT NULL,
  is_read    boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_unread_idx ON contact_messages (is_read, created_at DESC);

-- --------------------------------------------------------------------------
-- updated_at triggers
-- --------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'profile', 'projects', 'project_images',
                           'skill_categories', 'skills', 'experience', 'education',
                           'services', 'achievements', 'certifications',
                           'social_links', 'site_settings', 'contact_messages']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
