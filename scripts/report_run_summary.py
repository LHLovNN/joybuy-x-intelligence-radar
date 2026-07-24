#!/usr/bin/env python3
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "dashboard-data"


def load(path: Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def load_optional(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return load(path)


def format_top_signal(signals: list[dict[str, Any]]) -> str:
    if not signals:
        return "none"
    top = signals[0]
    score = top.get("score", {})
    return (
        f"IPS {score.get('ips', 'n/a')} | "
        f"{score.get('level', 'n/a')} | "
        f"{top.get('title', 'Untitled')}"
    )


def main() -> None:
    latest = load(DATA / "latest.json")
    daily = load(DATA / "daily" / "latest.json")
    daily_index = load_optional(DATA / "daily" / "index.json")
    source = load(DATA / "source-status.json")
    competitor = load(DATA / "competitor.json")
    run_status = load_optional(DATA / "run-status.json")
    collection_status = run_status.get("collection_status", {})
    metrics = latest.get("metrics", {})
    breakdown = source.get("brand_breakdown", {})
    signals = daily.get("clusters", [])
    primary_candidates = breakdown.get("primary_candidates", breakdown.get("joybuy_candidates", 0))
    primary_effective = breakdown.get("primary_effective", breakdown.get("joybuy_effective", 0))
    competitor_candidates = breakdown.get("competitor_candidates", breakdown.get("temu_candidates", 0))
    competitor_effective = breakdown.get("competitor_effective", breakdown.get("temu_effective", 0))
    competitor_volume = metrics.get("competitor_volume", metrics.get("temu_volume", competitor.get("volume", 0)))

    print("Daily report summary")
    print(f"- Generated: {latest.get('generated_at_label', latest.get('generated_at', 'unknown'))}")
    print(f"- Data mode: {source.get('status', 'unknown')}")
    print(f"- Collection status: {collection_status.get('status', 'unknown')}")
    translation = collection_status.get("translation") or run_status.get("translation_status") or source.get("translation") or {}
    if translation:
        print(f"- Translation missing: {translation.get('missing_count', 0)}")
        print(f"- Translation fallback original: {translation.get('fallback_original_count', translation.get('missing_count', 0))}")
    print(f"- Raw posts collected: {source.get('raw_posts_collected', 0)}")
    print(f"- Effective posts: {source.get('effective_posts', 0)}")
    print(f"- Primary candidates/effective: {primary_candidates}/{primary_effective}")
    print(f"- Competitor candidates/effective: {competitor_candidates}/{competitor_effective}")
    print(f"- Primary signals: {len(signals)}")
    print(f"- High risk signals: {metrics.get('high_risk', 0)}")
    print(f"- Needs review: {metrics.get('needs_review', 0)}")
    print(f"- Top signal: {format_top_signal(signals)}")
    print(f"- Competitor baseline volume: {competitor_volume}")
    print(f"- Daily archive days: {len(daily_index.get('items', []))}")
    for warning in collection_status.get("warnings", [])[:3]:
        print(f"- Collection warning: {warning}")


if __name__ == "__main__":
    main()
