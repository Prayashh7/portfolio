"""Checks the dashboard's field definitions against the API's writable columns.

The backend rejects an unrecognised key outright, so a field the API does not
accept would break saving. This compares the two lists rather than trusting that
they were kept in step by hand.
"""

import re
import sys

BACKEND = "backend"
FRONTEND = "frontend"


def js_array(text):
    return re.findall(r'"([^"]+)"', text)


def backend_collections():
    src = open(f"{BACKEND}/db/resources.js", encoding="utf-8").read()
    out = {}
    for match in re.finditer(r'\n  "?([\w-]+)"?: define\(\{(.*?)\n  \}\),', src, re.S):
        key, body = match.groups()
        writable = re.search(r"writable: \[(.*?)\]", body, re.S)
        required = re.search(r"required: \[(.*?)\]", body, re.S)
        out[key] = {
            "writable": js_array(writable.group(1)),
            "required": js_array(required.group(1)),
        }
    return out


def backend_singletons():
    src = open(f"{BACKEND}/db/singletons.js", encoding="utf-8").read()
    out = {}
    for name in ("profile", "settings"):
        match = re.search(rf"const {name}Columns = \{{(.*?)\n\}};", src, re.S)
        if not match:
            match = re.search(rf"const {name}Columns = \[(.*?)\];", src, re.S)
            out[name] = js_array(match.group(1))
            continue
        # An object keyed by column name, one validator each.
        out[name] = re.findall(r"\n  ([a-z_0-9]+):", match.group(1))
    return out


def frontend_fields():
    src = open(f"{FRONTEND}/src/pages/admin/fields.js", encoding="utf-8").read()

    shared = {}
    for match in re.finditer(r"const (\w+) = \{\n  name: \"(\w+)\",", src):
        shared[match.group(1)] = match.group(2)

    collections = {}
    body = src[src.index("export const collections"):]
    for match in re.finditer(r'\n  "?([\w-]+)"?: \{\n    label:(.*?)\n  \},', body, re.S):
        key, block = match.groups()
        names = re.findall(r'name: "(\w+)"', block)
        for alias, column in shared.items():
            names += [column] * len(re.findall(rf"\n +{alias},", block))
        collections[key] = names

    singles = {}
    for name in ("profileGroups", "settingsGroups"):
        block = re.search(rf"export const {name} = \[(.*?)\n\];", src, re.S).group(1)
        singles[name.replace("Groups", "")] = re.findall(r'name: "(\w+)"', block)

    references = dict(re.findall(r'name: "(\w+)"[^}]*?source: "([\w-]+)"', src))
    return collections, singles, references


def main():
    api = backend_collections()
    singles_api = backend_singletons()
    ui, singles_ui, references = frontend_fields()

    problems = []

    if set(api) != set(ui):
        problems.append(f"collections differ: api={sorted(api)} ui={sorted(ui)}")

    for key in sorted(set(api) & set(ui)):
        writable = api[key]["writable"]
        extra = [name for name in ui[key] if name not in writable]
        missing = [name for name in writable if name not in ui[key]]
        duplicated = [name for name in set(ui[key]) if ui[key].count(name) > 1]
        if extra:
            problems.append(f"{key}: fields the API would reject -> {extra}")
        if missing:
            problems.append(f"{key}: writable columns with no field -> {missing}")
        if duplicated:
            problems.append(f"{key}: field listed twice -> {duplicated}")

    for key, columns in singles_api.items():
        fields = singles_ui.get(key, [])
        extra = [name for name in fields if name not in columns]
        missing = [name for name in columns if name not in fields]
        if extra:
            problems.append(f"{key}: fields the API would reject -> {extra}")
        if missing:
            problems.append(f"{key}: writable columns with no field -> {missing}")

    for field, source in references.items():
        if source not in api:
            problems.append(f"reference {field} points at unknown collection {source}")

    if problems:
        print("FAIL dashboard fields")
        for line in problems:
            print("   ", line)
        sys.exit(1)

    print("ok   dashboard fields match the API")
    for key in sorted(api):
        print(f"       {key:18} {len(api[key]['writable']):2} writable")
    for key in sorted(singles_api):
        print(f"       {key:18} {len(singles_api[key]):2} writable")


main()
