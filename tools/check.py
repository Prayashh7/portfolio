"""Verification for the portfolio source tree.

Four checks, none of which need node_modules:
  imports  - every relative import resolves to a file on disk
  brackets - (), [], {} balance, aware of comments, strings and regex literals
  jsx      - opening and closing JSX tags balance per file
  classes  - every className used in JSX has a rule somewhere in styles/
"""

import json
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."


def walk(root, exts):
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "dist"}]
        for name in files:
            if os.path.splitext(name)[1] in exts:
                yield os.path.join(base, name)


# --------------------------------------------------------------------- strip

OPEN = {"(": ")", "[": "]", "{": "}"}
CLOSE = {v: k for k, v in OPEN.items()}
REGEX_PRECEDERS = set("(,=:[!&|?{};+-*%~^<>\n")


def blank_noncode(src):
    """Replace comments, string and template bodies, and regex literals with
    spaces, keeping newlines so reported line numbers stay true."""
    out = []
    i = 0
    n = len(src)
    prev_significant = "\n"

    while i < n:
        ch = src[i]
        nxt = src[i + 1] if i + 1 < n else ""

        if ch == "/" and nxt == "/":
            while i < n and src[i] != "\n":
                out.append(" ")
                i += 1
            continue

        if ch == "/" and nxt == "*":
            while i < n and not (src[i] == "*" and i + 1 < n and src[i + 1] == "/"):
                out.append("\n" if src[i] == "\n" else " ")
                i += 1
            out.append("  ")
            i += 2
            continue

        if ch in "\"'`":
            quote = ch
            out.append(quote)
            i += 1
            while i < n:
                if src[i] == "\\":
                    out.append("  ")
                    i += 2
                    continue
                if src[i] == quote:
                    break
                out.append("\n" if src[i] == "\n" else " ")
                i += 1
            out.append(quote)
            i += 1
            prev_significant = quote
            continue

        # A slash is a regex only where a value may start; otherwise it divides.
        if ch == "/" and prev_significant in REGEX_PRECEDERS:
            j = i + 1
            in_class = False
            ok = False
            while j < n and src[j] != "\n":
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "[":
                    in_class = True
                elif src[j] == "]":
                    in_class = False
                elif src[j] == "/" and not in_class:
                    ok = True
                    break
                j += 1
            if ok:
                out.append(" " * (j - i + 1))
                i = j + 1
                prev_significant = "x"
                continue

        out.append(ch)
        if not ch.isspace():
            prev_significant = ch
        elif ch == "\n":
            prev_significant = "\n"
        i += 1

    return "".join(out)


# ------------------------------------------------------------------- checks


def check_imports(root):
    problems = []
    for path in walk(root, {".js", ".jsx"}):
        src = open(path, encoding="utf-8").read()
        for match in re.finditer(r"""(?:from|import)\s+["'](\.[^"']+)["']""", src):
            target = match.group(1)
            resolved = os.path.normpath(os.path.join(os.path.dirname(path), target))
            candidates = [resolved, resolved + ".js", resolved + ".jsx", os.path.join(resolved, "index.js")]
            if not any(os.path.isfile(c) for c in candidates):
                line = src[: match.start()].count("\n") + 1
                problems.append(f"{path}:{line} -> {target}")
    return problems


def check_brackets(root):
    problems = []
    for path in walk(root, {".js", ".jsx", ".json", ".css"}):
        src = open(path, encoding="utf-8").read()
        code = blank_noncode(src) if not path.endswith((".json", ".css")) else src
        stack = []
        for index, ch in enumerate(code):
            if ch in OPEN:
                stack.append((ch, index))
            elif ch in CLOSE:
                if not stack or stack[-1][0] != CLOSE[ch]:
                    line = code[:index].count("\n") + 1
                    problems.append(f"{path}:{line} unexpected {ch}")
                    break
                stack.pop()
        else:
            if stack:
                ch, index = stack[-1]
                line = code[:index].count("\n") + 1
                problems.append(f"{path}:{line} unclosed {ch}")
    return problems


VOID = {"br", "hr", "img", "input", "meta", "link", "source", "path", "circle", "rect", "line",
        "polyline", "polygon", "ellipse", "use", "stop", "area", "col", "track", "wbr"}

TAG_START = re.compile(r"<(/?)([A-Za-z][\w.]*)")


def scan_tags(src):
    """Yield (closing, name, self_closing, position) for every JSX tag.

    Attributes are walked one character at a time because they nest: an arrow
    function inside a prop can contain further braces, which no single regex
    covers.
    """
    for match in TAG_START.finditer(src):
        closing, name = match.groups()
        i = match.end()
        depth = 0
        quote = None
        while i < len(src):
            ch = src[i]
            if quote:
                if ch == quote:
                    quote = None
            elif ch in "\"'`":
                quote = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            elif depth == 0 and ch == ">":
                yield closing, name, src[i - 1] == "/", match.start()
                break
            i += 1


def check_jsx(root):
    problems = []
    for path in walk(root, {".jsx"}):
        src = blank_noncode(open(path, encoding="utf-8").read())
        stack = []
        for closing, name, self_closing, start in scan_tags(src):
            if closing:
                if not stack or stack[-1][0] != name:
                    line = src[:start].count("\n") + 1
                    expected = stack[-1][0] if stack else "nothing open"
                    problems.append(f"{path}:{line} </{name}> but {expected}")
                    break
                stack.pop()
            elif not self_closing and name not in VOID:
                stack.append((name, start))
        else:
            if stack:
                name, start = stack[-1]
                line = src[:start].count("\n") + 1
                problems.append(f"{path}:{line} <{name}> never closed")
    return problems


def check_classes(root):
    css = ""
    for path in walk(os.path.join(root, "src", "styles"), {".css"}):
        css += open(path, encoding="utf-8").read()
    defined = set(re.findall(r"\.(-?[_a-zA-Z][\w-]*)", css))

    used = {}
    for path in walk(os.path.join(root, "src"), {".jsx", ".js"}):
        src = open(path, encoding="utf-8").read()

        # A class named as a selector string is doing a job even with no rule of
        # its own: the animation code targets .hero__eyebrow that way.
        defined.update(re.findall(r"""["']\.([\w-]+)["']""", src))

        for match in re.finditer(r'className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})', src):
            raw = " ".join(g for g in match.groups() if g)
            # An interpolated segment leaves a partial name behind, so the token
            # holding it is dropped rather than reported as missing.
            raw = re.sub(r"\$\{[^}]*\}", "\x00", raw)
            tokens = re.findall(r'"([^"]*)"', raw) if match.group(3) else [raw]
            for token in tokens:
                for name in token.split():
                    if "\x00" in name:
                        continue
                    used.setdefault(name, path)

    missing = [f"{name} (used in {os.path.basename(path)})" for name, path in sorted(used.items())
               if name not in defined]
    return missing


def main():
    checks = [
        ("relative imports", check_imports(ROOT)),
        ("bracket balance", check_brackets(ROOT)),
        ("jsx tag balance", check_jsx(ROOT)),
        ("class names with styles", check_classes(ROOT)),
    ]
    failed = False
    for label, problems in checks:
        if problems:
            failed = True
            print(f"FAIL {label}: {len(problems)}")
            for line in problems[:40]:
                print("   ", line)
        else:
            print(f"ok   {label}")
    sys.exit(1 if failed else 0)


main()
