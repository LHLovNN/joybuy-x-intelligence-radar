#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "dashboard-data"


def load(path: Path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def main() -> None:
    latest = load(DATA / "latest.json")
    daily = load(DATA / "daily" / "latest.json")
    fermentation = load(DATA / "fermentation.json")
    competitor = load(DATA / "competitor.json")
    source = load(DATA / "source-status.json")
    providers = set(source.get("providers", []))
    is_sample = providers == {"sample"}
    bundle_path = ROOT / "public" / "dashboard-data-bundle.js"
    assert_true(bundle_path.exists(), "dashboard-data-bundle.js should exist for file:// preview")

    clusters = daily.get("clusters", [])
    assert_true(clusters, "daily clusters should not be empty")
    assert_true(latest["metrics"]["effective_intelligence"] == len(clusters), "effective intelligence metric mismatch")
    assert_true(source["status"] == "normal", "source status should be normal for sample data")
    assert_true(source["raw_posts_collected"] >= source["effective_posts"], "raw posts should be >= effective posts")

    tracked = [cluster for cluster in clusters if cluster.get("tracking_eligible")]
    assert_true(len(fermentation["items"]) == len(tracked), "fermentation tracked count mismatch")
    if is_sample:
        assert_true(any(cluster["score"]["sentiment"] == "positive" for cluster in clusters), "expected at least one positive opportunity cluster")
        assert_true(any(cluster["score"]["level"] in {"urgent", "high"} for cluster in clusters), "expected high risk clusters")

    for cluster in clusters:
        cluster_id = cluster["cluster_id"]
        detail_path = DATA / "clusters" / f"{cluster_id}.json"
        assert_true(detail_path.exists(), f"missing detail file for {cluster_id}")
        detail = load(detail_path)
        assert_true(detail["score"]["ips"] == cluster["score"]["ips"], f"detail score mismatch for {cluster_id}")
        assert_true("evidence_chain" in detail, f"missing evidence chain for {cluster_id}")
        for key, count in detail["evidence_counts"].items():
            assert_true(len(detail["evidence_chain"].get(key, [])) == count, f"evidence count mismatch for {cluster_id}:{key}")
        assert_true("total_quotes" in detail["metrics"], f"missing quote metric for {cluster_id}")
        assert_true("total_bookmarks" in detail["metrics"], f"missing bookmark metric for {cluster_id}")

    competitor_total = sum(competitor["sentiment"].values())
    assert_true(competitor_total == competitor["volume"], "competitor sentiment total mismatch")
    assert_true(competitor["top_posts"], "competitor top posts should not be empty")

    print("Dashboard data verification passed.")
    print(f"Providers: {', '.join(sorted(providers))}")
    print(f"Clusters: {len(clusters)}")
    print(f"Tracked: {len(tracked)}")
    print(f"Temu posts: {competitor['volume']}")


if __name__ == "__main__":
    main()
