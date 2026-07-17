#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SKIP_DIRS = {
    ".git",
    ".venv",
    ".pycache",
    "__pycache__",
    "node_modules",
    "data",
    "public/dashboard-data",
}

ALLOWLIST_PATTERNS = [
    "paste-your-key-here",
    "TWITTERAPI_IO_KEY",
    "XPOZ_API_KEY",
    "APIFY_TOKEN",
    "AISA_API_KEY",
    "TAVILY_API_KEY",
    "PERPLEXITY_API_KEY",
    "OPENAI_API_KEY",
    "${{ secrets.",
    "X-API-Key",
]

SECRET_PATTERNS = {
    "openai_key": re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    "github_token": re.compile(r"(ghp|github_pat)_[A-Za-z0-9_]{20,}"),
    "bearer_token": re.compile(r"Bearer\s+[A-Za-z0-9._-]{24,}"),
    "private_key": re.compile(r"-----BEGIN (RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY-----"),
    "long_assignment": re.compile(
        r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*[\"']?[A-Za-z0-9_./+=-]{24,}"
    ),
}


def should_skip(path: Path) -> bool:
    relative = path.relative_to(ROOT).as_posix()
    return any(relative == item or relative.startswith(f"{item}/") for item in SKIP_DIRS)


def is_allowlisted(line: str) -> bool:
    return any(pattern in line for pattern in ALLOWLIST_PATTERNS)


def scan_file(path: Path) -> list[str]:
    findings: list[str] = []
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return findings

    for index, line in enumerate(text.splitlines(), start=1):
        if is_allowlisted(line):
            continue
        for name, pattern in SECRET_PATTERNS.items():
            if pattern.search(line):
                findings.append(f"{path.relative_to(ROOT)}:{index}: possible {name}")
    return findings


def main() -> None:
    findings: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or should_skip(path):
            continue
        findings.extend(scan_file(path))

    if findings:
        print("Potential secrets found:")
        for finding in findings:
            print(f"- {finding}")
        sys.exit(1)

    print("Security check passed: no obvious secrets found in tracked source paths.")


if __name__ == "__main__":
    main()
