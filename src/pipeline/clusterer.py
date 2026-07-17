from collections import defaultdict
from typing import Any


RISK_TOPIC_MAP = {
    "refund": ["refund", "return", "chargeback", "退款"],
    "delivery": ["delivery", "shipping", "tracking", "parcel", "missing order"],
    "customer_service": ["customer service", "support", "客服"],
    "quality": ["damaged", "broken", "fake"],
    "price_opportunity": ["discount", "good deal", "promo", "fast delivery", "arrived early"],
}


def _topic_for(post: dict[str, Any]) -> str:
    text = post["clean_text"].lower()
    opportunity_markers = [
        "good deal",
        "fast delivery",
        "discount",
        "promo",
        "worked",
        "satisfied",
        "great price",
        "arrived early",
        "delivered my",
        "switch from temu to joybuy",
    ]
    if any(term in text for term in opportunity_markers):
        return "price_opportunity"
    for topic, terms in RISK_TOPIC_MAP.items():
        if any(term in text for term in terms):
            return topic
    return "general"


def cluster_posts(posts: list[dict[str, Any]], brand: str) -> list[dict[str, Any]]:
    relevant = [post for post in posts if post.get("brand") == brand and post.get("is_relevant")]
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for post in relevant:
        buckets[_topic_for(post)].append(post)

    clusters = []
    for index, (topic, grouped) in enumerate(sorted(buckets.items()), start=1):
        first_seen = min(item["created_at"] for item in grouped)
        last_seen = max(item["created_at"] for item in grouped)
        total_likes = sum(item["metrics"]["likes"] for item in grouped)
        total_reposts = sum(item["metrics"]["reposts"] for item in grouped)
        total_replies = sum(item["metrics"]["replies"] for item in grouped)
        total_quotes = sum(item["metrics"]["quotes"] for item in grouped)
        total_views = sum(item["metrics"]["views"] or 0 for item in grouped)
        max_followers = max(item["author"]["followers"] for item in grouped)
        cluster_id = f"{brand}-cluster-{index:03d}"
        clusters.append(
            {
                "cluster_id": cluster_id,
                "brand": brand,
                "canonical_brand_entity": grouped[0].get("canonical_brand_entity", brand),
                "topic": topic,
                "title": title_for_topic(topic),
                "summary": summary_for_topic(topic, grouped),
                "summary_zh": summary_zh_for_topic(topic, grouped),
                "language_mix": sorted({item["language"] for item in grouped}),
                "risk_types": risk_types_for_topic(topic),
                "opportunity_types": opportunity_types_for_topic(topic),
                "post_ids": [item["post_id"] for item in grouped],
                "posts": grouped,
                "post_count": len(grouped),
                "history_status": "archived",
                "tracking_eligible": False,
                "tracking_reason": [],
                "tracking_until": None,
                "first_seen_at": first_seen,
                "last_seen_at": last_seen,
                "metrics": {
                    "total_likes": total_likes,
                    "total_reposts": total_reposts,
                    "total_replies": total_replies,
                    "total_quotes": total_quotes,
                    "total_bookmarks": sum(item["metrics"]["bookmarks"] or 0 for item in grouped),
                    "total_views": total_views,
                    "max_author_followers": max_followers,
                    "public_interactions": total_likes + total_reposts + total_replies + total_quotes,
                },
                "evidence_chain": {},
                "score": {},
                "fermentation": {},
            }
        )
    return clusters


def title_for_topic(topic: str) -> str:
    titles = {
        "refund": "Refund and payment complaints around Joybuy",
        "delivery": "Delivery, tracking and parcel experience discussion",
        "customer_service": "Customer service and return response concerns",
        "quality": "Damaged item or product quality reports",
        "price_opportunity": "Positive price and delivery opportunity signals",
        "general": "General Joybuy/JD overseas shopping discussion",
    }
    return titles.get(topic, "General Joybuy discussion")


def summary_for_topic(topic: str, posts: list[dict[str, Any]]) -> str:
    count = len(posts)
    summaries = {
        "refund": f"{count} related posts discuss refund progress, cancelled orders or payment holds.",
        "delivery": f"{count} related posts discuss delivery speed, tracking status or missing parcels.",
        "customer_service": f"{count} related posts mention customer service response and returns.",
        "quality": f"{count} related posts mention damaged packaging or product condition.",
        "price_opportunity": f"{count} related posts mention fast delivery, discounts or positive value signals.",
        "general": f"{count} related posts discuss Joybuy/JD overseas shopping context.",
    }
    return summaries.get(topic, summaries["general"])


def summary_zh_for_topic(topic: str, posts: list[dict[str, Any]]) -> str:
    summaries = {
        "refund": "多条帖子讨论 Joybuy 退款进度、取消订单或支付挂起问题。",
        "delivery": "多条帖子讨论 Joybuy 配送速度、包裹追踪或未收到包裹问题。",
        "customer_service": "相关讨论集中在客服响应、退货和售后体验。",
        "quality": "相关讨论提到包装损坏或商品状态问题。",
        "price_opportunity": "相关讨论体现价格、优惠或配送体验上的正向机会。",
        "general": "相关讨论涉及 Joybuy/JD 海外购物的一般体验和认知问题。",
    }
    return summaries.get(topic, summaries["general"])


def risk_types_for_topic(topic: str) -> list[str]:
    mapping = {
        "refund": ["refund", "payment", "customer_service"],
        "delivery": ["delivery", "tracking"],
        "customer_service": ["customer_service", "returns"],
        "quality": ["product_quality"],
        "price_opportunity": [],
        "general": ["brand_trust"],
    }
    return mapping.get(topic, [])


def opportunity_types_for_topic(topic: str) -> list[str]:
    if topic == "price_opportunity":
        return ["positive_value", "delivery_strength"]
    return []
