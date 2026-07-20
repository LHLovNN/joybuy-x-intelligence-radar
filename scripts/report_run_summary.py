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


def format_top_cluster(clusters: list[dict[str, Any]]) -> str:
    if not clusters:
        return "none"
    top = clusters[0]
    score = top.get("score", {})
    return (
        f"{top.get('cluster_id', 'unknown')} | "
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
    clusters = daily.get("clusters", [])
    providers = source.get("providers") or [run_status.get("provider", "unknown")]

    print("Daily report summary")
    print(f"- Generated: {latest.get('generated_at_label', latest.get('generated_at', 'unknown'))}")
    print(f"- Providers: {', '.join(providers)}")
    print(f"- Collection status: {collection_status.get('status', 'unknown')}")
    if collection_status:
        print(
            "- API requests used/cap: "
            f"{collection_status.get('api_requests_used', 'n/a')}/"
            f"{collection_status.get('max_api_requests', 'n/a')}"
        )
    print(f"- Raw posts collected: {source.get('raw_posts_collected', 0)}")
    print(f"- Effective posts: {source.get('effective_posts', 0)}")
    print(f"- Joybuy candidates/effective: {breakdown.get('joybuy_candidates', 0)}/{breakdown.get('joybuy_effective', 0)}")
    print(f"- Temu candidates/effective: {breakdown.get('temu_candidates', 0)}/{breakdown.get('temu_effective', 0)}")
    print(f"- Joybuy clusters: {len(clusters)}")
    print(f"- High risk clusters: {metrics.get('high_risk', 0)}")
    print(f"- Needs review: {metrics.get('needs_review', 0)}")
    print(f"- Fermenting: {metrics.get('fermenting', 0)}")
    print(f"- Top cluster: {format_top_cluster(clusters)}")
    print(f"- Temu baseline volume: {competitor.get('volume', 0)}")
    print(f"- Estimated source cost USD: {source.get('estimated_cost_usd', 0)}")
    print(f"- Daily archive days: {len(daily_index.get('items', []))}")
    for warning in collection_status.get("warnings", [])[:3]:
        print(f"- Collection warning: {warning}")


if __name__ == "__main__":
    main()
