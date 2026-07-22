from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.pipeline.competitor_radar import build_competitor_radar
from src.utils.io import write_json
from src.utils.time import BEIJING, beijing_label, now_utc, to_iso


FEATURED_IPS_THRESHOLD = 70


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
    source = source_status(normalized_posts, provider_hint)
    featured_items = build_featured_items(joybuy_clusters, competitor)
    hot_topics = build_hot_topics(joybuy_clusters, featured_items)

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
        "featured_items": featured_items,
        "hot_topics": hot_topics,
        "competitor": competitor,
        "source_status": source,
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
        "featured_items": featured_items,
        "hot_topics": hot_topics,
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
        data_bundle["clusters"][f"dashboard-data/clusters/{cluster['cluster_id']}.json"] = detail
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


def build_featured_items(joybuy_clusters: list[dict[str, Any]], competitor: dict[str, Any]) -> list[dict[str, Any]]:
    items = [featured_item_for_cluster(cluster) for cluster in joybuy_clusters if is_featured_cluster(cluster)]
    items = [item for item in items if item]
    items.extend(featured_item_for_competitor_post(post) for post in competitor.get("top_posts", []) if is_featured_competitor_post(post))
    return sorted([item for item in items if item], key=featured_sort_key, reverse=True)[:18]


def is_featured_cluster(cluster: dict[str, Any]) -> bool:
    score = cluster.get("score", {})
    return (
        score.get("ips", 0) >= FEATURED_IPS_THRESHOLD
        or score.get("level") in {"urgent", "high"}
        or score.get("future_potential", 0) >= 75
        or score.get("current_impact", 0) >= 70
        or cluster.get("metrics", {}).get("max_author_followers", 0) >= 20_000
    )


def is_featured_competitor_post(post: dict[str, Any]) -> bool:
    metrics = post.get("metrics", {})
    interactions = public_interactions(metrics)
    return post.get("sentiment") == "negative" and interactions >= 30


def featured_item_for_cluster(cluster: dict[str, Any]) -> dict[str, Any] | None:
    post = representative_post(cluster)
    if not post:
        return None
    score = cluster.get("score", {})
    return {
        "id": f"featured-{cluster['cluster_id']}",
        "brand": cluster.get("brand", "joybuy"),
        "cluster_id": cluster["cluster_id"],
        "source_type": "X 舆情",
        "source_name": source_name_for_post(post, "Joybuy / JD"),
        "author_name": post.get("author", {}).get("name") or post.get("author_name") or post.get("author_handle"),
        "author_handle": post.get("author", {}).get("handle") or post.get("author_handle"),
        "author_avatar_url": post.get("author", {}).get("avatar_url") or post.get("author_avatar_url"),
        "author_followers": post.get("author", {}).get("followers", post.get("author_followers", 0)),
        "author_verified": post.get("author", {}).get("verified", post.get("author_verified", False)),
        "post_url": post.get("url", ""),
        "created_at": post.get("created_at") or cluster.get("first_seen_at"),
        "language": post.get("language", "und"),
        "title": cluster["title"],
        "display_title": cluster.get("summary_zh") or cluster["title"],
        "original_text": post.get("clean_text") or post.get("text") or cluster.get("summary", ""),
        "translation_zh": post.get("translation_zh") or post.get("summary_zh") or cluster.get("summary_zh", ""),
        "translation_status": post.get("translation_status", "unknown"),
        "translation_provider": post.get("translation_provider", "none"),
        "summary_zh": cluster.get("summary_zh", ""),
        "media": media_items(post),
        "score": score,
        "score_value": score.get("ips", 0),
        "score_label": "IPS",
        "tags": featured_tags(cluster),
        "metrics": cluster.get("metrics", {}),
        "post_metrics": post.get("metrics", {}),
        "source_count": cluster.get("post_count", 1),
        "related_sources": max(0, cluster.get("post_count", 1) - 1),
        "selected_reason": selected_reason_for_cluster(cluster),
        "recommended_action": score.get("recommended_action", "持续监测"),
        "href": f"#/intel/{cluster['cluster_id']}",
        "external_href": post.get("url", ""),
        "sentiment": score.get("sentiment", "neutral"),
        "level": score.get("level", "low"),
    }


