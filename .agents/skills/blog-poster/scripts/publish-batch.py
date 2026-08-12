#!/usr/bin/env python3
"""
publish-batch.py — Push TTML blog markdown files to the live site via REST API.

Stdlib only — no pip install needed.

Usage:
    python publish-batch.py FILE.md [FILE.md ...]
    python publish-batch.py --dir blog/ --today
    python publish-batch.py --dir blog/ --date 2026-05-25
    python publish-batch.py --json '{"slug":"x","title":"y","content":"z"}'

Blog directory lookup order (when --dir not given):
    1. TTML_BLOG_DIR environment variable
    2. ./blog (current working directory)
    3. ../blog (one level up — handy when invoked from scripts/)
    4. <repo-root>/blog (auto-detected by walking up from this script)
    5. ~/ttml-app-work/blog

Auth key lookup order:
    1. BLOG_PUBLISH_API_KEY environment variable
    2. TTML_PUBLISH_KEY_FILE environment variable (a path to a key file)
    3. ~/.ttml-publish-key
    4. .publish-key next to this script

Exits 0 only if every file returned 2xx.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = os.environ.get("TTML_PUBLISH_ENDPOINT", "https://talk-to-my-lawyer.com/api/blog/publish")


def _repo_root_from_script() -> Path | None:
    """Walk up from this file looking for a .git directory."""
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / ".git").is_dir():
            return parent
    return None


def candidate_blog_dirs() -> list[Path]:
    out: list[Path] = []
    if env_dir := os.environ.get("TTML_BLOG_DIR", "").strip():
        out.append(Path(env_dir))
    out.append(Path.cwd() / "blog")
    out.append(Path.cwd().parent / "blog")
    if repo := _repo_root_from_script():
        out.append(repo / "blog")
    out.append(Path.home() / "ttml-app-work" / "blog")
    # Dedupe while preserving order
    seen = set()
    uniq = []
    for p in out:
        rp = p.resolve()
        if rp not in seen:
            seen.add(rp)
            uniq.append(p)
    return uniq


def candidate_key_files() -> list[Path]:
    out: list[Path] = []
    if env_file := os.environ.get("TTML_PUBLISH_KEY_FILE", "").strip():
        out.append(Path(env_file))
    out.append(Path.home() / ".ttml-publish-key")
    out.append(Path(__file__).resolve().parent / ".publish-key")
    return out


def load_key() -> str:
    if k := os.environ.get("BLOG_PUBLISH_API_KEY", "").strip():
        return k
    for p in candidate_key_files():
        if p.is_file():
            key = p.read_text(encoding="utf-8").strip()
            if key:
                return key
    sys.exit(
        "ERROR: no API key. Set BLOG_PUBLISH_API_KEY env var, "
        "or set TTML_PUBLISH_KEY_FILE to a file path, "
        "or create ~/.ttml-publish-key."
    )


def find_blog_dir(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit).resolve()
        if not p.is_dir():
            sys.exit(f"ERROR: --dir not found: {p}")
        return p
    for p in candidate_blog_dirs():
        if p.is_dir():
            return p
    sys.exit(
        "ERROR: no blog directory found. Tried:\n  "
        + "\n  ".join(str(p) for p in candidate_blog_dirs())
        + "\nPass --dir explicitly or set TTML_BLOG_DIR."
    )


def resolve_files(args: argparse.Namespace) -> list[Path]:
    if args.files:
        out = []
        for f in args.files:
            p = Path(f).resolve()
            if not p.is_file():
                sys.exit(f"ERROR: not a file: {p}")
            out.append(p)
        return out

    blog_dir = find_blog_dir(args.dir)

    if args.today:
        date_str = dt.date.today().strftime("%Y-%m-%d")
    elif args.date:
        date_str = args.date
    else:
        all_md = sorted(blog_dir.glob("*.md"))
        if not all_md:
            sys.exit(f"ERROR: no .md files in {blog_dir}")
        sys.exit(
            f"ERROR: pass --today, --date YYYY-MM-DD, or explicit file paths.\n"
            f"Found {len(all_md)} .md files in {blog_dir}. Most recent:\n  "
            + "\n  ".join(p.name for p in all_md[-10:])
        )

    matches = sorted(blog_dir.glob(f"{date_str}-*.md"))
    if not matches:
        all_md = sorted(blog_dir.glob("*.md"))
        recent = sorted({p.name[:10] for p in all_md if len(p.name) >= 10})[-7:]
        sys.exit(
            f"ERROR: no files match {date_str}-*.md in {blog_dir}\n"
            f"Recent dates available: {', '.join(recent)}"
        )
    return matches


def publish_markdown(path: Path, key: str, timeout: int) -> tuple[int, str]:
    body = path.read_bytes()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Content-Type": "text/markdown",
            "Authorization": f"Bearer {key}",
            "User-Agent": "ttml-publish-batch/1.0",
        },
    )
    return _call(req, timeout)


def publish_json(payload: dict, key: str, timeout: int) -> tuple[int, str]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "User-Agent": "ttml-publish-batch/1.0",
        },
    )
    return _call(req, timeout)


def _call(req: urllib.request.Request, timeout: int) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError) as e:
        return 0, f"network error: {e}"


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Publish TTML blog posts via REST API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("files", nargs="*", help="markdown files to publish")
    ap.add_argument("--dir", help="blog directory (auto-detected if omitted)")
    ap.add_argument("--date", help="date prefix YYYY-MM-DD")
    ap.add_argument("--today", action="store_true", help="shortcut for --date today")
    ap.add_argument("--json", help="publish a single inline JSON payload")
    ap.add_argument("--timeout", type=int, default=30)
    args = ap.parse_args()

    key = load_key()

    if args.json:
        try:
            payload = json.loads(args.json)
        except json