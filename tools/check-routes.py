"""Checks that every endpoint the frontend calls is mounted by the backend.

The frontend builds its paths in one file and the backend mounts them in three,
so a rename on either side is a 404 nobody notices until a button is pressed.
This resolves both sides to a method plus a path pattern and compares them.
"""

import re
import sys

BACKEND = "backend"
API = "frontend/src/services/api.js"

METHODS = ("get", "post", "put", "patch", "delete")


def read(path):
    return open(path, encoding="utf-8").read()


def resource_keys():
    src = read(f"{BACKEND}/db/resources.js")
    body = src[src.index("export const resources"):]
    return re.findall(r'\n  "?([\w-]+)"?: define\(\{', body)


def backend_routes():
    """(method, path) for every mounted endpoint, path including the /api prefix."""
    mounts = dict(
        re.findall(
            r'app\.use\("(/api[^"]*)", (\w+)Routes\)', read(f"{BACKEND}/app.js")
        )
    )
    files = {"public": "routes/public.js", "auth": "routes/auth.js", "admin": "routes/admin.js"}
    keys = resource_keys()
    found = set()

    for prefix, name in mounts.items():
        src = read(f"{BACKEND}/{files[name]}")

        # router.get("/path", handler)
        for method, path in re.findall(rf'router\.({"|".join(METHODS)})\("([^"]*)"', src):
            found.add((method.upper(), prefix + path))

        # router.route("/path").get(...).post(...)
        for path, chain in re.findall(r'router\s*\.route\("([^"]*)"\)(.*?);', src, re.S):
            for method in re.findall(rf'\.({"|".join(METHODS)})\(', chain):
                found.add((method.upper(), prefix + path))

        # The same block written with a template literal inside the resource loop.
        for template, chain in re.findall(r"router\s*\.route\(`([^`]*)`\)(.*?);", src, re.S):
            for method in re.findall(rf'\.({"|".join(METHODS)})\(', chain):
                for key in keys:
                    found.add((method.upper(), prefix + template.replace("${key}", key)))

    return found


def frontend_calls():
    """(method, path) for every call the frontend makes, /api-prefixed."""
    src = read(API)
    keys = resource_keys()
    calls = set()

    pattern = re.compile(
        r"request\(\s*(?:\"([^\"]+)\"|`([^`]+)`)\s*(?:,\s*\{([^}]*)\})?", re.S
    )
    for match in pattern.finditer(src):
        raw = match.group(1) or match.group(2)
        options = match.group(3) or ""
        method = re.search(r'method:\s*"(\w+)"', options)
        method = method.group(1) if method else "GET"

        # ${id}-style segments become :param; ${resource} fans out to every key.
        path = re.sub(r"\$\{(?:encodeURIComponent\()?(\w+)\)?\}", r"${\1}", raw)
        variants = [path]
        if "${resource}" in path:
            variants = [path.replace("${resource}", key) for key in keys]

        for variant in variants:
            normalised = re.sub(r"\$\{\w+\}", ":param", variant)
            calls.add((method, "/api" + normalised))

    return calls


def shape(path):
    """Path with every parameter name flattened, so :id and :slug compare equal."""
    return re.sub(r":[\w]+", ":param", path)


def main():
    served = backend_routes()
    called = frontend_calls()
    served_shapes = {(method, shape(path)) for method, path in served}
    called_shapes = {(method, shape(path)) for method, path in called}

    missing = sorted(called_shapes - served_shapes)
    if missing:
        print(f"FAIL routes: {len(missing)} call(s) with no endpoint")
        for method, path in missing:
            print(f"     {method:6} {path}")
        sys.exit(1)

    print(f"ok   all {len(called_shapes)} frontend calls resolve to a mounted endpoint")

    unused = sorted(served_shapes - called_shapes)
    if unused:
        print(f"     {len(unused)} endpoint(s) the frontend does not call:")
        for method, path in unused:
            print(f"       {method:6} {path}")


main()