def featured_item_for_competitor_post(post: dict[str, Any]) -> dict[str, Any] | None:
    interactions = public_interactions(post.get("metrics", {}))
    score_value = min(100, 55 + round(interactions / 8))
    return {
        "id": f"featured-temu-{post.get('post_id', '')}",
        "brand": "temu",
        "cluster_id": "",
        "source_type": "竞品异常",
        "source_name": source_name_for_post(post, "Temu 竞品"),
        "author_name": post.get("author_name") or post.get("author_handle"),
        "author_handle": post.get("author_handle"),
        "author_avatar_url": post.get("author_avatar_url"),
        "post_url": post.get("url", ""),
        "created_at": post.get("created_at"),
        "language": post.get("language", "und"),
        "title": "Temu 负向竞品讨论出现较高互动",
        "display_title": "Temu 负向竞品讨论出现较高互动",
        "original_text": post.get("text", ""),
        "translation_zh": post.get("translation_zh") or post.get("summary_zh", ""),
        "translation_status": post.get("translation_status", "unknown"),
        "translation_provider": post.get("translation_provider", "none"),
        "summary_zh": post.get("summary_zh", ""),
        "media": media_items(post),
        "score": {"ips": score_value, "level": "medium", "sentiment": post.get("sentiment", "neutral")},
        "score_value": score_value,
        "score_label": "CSI",
        "tags": ["竞品", post.get("sentiment", "neutral"), *post.get("matched_terms", [])],
        "metrics": post.get("metrics", {}),
        "post_metrics": post.get("metrics", {}),
        "source_count": 1,
        "related_sources": 0,
        "selected_reason": "竞品负向讨论具备一定互动量，可作为 Joybuy 当日风险语境和对比样本。",
        "recommended_action": "纳入竞品基线观察",
        "href": "",
        "external_href": post.get("url", ""),
        "sentiment": post.get("sentiment", "neutral"),
        "level": "medium",
    }


def representative_post(cluster: dict[str, Any]) -> dict[str, Any] | None:
    posts = cluster.get("posts", [])
    if not posts:
        return None
    return sorted(posts, key=representative_post_rank, reverse=True)[0]


def representative_post_rank(post: dict[str, Any]) -> tuple[int, int, int, str]:
    text = f"{post.get('clean_text') or post.get('text') or ''} {post.get('translation_zh') or ''}".lower()
    matched_terms = [str(term).lower() for term in post.get("matched_brand_terms", [])]
    explicit_joybuy = "joybuy" in text or any("joybuy" in term for term in matched_terms)
    ecommerce_context = any(
        term in text
        for term in [
            "order",
            "ordered",
            "delivery",
            "shipping",
            "parcel",
            "package",
            "refund",
            "return",
            "customer service",
            "coupon",
            "discount",
            "promo",
            "warehouse",
            "checkout",
            "下单",
            "订单",
            "物流",
            "配送",
            "包裹",
            "退款",
            "退货",
            "客服",
            "优惠",
            "仓库",
        ]
    )
    direct_score = 2 if explicit_joybuy else 0
    context_score = 1 if ecommerce_context else 0
    return (direct_score, context_score, public_interactions(post.get("metrics", {})), str(post.get("created_at") or ""))


def public_interactions(metrics: dict[str, Any]) -> int:
    return (
        int(metrics.get("likes") or metrics.get("total_likes") or 0)
        + int(metrics.get("reposts") or metrics.get("total_reposts") or 0)
        + int(metrics.get("replies") or metrics.get("total_replies") or 0)
        + int(metrics.get("quotes") or metrics.get("total_quotes") or 0)
    )


def source_name_for_post(post: dict[str, Any], fallback: str) -> str:
    handle = post.get("author", {}).get("handle") or post.get("author_handle")
    if handle:
        return f"{fallback} · @{handle}"
    return fallback


def featured_tags(cluster: dict[str, Any]) -> list[str]:
    score = cluster.get("score", {})
    tags = [cluster.get("topic", "general"), *cluster.get("risk_types", []), *cluster.get("opportunity_types", [])]
    if score.get("future_potential", 0) >= 75:
        tags.append("高潜传播")
    if cluster.get("metrics", {}).get("max_author_followers", 0) >= 20_000:
        tags.append("高影响力账号")
    if score.get("recommended_action") in {"人工核查", "PR 准备回应", "高层同步"}:
        tags.append("需处置")
    return dedupe_strings([tag for tag in tags if tag])


def selected_reason_for_cluster(cluster: dict[str, Any]) -> str:
    score = cluster.get("score", {})
    base = score.get("explanation") or "该舆情达到焦点阈值，建议结合原帖证据持续观察。"
    source_count = cluster.get("post_count", 0)
    if source_count > 1:
        base += f" 当前关联到 {source_count} 条相关原帖。"
    if cluster.get("metrics", {}).get("max_author_followers", 0) >= 20_000:
        base += " 其中包含高影响力账号信号。"
    return base


def media_items(post: dict[str, Any]) -> list[dict[str, str]]:
    items = []
    for item in post.get("media", []) or []:
        if isinstance(item, str):
            items.append({"url": item, "type": "image"})
        elif isinstance(item, dict):
            url = (
                item.get("media_url_https")
                or item.get("media_url")
                or item.get("preview_image_url")
                or item.get("thumbnail_url")
                or item.get("url")
            )
            if url:
                items.append({"url": url, "type": str(item.get("type") or "image")})
    return items[:4]


