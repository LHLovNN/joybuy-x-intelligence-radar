from collections import Counter
from typing import Any


NEGATIVE_TERMS = {"refund", "delivery", "scam", "fake", "damaged", "slow", "missing", "customer service"}
HARD_NEGATIVE_TERMS = {"refund", "scam", "fake", "damaged", "slow", "missing"}
POSITIVE_TERMS = {"quick", "solved", "good", "fast", "arrived", "surprisingly"}


def build_competitor_radar(posts: list[dict[str, Any]]) -> dict[str, Any]:
    temu_posts = [post for post in posts if post.get("brand") == "temu" and post.get("is_relevant")]
    sentiments = Counter(sentiment_for(post) for post in temu_posts)
    top_terms = extract_terms(temu_posts)
    top_posts = sorted(
        temu_posts,
        key=lambda item: item["metrics"]["likes"] + item["metrics"]["reposts"] + item["metrics"]["replies"] + item["metrics"]["quotes"],
        reverse=True,
    )[:10]
    return {
        "brand": "temu",
        "volume": len(temu_posts),
        "sentiment": {
            "negative": sentiments.get("negative", 0),
            "neutral": sentiments.get("neutral", 0),
            "positive": sentiments.get("positive", 0),
        },
        "top_terms": top_terms,
        "top_posts": [post_card(post) for post in top_posts],
        "anomalies": [
            "Temu fake discount discussion has higher interaction than other competitor topics."
        ]
        if any("fake" in post["clean_text"].lower() for post in temu_posts)
        else [],
    }


def sentiment_for(post: dict[str, Any]) -> str:
    text = post["clean_text"].lower()
    has_positive = any(term in text for term in POSITIVE_TERMS)
    has_hard_negative = any(term in text for term in HARD_NEGATIVE_TERMS)
    if has_positive and not has_hard_negative:
        return "positive"
    if any(term in text for term in NEGATIVE_TERMS):
        return "negative"
    return "neutral"


def extract_terms(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counter: Counter[str] = Counter()
    for post in posts:
        for term in list(NEGATIVE_TERMS) + list(POSITIVE_TERMS):
            if term in post["clean_text"].lower():
                counter[term] += 1
    return [{"term": term, "count": count} for term, count in counter.most_common(8)]


def post_card(post: dict[str, Any]) -> dict[str, Any]:
    return {
        "post_id": post["post_id"],
        "url": post["url"],
        "text": post["clean_text"],
        "summary_zh": post["summary_zh"],
        "author_handle": post["author"]["handle"],
        "created_at": post["created_at"],
        "metrics": post["metrics"],
        "sentiment": sentiment_for(post),
        "matched_terms": post.get("risk_terms", []) + post.get("opportunity_terms", []),
    }
