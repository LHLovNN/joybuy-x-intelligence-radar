from __future__ import annotations

from datetime import timedelta
from typing import Any

from src.utils.time import from_iso, now_utc, to_iso


def update_fermentation(clusters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    current = now_utc()
    for cluster in clusters:
        score = cluster["score"]
        tracking_reasons = tracking_reasons_for(cluster)
        tracking_eligible = bool(tracking_reasons)
        cluster["tracking_eligible"] = tracking_eligible
        cluster["tracking_reason"] = tracking_reasons
        cluster["tracking_until"] = to_iso(current + timedelta(days=tracking_days_for(score["level"]))) if tracking_eligible else None
        cluster["fermentation"] = fermentation_status_for(cluster, current)
    return clusters


def tracking_reasons_for(cluster: dict[str, Any]) -> list[str]:
    score = cluster["score"]
    reasons = []
    if score["level"] in {"urgent", "high"}:
        reasons.append("high_risk")
    if score["ips"] >= 75:
        reasons.append("ips_top_candidate")
    if score["future_potential"] >= 78:
        reasons.append("high_future_potential")
    if score["credibility"] < 70 and max(score["current_impact"], score["future_potential"]) >= 75:
        reasons.append("unverified_spread_risk")
    if cluster["topic"] in {"refund", "delivery", "customer_service", "quality"}:
        reasons.append(f"{cluster['topic']}_issue")
    if cluster["metrics"]["max_author_followers"] >= 50000:
        reasons.append("high_influence_account")
    return sorted(set(reasons))


def tracking_days_for(level: str) -> int:
    if level in {"urgent", "high"}:
        return 14
    if level == "medium":
        return 10
    return 5


def fermentation_status_for(cluster: dict[str, Any], current: Any) -> dict[str, Any]:
    score = cluster["score"]
    first_seen = from_iso(cluster["first_seen_at"])
    age_hours = max(1, (current - first_seen).total_seconds() / 3600)
    metrics = cluster["metrics"]
    growth_factor = min(100, (metrics["public_interactions"] / max(1, age_hours)) * 1.7 + metrics["total_quotes"] * 2.2)
    new_related = min(24, cluster["post_count"] * 2)
    status = "观察中"
    if score["level"] in {"urgent", "high"} and growth_factor > 65:
        status = "发酵中"
    elif growth_factor > 48 or score["future_potential"] >= 82:
        status = "升温中"
    elif not cluster.get("tracking_eligible"):
        status = "不追踪"

    signals = []
    if metrics["total_quotes"] >= 10:
        signals.append("引用/Quote 数较高，出现二次传播语境")
    if metrics["max_author_followers"] >= 50000:
        signals.append("高影响力账号参与讨论")
    if cluster["post_count"] >= 3:
        signals.append("相似内容数量增加")
    if score["future_potential"] >= 80:
        signals.append("未来发酵潜力较高")
    if score["credibility"] < 70 and max(score["current_impact"], score["future_potential"]) >= 75:
        signals.append("可信度有限但传播风险较高")

    return {
        "status": status,
        "tracking_days": tracking_days_for(score["level"]) if cluster.get("tracking_eligible") else 0,
        "first_seen_at": cluster["first_seen_at"],
        "last_checked_at": to_iso(current),
        "growth": {
            "public_interactions_24h": round(growth_factor),
            "quotes_24h": metrics["total_quotes"],
            "new_related_posts_24h": new_related,
        },
        "signals": signals,
        "risk_change": "up" if status in {"升温中", "发酵中"} else "flat",
    }