def dedupe_strings(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def featured_sort_key(item: dict[str, Any]) -> tuple[int, int, str]:
    brand_priority = 1 if item.get("brand") != "temu" else 0
    return (brand_priority, int(item.get("score_value") or 0), str(item.get("created_at") or ""))


def build_hot_topics(joybuy_clusters: list[dict[str, Any]], featured_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    topics = []
    for rank, item in enumerate(featured_items[:5], start=1):
        topics.append(
            {
                "rank": rank,
                "title": item.get("display_title") or item.get("title", "Intelligence signal"),
                "cluster_id": item.get("cluster_id", ""),
                "score_value": item.get("score_value"),
                "level": item.get("level"),
                "source_count": item.get("source_count", 1),
                "count_label": f"{item.get('source_count', 1)} 条相关原帖" if item.get("source_count", 1) > 1 else item.get("source_type", "1 条原帖"),
                "reason": item.get("selected_reason", ""),
            }
        )
    if topics:
        return topics
    for rank, cluster in enumerate(joybuy_clusters[:3], start=1):
        score = cluster.get("score", {})
        topics.append(
            {
                "rank": rank,
                "title": cluster.get("summary_zh") or cluster.get("title", "Joybuy intelligence signal"),
                "cluster_id": cluster.get("cluster_id", ""),
                "score_value": score.get("ips"),
                "level": score.get("level"),
                "source_count": cluster.get("post_count", 0),
                "count_label": f"{cluster.get('post_count', 0)} 条相关原帖",
                "reason": score.get("explanation", ""),
            }
        )
    return topics


def cluster_summary(cluster: dict[str, Any], include_posts: bool = False) -> dict[str, Any]:
    post = representative_post(cluster)
    data = {
        "cluster_id": cluster["cluster_id"],
        "title": cluster["title"],
        "summary": cluster["summary"],
        "summary_zh": cluster["summary_zh"],
        "lead_post": lead_post_summary(post) if post else {},
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


def lead_post_summary(post: dict[str, Any]) -> dict[str, Any]:
    return {
        "post_id": post.get("post_id"),
        "created_at": post.get("created_at"),
        "author": post.get("author", {}),
        "author_name": post.get("author", {}).get("name") or post.get("author_name"),
        "author_handle": post.get("author", {}).get("handle") or post.get("author_handle"),
        "author_avatar_url": post.get("author", {}).get("avatar_url") or post.get("author_avatar_url"),
        "author_followers": post.get("author", {}).get("followers", post.get("author_followers", 0)),
        "author_verified": post.get("author", {}).get("verified", post.get("author_verified", False)),
        "url": post.get("url", ""),
        "language": post.get("language", "und"),
        "clean_text": post.get("clean_text") or post.get("text") or "",
        "links": post.get("links", []),
        "translation_zh": post.get("translation_zh") or post.get("summary_zh") or post.get("clean_text") or post.get("text") or "",
        "translation_status": post.get("translation_status", "unknown"),
        "translation_provider": post.get("translation_provider", "none"),
        "summary_zh": post.get("summary_zh", ""),
        "metrics": post.get("metrics", {}),
        "media": media_items(post),
    }


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
    translation = translation_status(posts)
    joybuy_posts = [post for post in posts if post.get("brand") == "joybuy"]
    temu_posts = [post for post in posts if post.get("brand") == "temu"]
    estimated_cost = 0
    if "twitterapi_io" in providers:
        estimated_cost = round(len(posts) * 0.00015, 4)
    return {
        "status": "sample" if is_sample else "normal",
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
        "translation": translation,
        "notes": source_notes(is_sample, translation),
    }


def translation_status(posts: list[dict[str, Any]]) -> dict[str, Any]:
    counts: dict[str, int] = {}
    providers = set()
    for post in posts:
        status = str(post.get("translation_status") or "unknown")
        counts[status] = counts.get(status, 0) + 1
        provider = post.get("translation_provider")
        if provider:
            providers.add(str(provider))
    return {
        "providers": sorted(providers),
        "counts": counts,
        "missing_count": counts.get("missing", 0) + counts.get("error", 0),
        "fallback_original_count": counts.get("missing", 0) + counts.get("error", 0),
    }


def source_notes(is_sample: bool, translation: dict[str, Any]) -> list[str]:
    base = [
        "Bookmarks are collected only when the data source provides them.",
        "Quote counts are treated as public propagation signals.",
    ]
    if is_sample:
        return [
            "Sample provider is active. Set X_SOURCE_PROVIDER=twitterapi_io to use real X data.",
            *base,
            "Sample translations are generated from the local sample dictionary.",
        ]
    translation_note = (
        f"Chinese translation unavailable for {translation['missing_count']} posts; original text is shown as fallback."
        if translation.get("missing_count")
        else f"Chinese translation coverage is complete. Provider: {', '.join(translation.get('providers', [])) or 'none'}."
    )
    return [
        "Real X data provider is active. Review daily cost and duplicate rate during bake-off.",
        *base,
        translation_note,
    ]
