from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.pipeline.competitor_radar import build_competitor_radar
from src.utils.io import write_json
from src.utils.time import BEIJING, beijing_label, now_utc, to_iso


def build_dashboard_data(
    joybuy_clusters: list[dict[str, Any]],
    normalized_posts: list[dict[str, Any]],
    output_dir: str,
    provider_hint: str | None = None,
    report_date: str | None = None,
    window_label: str | None = None,
    collection_status: dict[str, Any] | None = None,
) -> dict[str, Any]:
    target = Path(output_dir)
    target.mkdir(parents=True, exist_ok=True)
    current = now_utc()
    report_date = report_date or current.astimezone(BEIJING).strftime("%Y-%m-%d")
    competitor = build_competitor_radar(normalized_posts)
    fermentation_items = [cluster for cluster in joybuy_clusters if cluster.get("tracking_eligible")]
    high_risk = [cluster for cluster in joybuy_clusters if cluster["score"]["level"] in {"urgent", "high"}]
    negative = [cluster for cluster in joybuy_clusters if cluster["score"]["sentiment"] == "negative"]
    positive = [cluster for cluster in joybuy_clusters if cluster["score"]["sentiment"] == "positive"]
    joybuy_posts = [post for post in normalized_posts if post.get("brand") == "joybuy"]
    joybuy_effective_posts = [post for post in joybuy_posts if post.get("is_relevant")]

    overview = {
        "title": "Joybuy X Intelligence Radar",
        "generated_at": to_iso(current),
        "generated_at_label": beijing_label(current),
        "report_date": report_date,
        "report_window": "Past 24 hours",
        "window_label": window_label,
        "health": "normal",
        "metrics": {
            "effective_intelligence": len(joybuy_clusters),
            "high_risk": len(high_risk),
            "fermenting": sum(1 for item in fermentation_items if item["fermentation"]["status"] in {"升温中", "发酵中"}),
            "needs_review": sum(1 for item in joybuy_clusters if item["score"]["recommended_action"] in {"人工核查", "PR 准备回应", "高层同步"}),
            "joybuy_volume": len(joybuy_effective_posts),
            "joybuy_candidate_volume": len(joybuy_posts),
            "temu_volume": competitor["volume"],
            "negative_share": round(len(negative) / max(1, len(joybuy_clusters)) * 100),
        },
        "executive_summary": build_executive_summary(joybuy_clusters, competitor),
        "top_intelligence": [cluster_summary(cluster) for cluster in joybuy_clusters[:10]],
        "negative_top": [cluster_summary(cluster) for cluster in negative[:10]],
        "opportunity_top": [cluster_summary(cluster) for cluster in positive[:10]],
        "fermentation_snapshot": [cluster_summary(cluster) for cluster in fermentation_items[:8]],
        "competitor": competitor,
        "source_status": source_status(normalized_posts, provider_hint),
        "routes": {
            "daily": "dashboard-data/daily/latest.json",
            "fermentation": "dashboard-data/fermentation.json",
            "competitor": "dashboard-data/competitor.json",
            "source_status": "dashboard-data/source-status.json",
        },
    }

    daily = {
        "date": report_date,
        "generated_at": overview["generated_at"],
        "generated_at_label": overview["generated_at_label"],
        "window_label": window_label,
        "metrics": overview["metrics"],
        "source_status": overview["source_status"],
        "collection_status": collection_status or {},
        "executive_summary": overview["executive_summary"],
        "competitor": competitor,
        "summary_only": False,
        "clusters": [cluster_summary(cluster, include_posts=False) for cluster in joybuy_clusters],
    }
    fermentation = {
        "generated_at": overview["generated_at"],
        "items": [cluster_summary(cluster, include_posts=False) for cluster in fermentation_items],
    }

    write_json(str(target / "latest.json"), overview)
    write_json(str(target / "daily" / "latest.json"), daily)
    write_daily_history(target, daily)
    write_json(str(target / "fermentation.json"), fermentation)
    write_json(str(target / "competitor.json"), competitor)
    write_json(str(target / "source-status.json"), overview["source_status"])
    data_bundle = {
        "dashboard-data/latest.json": overview,
        "dashboard-data/daily/latest.json": daily,
        "dashboard-data/fermentation.json": fermentation,
        "dashboard-data/competitor.json": competitor,
        "dashboard-data/source-status.json": overview["source_status"],
        "clusters": {},
    }
    for path, payload in daily_history_files(target).items():
        data_bundle[path] = payload
    for cluster in joybuy_clusters:
        detail = cluster_detail(cluster)
        write_json(str(target / "clusters" / f"{cluster['cluster_id']}.json"), detail)
    write_data_bundle(target.parent / "dashboard-data-bundle.js", data_bundle)
    return overview


def write_daily_history(target: Path, current_daily: dict[str, Any]) -> None:
    daily_dir = target / "daily"
    daily_dir.mkdir(parents=True, exist_ok=True)
    records: dict[str, dict[str, Any]] = {}
    for record in load_existing_daily_records(daily_dir):
        records[record["date"]] = record
    records[current_daily["date"]] = current_daily

    for record in records.values():
        write_json(str(daily_dir / f"{record['date']}.json"), record)

    index = {
        "latest_date": current_daily["date"],
        "generated_at": current_daily["generated_at"],
        "items": [daily_index_item(record) for record in sorted(records.values(), key=lambda item: item["date"], reverse=True)],
    }
    write_json(str(daily_dir / "index.json"), index)


def load_existing_daily_records(daily_dir: Path) -> list[dict[str, Any]]:
    records = []
    for path in sorted(daily_dir.glob("*.json")):
        if path.name in {"latest.json", "index.json"}:
            continue
        try:
            with open(path, "r", encoding="utf-8") as file:
                record = json.load(file)
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(record, dict) and record.get("date"):
            records.append(record)
    return records


