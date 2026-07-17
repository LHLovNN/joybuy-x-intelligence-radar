#!/usr/bin/env python3
import math
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.adapters.provider_factory import get_x_source
from src.pipeline.clusterer import cluster_posts
from src.pipeline.dashboard_builder import build_dashboard_data
from src.pipeline.evidence_chain import attach_evidence_chains
from src.pipeline.fermentation import update_fermentation
from src.pipeline.normalizer import normalize_posts
from src.pipeline.query_builder import build_x_search_queries
from src.pipeline.scoring import score_clusters
from src.utils.io import read_json, write_json, write_jsonl
from src.utils.time import beijing_daily_window, beijing_label, now_utc, to_iso


def selected_provider(source_config: dict[str, Any]) -> str:
    explicit = os.getenv("X_SOURCE_PROVIDER")
    if explicit:
        return explicit
    if os.getenv("TWITTERAPI_IO_KEY"):
        return "twitterapi_io"
    return source_config["x_sources"]["primary"]


def limit_from_env(name: str, fallback: int) -> int:
    raw = os.getenv(name)
    if not raw:
        return fallback
    try:
        return max(0, int(raw))
    except ValueError:
        return fallback


def collect_real_posts(x_source: Any, keyword_config: dict[str, Any], source_config: dict[str, Any]) -> list[dict[str, Any]]:
    start, end = beijing_daily_window(now_utc())
    limits = source_config["limits"]
    brand_limits = {
        "joybuy": limit_from_env("X_JOYBUY_DAILY_LIMIT", limits["max_joybuy_posts_per_day"]),
        "temu": limit_from_env("X_TEMU_DAILY_LIMIT", limits["max_temu_posts_per_day"]),
    }
    raw_posts: list[dict[str, Any]] = []
    seen: dict[str, dict[str, Any]] = {}

    for brand_key in ("joybuy", "temu"):
        brand_limit = brand_limits.get(brand_key, 0)
        if brand_limit <= 0:
            continue
        queries = build_x_search_queries(keyword_config, brand_key)
        per_query_limit = max(1, math.ceil(brand_limit / len(queries)))
        for query in queries:
            posts = x_source.search_posts(query, to_iso(start), to_iso(end), per_query_limit)
            for post in posts:
                enriched = {**post, "brand_candidate": brand_key}
                post_id = enriched["post_id"]
                existing = seen.get(post_id)
                if existing and existing.get("brand_candidate") == "joybuy":
                    continue
                if existing and brand_key != "joybuy":
                    continue
                seen[post_id] = enriched

    raw_posts = list(seen.values())
    max_total = limit_from_env("X_DAILY_LIMIT", limits["max_posts_per_day"])
    return raw_posts[:max_total]


def main() -> None:
    keyword_config = read_json(str(ROOT / "config" / "keywords.json"))
    scoring_config = read_json(str(ROOT / "config" / "scoring.json"))
    source_config = read_json(str(ROOT / "config" / "sources.json"))
    provider = selected_provider(source_config)
    x_source = get_x_source(provider)
    if hasattr(x_source, "all_posts"):
        raw_posts = x_source.all_posts()
    else:
        raw_posts = collect_real_posts(x_source, keyword_config, source_config)
    normalized = normalize_posts(raw_posts, keyword_config)
    joybuy_clusters = cluster_posts(normalized, "joybuy")
    joybuy_clusters = score_clusters(joybuy_clusters, scoring_config)
    joybuy_clusters = attach_evidence_chains(joybuy_clusters)
    joybuy_clusters = update_fermentation(joybuy_clusters)

    start, end = beijing_daily_window(now_utc())
    today = end.astimezone().strftime("%Y-%m-%d")

    write_jsonl(str(ROOT / "data" / "raw" / "x" / f"{provider}-posts.jsonl"), raw_posts)
    write_jsonl(str(ROOT / "data" / "processed" / "normalized-posts.jsonl"), normalized)
    write_json(str(ROOT / "data" / "clusters" / "joybuy-clusters.json"), joybuy_clusters)

    overview = build_dashboard_data(
        joybuy_clusters,
        normalized,
        str(ROOT / "public" / "dashboard-data"),
    )
    run_log = {
        "status": "ok",
        "generated_at": to_iso(now_utc()),
        "window_start": to_iso(start),
        "window_end": to_iso(end),
        "window_label": f"{beijing_label(start)} - {beijing_label(end)}",
        "provider": provider,
        "raw_posts": len(raw_posts),
        "normalized_posts": len(normalized),
        "joybuy_clusters": len(joybuy_clusters),
        "dashboard_metrics": overview["metrics"],
    }
    write_json(str(ROOT / "data" / "logs" / f"daily-{today}.json"), run_log)
    print(f"Generated dashboard data: {overview['generated_at_label']}")
    print(f"Joybuy clusters: {len(joybuy_clusters)}")
    print(f"Raw posts: {len(raw_posts)}")


if __name__ == "__main__":
    main()
