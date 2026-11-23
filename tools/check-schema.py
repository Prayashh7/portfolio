"""Checks the SQL schema against the code and the seed data.

Three lists have to agree and nothing enforces that at write time:
  001_init.sql          the columns that exist
  resources.js /
  singletons.js         the columns the API reads and writes
  seeds/content.json    the columns the seed sets

A mismatch in any direction is a runtime error on a real request, so each pair is
compared here: unknown columns, NOT NULL columns nothing can fill, ORDER BY
clauses naming columns that are not there, and seed keys with no column.
"""

import json
import re
import sys

BACKEND = "backend"

# Columns the database fills in on its own; no code needs to write them.
MANAGED = {"id", "created_at", "updated_at"}


def read(path):
    return open(f"{BACKEND}/{path}", encoding="utf-8").read()


def sql_tables():
    """table -> {column: {"notnull": bool, "default": bool}}"""
    src = read("db/migrations/001_init.sql")
    tables = {}
    for match in re.finditer(
        r"CREATE TABLE IF NOT EXISTS (\w+) \((.*?)\n\);", src, re.S
    ):
        table, body = match.groups()
        columns = {}
        depth = 0
        line = ""
        # Split on top-level commas: CHECK (x IN ('a','b')) contains commas too.
        for ch in body + ",":
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            if ch == "," and depth == 0:
                definition = line.strip()
                line = ""
                if not definition or definition.upper().startswith(
                    ("PRIMARY KEY", "UNIQUE", "CHECK", "CONSTRAINT", "FOREIGN KEY")
                ):
                    continue
                name = definition.split()[0]
                upper = definition.upper()
                columns[name] = {
                    "notnull": "NOT NULL" in upper or "PRIMARY KEY" in upper,
                    "default": "DEFAULT" in upper or " SERIAL" in f" {upper}",
                }
                continue
            line += ch
        tables[table] = columns
    return tables


def js_strings(text):
    return re.findall(r'"([^"]+)"', text)


def resources():
    src = read("db/resources.js")
    out = {}
    for match in re.finditer(r'\n  "?([\w-]+)"?: define\(\{(.*?)\n  \}\),', src, re.S):
        key, body = match.groups()

        def field(name):
            found = re.search(rf"{name}: \[(.*?)\]", body, re.S)
            return js_strings(found.group(1)) if found else []

        order = re.search(r'order: "([^"]*)"', body)
        out[key] = {
            "table": re.search(r'table: "(\w+)"', body).group(1),
            "writable": field("writable"),
            "required": field("required"),
            "publicColumns": field("publicColumns"),
            "order": order.group(1) if order else "sort_order ASC, id ASC",
        }
    return out


def singletons():
    src = read("db/singletons.js")
    out = {}
    for key, table in (("profile", "profile"), ("settings", "site_settings")):
        block = re.search(rf"const {key}Columns = \{{(.*?)\n\}};", src, re.S).group(1)
        writable = re.findall(r"\n  ([a-z_0-9]+):", block)

        spec = re.search(rf"\n  {key}: \{{(.*?)\n  \}},?\n", src, re.S).group(1)
        public = re.search(r"publicColumns: \[(.*?)\]", spec, re.S)
        if public:
            public = js_strings(public.group(1))
        else:
            # settings publishes everything except a named private set.
            private = re.search(r"PRIVATE_SETTINGS = new Set\(\[(.*?)\]\)", src, re.S)
            excluded = js_strings(private.group(1)) if private else []
            public = [c for c in writable if c not in excluded] + ["id"]
        out[key] = {"table": table, "writable": writable, "publicColumns": public}
    return out


def seed_keys():
    data = json.loads(read("seeds/content.json"))
    out = {}
    for key, value in data.items():
        if isinstance(value, dict):
            out[key] = sorted(value)
        elif isinstance(value, list):
            keys = set()
            for row in value:
                if isinstance(row, dict):
                    keys |= set(row)
            out[key] = sorted(keys)

    # Skills are nested inside their category in the seed file so the two stay
    # readable together; they land in their own table.
    nested = set()
    for category in data.get("skill_categories", []):
        for skill in category.get("skills", []):
            nested |= set(skill)
    if nested:
        out["skills"] = sorted(nested)
    return out


def order_columns(clause):
    return [part.strip().split()[0] for part in clause.split(",") if part.strip()]


def main():
    tables = sql_tables()
    collections = resources()
    singles = singletons()
    seeds = seed_keys()
    problems = []

    def known(table, columns, label):
        for column in columns:
            if column not in tables[table]:
                problems.append(f"{label}: {table} has no column {column}")

    for key, spec in collections.items():
        table = spec["table"]
        if table not in tables:
            problems.append(f"{key}: no CREATE TABLE for {table}")
            continue

        known(table, spec["writable"], f"{key} writable")
        known(table, [c for c in spec["publicColumns"] if c != "id"], f"{key} public")
        known(table, order_columns(spec["order"]), f"{key} order")

        for column in spec["required"]:
            if column not in spec["writable"]:
                problems.append(f"{key}: required column {column} is not writable")

        # A NOT NULL column with no default has to be required, or every insert fails.
        for column, info in tables[table].items():
            if column in MANAGED or info["default"] or not info["notnull"]:
                continue
            if column not in spec["required"]:
                problems.append(f"{key}: {column} is NOT NULL with no default but not required")

        unpublished = [
            c for c in tables[table]
            if c not in MANAGED and c not in spec["publicColumns"]
        ]
        for column in unpublished:
            if column not in {"is_visible", "description"}:
                problems.append(f"{key}: column {column} is never published (intended?)")

    for key, spec in singles.items():
        table = spec["table"]
        known(table, spec["writable"], f"{key} writable")
        known(table, [c for c in spec["publicColumns"] if c != "id"], f"{key} public")
        for column, info in tables[table].items():
            if column in MANAGED or info["default"] or not info["notnull"]:
                continue
            if column not in spec["writable"]:
                problems.append(f"{key}: {column} is NOT NULL with no default and not writable")

    # The seed writes directly, so its keys must be real columns.
    seed_tables = {
        "profile": "profile",
        "site_settings": "site_settings",
        "projects": "projects",
        "project_images": "project_images",
        "skill_categories": "skill_categories",
        "skills": "skills",
        "services": "services",
        "experience": "experience",
        "education": "education",
        "achievements": "achievements",
        "certifications": "certifications",
        "social_links": "social_links",
    }
    for key, columns in seeds.items():
        table = seed_tables.get(key)
        if not table:
            problems.append(f"seed: no table mapped for \"{key}\"")
            continue
        for column in columns:
            # Nested arrays are unwound by the seed into their own tables.
            if column in {"skills", "images"}:
                continue
            if column not in tables[table]:
                problems.append(f"seed {key}: {table} has no column {column}")

    if problems:
        print("FAIL schema")
        for line in problems:
            print("   ", line)
        sys.exit(1)

    print("ok   schema matches the API and the seed")
    for table in sorted(tables):
        print(f"       {table:18} {len(tables[table]):2} columns")


main()
