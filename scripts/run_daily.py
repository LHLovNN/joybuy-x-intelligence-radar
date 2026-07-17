#!/usr/bin/env python3
from __future__ import annotations

import math
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.adapters.x_source_base import ProviderBudgetExceeded
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


def optional_limit_from_env(name: str, fallback: int | None) -> int | None:
    raw = os.getenv(name)
    if not raw:
        return fallback
    try:
        value = int(raw)
    except ValueError:
        return fallback
    if value < 0:
        return fallback
    return value


def apply_runtime_limits(x_source: Any, source_config: dict[str, Any]) -> dict[str, Any]:
    limits = source_config["limits"]
    max_api_requests = optional_limit_from_env("X_MAX_API_REQUESTS", limits.get("max_x_api_requests_per_run"))
    if hasattr(x_source, "max_requests_per_run"):
        x_source.max_requests_per_run = max_api_requests
    return {
        "max_api_requests": max_api_requests,
    }


def source_request_stats(x_source: Any) -> dict[str, Any]:
    return {
        "api_requests_used": getattr(x_source, "requests_used", None),
        "max_api_requests": getattr(x_source, "max_requests_per_run", None),
        "request_budget_exhausted": bool(getattr(x_source, "request_budget_exhausted", False)),
    }


def collect_real_posts(
    x_source: Any,
    keyword_config: dict[str, Any],
    source_config: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    start, end = beijing_daily_window(now_utc())
    limits = source_config["limits"]
    brand_limits = {
        "joybuy": limit_from_env("X_JOYBUY_DAILY_LIMIT", limits["max_joybuy_posts_per_day"]),
        "temu": limit_from_env("X_TEMU_DAILY_LIMIT", limits["max_temu_posts_per_day"]),
    }
    raw_posts: list[dict[str, Any]] = []
    seen: dict[str, dict[str, Any]] = {}
    warnings: list[str] = []
    stopped_early = False

    for brand_key in ("joybuy", "temu"):
        if stopped_early:
            break
        brand_limit = brand_limits.get(brand_key, 0)
        if brand_limit <= 0:
            continue
        queries = build_x_search_queries(keyword_config, brand_key)
        per_query_limit = max(1, math.ceil(brand_limit / len(queries)))
        for query in queries:
            try:
                posts = x_source.search_posts(query, to_iso(start), to_iso(end), per_query_limit)
            except ProviderBudgetExceeded as error:
                warnings.append(str(error))
                stopped_early = True
                break
            except RuntimeError as error:
                warnings.append(f"Provider collection stopped after error: {str(error)[:240]}")
                stopped_early = True
                break
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
    raw_posts = raw_posts[:max_total]
    request_stats = source_request_stats(x_source)
    return raw_posts, {
        "status": "partial" if warnings or request_stats["request_budget_exhausted"] else "complete",
        "warnings": warnings,
        "limits": {
            "max_posts": max_total,
            "max_joybuy_posts": brand_limits["joybuy"],
            "max_temu_posts": brand_limits["temu"],
            "max_api_requests": request_stats["max_api_requests"],
        },
        **request_stats,
    }


def main() -> None:
    keyword_config = read_json(str(ROOT / "config" / "keywords.json"))
    scoring_config = read_json(str(ROOT / "config" / "scoring.json"))
    source_config = read_json(str(ROOT / "config" / "sources.json"))
    provider = selected_provider(source_config)
    x_source = get_x_source(provider)
    runtime_limits = apply_runtime_limits(x_source, source_config)
    if hasattr(x_source, "all_posts"):
        raw_posts = x_source.all_posts()
        collection_status = {
            "status": "sample",
            "warnings": [],
            "limits": runtime_limits,
            "api_requests_used": 0,
            "max_api_requests": runtime_limits["max_api_requests"],
            "request_budget_exhausted": False,
        }
    else:
        raw_posts, collection_status = collect_real_posts(x_source, keyword_config, source_config)
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
        provider_hint=provider,
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
        "collection_status": collection_status,
        "dashboard_metrics": overview["metrics"],
    }
    write_json(str(ROOT / "public" / "dashboard-data" / "run-status.json"), run_log)
    write_json(str(ROOT / "data" / "logs" / f"daily-{today}.json"), run_log)
    print(f"Generated dashboard data: {overview['generated_at_label']}")
    print(f"Joybuy clusters: {len(joybuy_clusters)}")
    print(f"Raw posts: {len(raw_posts)}")
    print(f"Collection status: {collection_status['status']}")
    if collection_status.get("warnings"):
        print(f"Collection warnings: {len(collection_status['warnings'])}")


if __name__ == "__main__":
    main()