def daily_history_files(target: Path) -> dict[str, Any]:
    daily_dir = target / "daily"
    files: dict[str, Any] = {}
    for path in sorted(daily_dir.glob("*.json")):
        try:
            with open(path, "r", encoding="utf-8") as file:
                files[f"dashboard-data/daily/{path.name}"] = json.load(file)
        except (OSError, json.JSONDecodeError):
            continue
    return files


def daily_index_item(record: dict[str, Any]) -> dict[str, Any]:
    metrics = record.get("metrics", {})
    source_status = record.get("source_status", {})
    collection = record.get("collection_status", {})
    summary = record.get("executive_summary", {})
    clusters = record.get("clusters", [])
    top_cluster = clusters[0] if clusters else record.get("top_cluster", {})
    score = top_cluster.get("score", {})
    return {
        "date": record.get("date"),
        "generated_at_label": record.get("generated_at_label"),
        "window_label": record.get("window_label"),
        "title": top_cluster.get("title") or summary.get("headline") or "No meaningful Joybuy signal detected",
        "cluster_count": len(clusters) if clusters else metrics.get("effective_intelligence", 0),
        "joybuy_effective": source_status.get("brand_breakdown", {}).get("joybuy_effective", metrics.get("joybuy_volume", 0)),
        "temu_effective": source_status.get("brand_breakdown", {}).get("temu_effective", metrics.get("temu_volume", 0)),
        "high_risk": metrics.get("high_risk", 0),
        "needs_review": metrics.get("needs_review", 0),
        "collection_status": collection.get("status", "unknown"),
        "api_requests_used": collection.get("api_requests_used"),
        "max_api_requests": collection.get("max_api_requests"),
        "ips": score.get("ips"),
        "level": score.get("level"),
        "summary_only": bool(record.get("summary_only")),
    }


def write_data_bundle(path: Path, data: dict[str, Any]) -> None:
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as file:
        file.write("window.__DASHBOARD_DATA__ = ")
        file.write(payload.replace("</", "<\\/"))
        file.write(";\n")


def build_executive_summary(clusters: list[dict[str, Any]], competitor: dict[str, Any]) -> dict[str, str]:
    top = clusters[0] if clusters else None
    if not top:
        return {
            "headline": "No meaningful Joybuy signal detected today.",
            "risk": "Low",
            "action": "Continue monitoring.",
        }
    shared = "refund and delivery" if any(term["term"] in {"refund", "delivery"} for term in competitor["top_terms"]) else "general shopping experience"
    return {
        "headline": f"Today's highest-priority Joybuy signal is: {top['title']}.",
        "risk": f"Overall risk is {top['score']['level']} with IPS {top['score']['ips']}.",
        "action": f"Recommended action: {top['score']['recommended_action']}. Temu baseline shows overlap around {shared}.",
    }


def cluster_summary(cluster: dict[str, Any], include_posts: bool = False) -> dict[str, Any]:
    data = {
        "cluster_id": cluster["cluster_id"],
        "title": cluster["title"],
        "summary": cluster["summary"],
        "summary_zh": cluster["summary_zh"],
        "topic": cluster["topic"],
        "risk_types": cluster["risk_types"],
        "opportunity_types": cluster["opportunity_types"],
        "post_count": cluster["post_count"],
        "first_seen_at": cluster["first_seen_at"],
        "last_seen_at": cluster["last_seen_at"],
        "metrics": cluster["metrics"],
        "score": cluster["score"],
        "fermentation": cluster["fermentation"],
        "tracking_eligible": cluster["tracking_eligible"],
        "tracking_reason": cluster["tracking_reason"],
        "evidence_counts": {key: len(value) for key, value in cluster["evidence_chain"].items()},
    }
    if include_posts:
        data["posts"] = cluster["posts"]
    return data


def cluster_detail(cluster: dict[str, Any]) -> dict[str, Any]:
    return {
        **cluster_summary(cluster, include_posts=True),
        "evidence_chain": cluster["evidence_chain"],
        "score_explanation": cluster["score"]["explanation"],
    }


def source_status(posts: list[dict[str, Any]], provider_hint: str | None = None) -> dict[str, Any]:
    providers = sorted({post.get("source_provider", "unknown") for post in posts})
    if not providers and provider_hint:
        providers = [provider_hint]
    is_sample = providers == ["sample"]
    joybuy_posts = [post for post in posts if post.get("brand") == "joybuy"]
    temu_posts = [post for post in posts if post.get("brand") == "temu"]
    estimated_cost = 0
    if "twitterapi_io" in providers:
        estimated_cost = round(len(posts) * 0.00015, 4)
    return {
        "status": "normal",
        "providers": providers,
        "raw_posts_collected": len(posts),
        "effective_posts": sum(1 for post in posts if post.get("is_relevant")),
        "brand_breakdown": {
            "joybuy_candidates": len(joybuy_posts),
            "joybuy_effective": sum(1 for post in joybuy_posts if post.get("is_relevant")),
            "temu_candidates": len(temu_posts),
            "temu_effective": sum(1 for post in temu_posts if post.get("is_relevant")),
        },
        "estimated_cost_usd": estimated_cost,
        "notes": source_notes(is_sample),
    }


def source_notes(is_sample: bool) -> list[str]:
    base = [
        "Bookmarks are collected only when the data source provides them.",
        "Quote counts are treated as public propagation signals.",
    ]
    if is_sample:
        return [
            "Sample provider is active. Set X_SOURCE_PROVIDER=twitterapi_io to use real X data.",
            *base,
        ]
    return [
        "Real X data provider is active. Review daily cost and duplicate rate during bake-off.",
        *base,
    ]
