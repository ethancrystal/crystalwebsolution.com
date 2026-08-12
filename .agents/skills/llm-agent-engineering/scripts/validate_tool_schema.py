#!/usr/bin/env python3
"""
validate_tool_schema.py — lint tool / function-call schemas for agent-friendliness.

Flags the patterns documented in references/tool-design.md and
references/small-and-open-models.md: ref graphs and combinators, deep nesting,
missing descriptions, closed value-spaces that should be enums, and over/under-
specified `required`. With --target small it is strict (open/small models like
Qwen-on-Ollama, MiniMax, Nemotron); with --target frontier it relaxes the
hard-fails to warnings.

Accepts (as a file path argument, or on stdin):
  - a single OpenAI-style tool:  {"type":"function","function":{name,description,parameters}}
  - a single bare tool:          {"name":..., "description":..., "parameters":{...}}
  - a bare parameters schema:    {"type":"object","properties":{...}}
  - a list of any of the above
  - an API request object that contains a top-level "tools": [...]

Exit code: 0 if no ERRORs, 1 otherwise. Use --json for machine-readable output.

Examples:
  python validate_tool_schema.py tools.json
  cat one_tool.json | python validate_tool_schema.py --target small
  python validate_tool_schema.py tools.json --json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

FORBIDDEN_KEYS = ("$ref", "$defs", "definitions", "oneOf", "anyOf", "allOf")
# Param names that usually denote a closed set of values -> should be an enum.
ENUM_CANDIDATE_NAMES = {
    "mode", "type", "status", "format", "order", "direction", "sort", "kind",
    "state", "severity", "role", "method", "strategy", "action", "operation",
    "level", "scope", "visibility", "category", "priority",
}
# Param names that are legitimately free text -> never flag as enum candidates.
FREE_TEXT_NAMES = {
    "query", "text", "content", "message", "prompt", "path", "url", "name",
    "title", "description", "pattern", "body", "code", "input", "value", "q",
}
NAME_RE = re.compile(r"^[a-z][a-z0-9_]*$")
DEFAULT_MAX_TOOLS = {"small": 15, "frontier": 40}


def _finding(level: str, code: str, msg: str, path: str = "") -> dict:
    return {"level": level, "code": code, "msg": msg, "path": path}


def load_tools(data: Any) -> list[dict]:
    """Normalize arbitrary input into a list of {name, description, parameters}."""
    if isinstance(data, dict) and isinstance(data.get("tools"), list):
        data = data["tools"]
    items = data if isinstance(data, list) else [data]
    out = []
    for it in items:
        if not isinstance(it, dict):
            out.append({"name": None, "description": None, "parameters": None})
            continue
        if it.get("type") == "function" and isinstance(it.get("function"), dict):
            fn = it["function"]
            out.append({"name": fn.get("name"), "description": fn.get("description"),
                        "parameters": fn.get("parameters")})
        elif "function" in it and isinstance(it["function"], dict):
            fn = it["function"]
            out.append({"name": fn.get("name"), "description": fn.get("description"),
                        "parameters": fn.get("parameters")})
        elif "parameters" in it or "name" in it:
            out.append({"name": it.get("name"), "description": it.get("description"),
                        "parameters": it.get("parameters")})
        elif it.get("type") == "object" and "properties" in it:
            out.append({"name": None, "description": None, "parameters": it})
        else:
            out.append({"name": it.get("name"), "description": it.get("description"),
                        "parameters": it.get("parameters")})
    return out


def scan_forbidden(node: Any, path: str, found: list[dict], hard: bool) -> None:
    if isinstance(node, dict):
        for k, v in node.items():
            if k in FORBIDDEN_KEYS:
                lvl = "ERROR" if hard else "WARN"
                found.append(_finding(
                    lvl, "forbidden_keyword",
                    f"`{k}` is poorly supported on small/open runtimes; inline and flatten",
                    f"{path}.{k}"))
            scan_forbidden(v, f"{path}.{k}", found, hard)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            scan_forbidden(v, f"{path}[{i}]", found, hard)


def schema_depth(node: Any, depth: int = 0) -> int:
    """Nesting depth of object/array property structures (top-level props = 1)."""
    if not isinstance(node, dict):
        return depth
    best = depth
    if node.get("type") == "object" and isinstance(node.get("properties"), dict):
        for v in node["properties"].values():
            best = max(best, schema_depth(v, depth + 1))
    if node.get("type") == "array" and isinstance(node.get("items"), dict):
        best = max(best, schema_depth(node["items"], depth + 1))
    return best


def analyze_tool(tool: dict, target: str) -> list[dict]:
    hard = target == "small"
    f: list[dict] = []
    name = tool.get("name")
    desc = tool.get("description")
    params = tool.get("parameters")

    # name
    if not name:
        f.append(_finding("WARN", "no_name", "tool has no name"))
    elif not NAME_RE.match(str(name)):
        f.append(_finding("WARN", "name_style",
                          f"'{name}': prefer snake_case, action-oriented (e.g. repo_search)"))

    # tool description
    if not desc or len(str(desc).strip()) < 20:
        f.append(_finding("WARN", "weak_tool_desc",
                          "tool description missing or very short; say what it does and when to use it"))

    if not isinstance(params, dict):
        f.append(_finding("WARN", "no_parameters", "no parameters schema present"))
        return f

    # forbidden keywords + depth
    scan_forbidden(params, "parameters", f, hard)
    depth = schema_depth(params)
    if depth > 2:
        lvl = "ERROR" if hard else "WARN"
        f.append(_finding(lvl, "deep_nesting",
                          f"nesting depth {depth} (>2); flatten — small models fill nested objects poorly"))

    props = params.get("properties")
    if not isinstance(props, dict) or not props:
        if params.get("type") == "object":
            f.append(_finding("INFO", "no_properties", "object schema with no properties"))
        return f

    required = params.get("required") or []
    if not isinstance(required, list):
        required = []

    # required hygiene
    unknown_req = [r for r in required if r not in props]
    for r in unknown_req:
        f.append(_finding("ERROR", "required_unknown",
                          f"'{r}' is in `required` but not in `properties`"))
    if not required:
        f.append(_finding("WARN", "no_required",
                          "no `required` declared — is every parameter really optional?"))
    elif len(required) == len(props) and len(props) > 1:
        f.append(_finding("WARN", "all_required",
                          "every parameter is required — usually too broad; give defaults where you can"))

    # additionalProperties
    if hard and params.get("additionalProperties", True) is not False:
        f.append(_finding("WARN", "open_object",
                          "consider `additionalProperties: false` so the model can't pass junk fields"))

    # per-property checks
    for pname, pschema in props.items():
        ppath = f"parameters.properties.{pname}"
        if not isinstance(pschema, dict):
            f.append(_finding("ERROR", "bad_property", f"'{pname}' is not a schema object", ppath))
            continue
        if not str(pschema.get("description", "")).strip():
            lvl = "ERROR" if hard else "WARN"
            f.append(_finding(lvl, "no_param_desc",
                              f"'{pname}' has no description; describe it and give an example value", ppath))
        ptype = pschema.get("type")
        has_enum = "enum" in pschema
        low = pname.lower()
        if (not has_enum and (ptype == "string" or ptype is None)
                and low in ENUM_CANDIDATE_NAMES and low not in FREE_TEXT_NAMES):
            f.append(_finding("WARN", "enum_candidate",
                              f"'{pname}' looks like a closed set — make it an `enum` instead of free text", ppath))
        if has_enum and not isinstance(pschema["enum"], list):
            f.append(_finding("ERROR", "bad_enum", f"'{pname}' has a non-list `enum`", ppath))

    return f


def main() -> int:
    ap = argparse.ArgumentParser(description="Lint tool/function schemas for agent-friendliness.")
    ap.add_argument("path", nargs="?", help="JSON file; reads stdin if omitted")
    ap.add_argument("--target", choices=["small", "frontier"], default="small",
                    help="small (default, strict) or frontier (lenient)")
    ap.add_argument("--max-tools", type=int, default=None,
                    help="warn if advertised tool count exceeds this")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    raw = open(args.path, encoding="utf-8").read() if args.path else sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"ERROR: input is not valid JSON: {e}", file=sys.stderr)
        return 1

    tools = load_tools(data)
    max_tools = args.max_tools or DEFAULT_MAX_TOOLS[args.target]

    report = []
    total = {"ERROR": 0, "WARN": 0, "INFO": 0}
    for i, tool in enumerate(tools):
        findings = analyze_tool(tool, args.target)
        for fd in findings:
            total[fd["level"]] += 1
        report.append({"tool": tool.get("name") or f"<tool #{i}>", "findings": findings})

    tool_count_finding = None
    if len(tools) > max_tools:
        tool_count_finding = _finding(
            "WARN", "too_many_tools",
            f"{len(tools)} tools advertised (> {max_tools}); small models pick worse "
            f"with large tool sets — hide rarely-used ones or use unadvertised aliases")
        total["WARN"] += 1

    if args.json:
        print(json.dumps({"target": args.target, "tool_count": len(tools),
                          "summary": total, "tools": report,
                          "tool_set": tool_count_finding}, indent=2))
    else:
        icon = {"ERROR": "✗", "WARN": "!", "INFO": "·"}
        print(f"Target: {args.target}   Tools: {len(tools)}")
        if tool_count_finding:
            print(f"  [{tool_count_finding['level']}] {tool_count_finding['msg']}")
        for entry in report:
            print(f"\n• {entry['tool']}")
            if not entry["findings"]:
                print("    ok — no issues")
            for fd in entry["findings"]:
                loc = f"  ({fd['path']})" if fd["path"] else ""
                print(f"    {icon[fd['level']]} [{fd['level']}] {fd['msg']}{loc}")
        print(f"\nSummary: {total['ERROR']} error(s), {total['WARN']} warning(s), "
              f"{total['INFO']} info")

    return 1 if total["ERROR"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
