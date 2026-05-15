#!/usr/bin/env python3
"""Voice lint. Catches banned phrases + structural AI-voice tells.

Advisory: prints offenses, exits non-zero on hits. Wire into CI as a check, not a gate.
Voice spec: C:/Users/Vignesh/.claude/plans/codex-briefs/voice-spec.md (private)

Per-line allowlist: append `voice_lint:allow <label>` in a comment on the same
line to suppress one label. Multiple labels: `voice_lint:allow label1 label2`.
The label `all` suppresses every rule on that line.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Force UTF-8 on stdout/stderr so non-ASCII chars (ε, em-dash, smart quotes)
# don't crash the lint on Windows cp1252 consoles.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, ValueError):
        pass

# Banned phrases. Word-boundary, case-insensitive.
# Drawn from the voice spec's "what to avoid" list.
BANNED = [
    "leverage",
    "leverages",
    "leveraging",
    "demonstrates",
    "demonstrate",
    "production-grade",
    "comprehensive",
    "portfolio-grade",
    "synergy",
    "enables",
    "enabling",
    "best-in-class",
    "state-of-the-art",
    "seamlessly",
    "cutting-edge",
    "robust solution",
    "industry-leading",
    "world-class",
    "next-generation",
]

# Structural AI-voice tells. Each is (label, regex). The label appears in the
# lint output so authors can tell why each line tripped and what to allowlist.
STRUCTURAL: list[tuple[str, re.Pattern[str]]] = [
    # "X is not Y. It is Z." / "X isn't Y. It's Z." / "X isn't Y. There's Z."
    # — assertive antithetical reversal across a sentence boundary. Catches
    # uncontracted ("is not") and contracted ("isn't") negation forms.
    (
        "antithetical-period",
        re.compile(
            r"\b(?:isn['’]t|aren['’]t|wasn['’]t|weren['’]t|is\s+not|are\s+not|was\s+not|were\s+not)\b"
            r"[^.!?\n]{1,80}[.!?]\s*"
            r"(?:"
            r"(?:it|they|that|this|there|here)\s+(?:is|are)"
            r"|(?:it|that|this|there|here)['’]s"
            r"|(?:they|we|you)['’]re"
            r")\b",
            re.IGNORECASE,
        ),
    ),
    # "X isn't Y — Y is Z" / "X is not Y; it is Z" — antithetical reversal
    # across em-dash or semicolon. Requires a negation form on the left and
    # a positive copula on the right. Without that constraint we false-
    # positive on every parenthetical em-dash that follows a copula verb.
    (
        "antithetical-dash",
        re.compile(
            r"\b(?:isn['’]t|aren['’]t|wasn['’]t|weren['’]t|is\s+not|are\s+not|was\s+not|were\s+not)\b"
            r"[^.!?\n]{1,80}"
            r"(?:[—–]|&mdash;|&ndash;|;\s|--)"
            r"\s*[^.!?\n]{1,80}"
            r"(?:\b(?:is|are|was|were)\b|(?:it|they|that|this|there|here)['’]s|(?:they|we|you)['’]re)",
            re.IGNORECASE,
        ),
    ),
    # "The point is/isn't ..." — usually the setup for a reversal
    (
        "the-point-is",
        re.compile(r"\bthe\s+point\s+(?:is|isn['’]t|is\s+not)\b", re.IGNORECASE),
    ),
    # "Not just X, but Y" — softer reversal in the same family
    (
        "not-just-but",
        re.compile(r"\bnot\s+just\b[^.!?\n]{1,60}\bbut\b", re.IGNORECASE),
    ),
    # "More than just X" — same family
    ("more-than-just", re.compile(r"\bmore\s+than\s+just\b", re.IGNORECASE)),
    # "It's about X" — common AI opener for a redefinition; flag for review
    (
        "its-about",
        re.compile(r"\b(?:it['’]s|it\s+is)\s+about\b", re.IGNORECASE),
    ),
]

ALLOWLIST_RE = re.compile(r"voice_lint:allow\s+([A-Za-z0-9\-_ ]+)")

# Files to scan. Lab-specific: user-facing TSX/TS data files only. Internal
# model code (algorithm tables, math constants) is excluded so the structural
# regexes don't false-positive on incidental `isn't` / `it's` constructions
# inside code or string templates.
TARGETS = [
    "web/src/data/scenarios.ts",
    "web/src/data/story.ts",
    "web/src/data/agents.ts",
    "web/src/data/arc.ts",
    "web/src/data/glossary.ts",
    "web/src/data/strategies.ts",
    "web/src/App.tsx",
    "web/src/components/*.tsx",
    "web/src/surfaces/**/*.tsx",
    "web/src/model/simulation.ts",
    "web/src/model/decoys.ts",
    "README.md",
]

# Skip generated / dependency directories.
SKIP_DIRS = {"node_modules", "dist", ".astro", ".git", "_legacy"}


def iter_files(root: Path, targets: list[str]) -> list[Path]:
    files: list[Path] = []
    for pattern in targets:
        for p in root.glob(pattern):
            if any(part in SKIP_DIRS for part in p.parts):
                continue
            if p.is_file():
                files.append(p)
    return sorted(set(files))


def line_allowlist(line: str) -> set[str]:
    """Labels suppressed for this specific line via `voice_lint:allow <label>`."""
    match = ALLOWLIST_RE.search(line)
    if not match:
        return set()
    return {label.strip() for label in match.group(1).split() if label.strip()}


def scan(
    path: Path,
    banned_patterns: list[re.Pattern[str]],
    structural: list[tuple[str, re.Pattern[str]]],
    filter_label: str | None = None,
) -> list[tuple[int, str, str]]:
    """Return list of (line_no, label, line_text)."""
    offenses: list[tuple[int, str, str]] = []
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return offenses
    for i, line in enumerate(text.splitlines(), start=1):
        allowed = line_allowlist(line)
        if "all" in allowed:
            continue
        # banned single-token offenses use the matched word as their label
        for pat in banned_patterns:
            m = pat.search(line)
            if m:
                label = f"banned-{m.group(0).lower()}"
                if filter_label and filter_label != label:
                    continue
                offenses.append((i, label, line.strip()))
        # structural patterns use their explicit label
        for label, pat in structural:
            if filter_label and filter_label != label:
                continue
            if label in allowed:
                continue
            m = pat.search(line)
            if m:
                offenses.append((i, label, line.strip()))
    return offenses


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="voice_lint", description="voice-tell lint")
    parser.add_argument(
        "--root", type=Path, default=ROOT, help="repo root to scan (default: athena-site)"
    )
    parser.add_argument(
        "--label",
        type=str,
        default=None,
        help="filter output to a single label (e.g. antithetical-dash)",
    )
    parser.add_argument(
        "--target",
        action="append",
        dest="targets",
        default=None,
        help="override TARGETS glob; repeat to add multiple",
    )
    args = parser.parse_args(argv)
    root = args.root.resolve()
    targets = args.targets if args.targets else TARGETS
    banned_patterns = [
        re.compile(rf"\b{re.escape(p)}\b", re.IGNORECASE) for p in BANNED
    ]
    files = iter_files(root, targets)
    total = 0
    for f in files:
        offenses = scan(f, banned_patterns, STRUCTURAL, filter_label=args.label)
        for line_no, label, line_text in offenses:
            rel = f.relative_to(root).as_posix()
            # truncate line_text in the output so essay paragraphs don't dump
            snippet = line_text if len(line_text) <= 200 else line_text[:200] + "…"
            print(f"{rel}:{line_no}: {label} -> {snippet}")
            total += 1
    suffix = f" (filtered by label={args.label!r})" if args.label else ""
    if total:
        print(
            f"\nvoice-lint: {total} offense(s) across {len(files)} file(s) scanned{suffix}.",
            file=sys.stderr,
        )
        return 1
    print(
        f"voice-lint: clean. {len(files)} file(s) scanned{suffix}.", file=sys.stderr
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
