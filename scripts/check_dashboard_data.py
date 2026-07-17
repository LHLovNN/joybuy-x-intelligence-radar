#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    ROOT / "public" / "index.html",
    ROOT / "public" / "dashboard-data-bundle.js",
    ROOT / "public" / "assets" / "app.js",
    ROOT / "public" / "assets" / "styles.css",
    ROOT / "public" / "dashboard-data" / "latest.json",
    ROOT / "public" / "dashboard-data" / "daily" / "latest.json",
    ROOT / "public" / "dashboard-data" / "fermentation.json",
    ROOT / "public" / "dashboard-data" / "competitor.json",
    ROOT / "public" / "dashboard-data" / "source-status.json",
]


def main() -> None:
    missing = [str(path.relative_to(ROOT)) for path in REQUIRED if not path.exists()]
    if missing:
        print("Missing required files:")
        for item in missing:
            print(f"- {item}")
        sys.exit(1)
    print("Dashboard files are present.")


if __name__ == "__main__":
    main()
