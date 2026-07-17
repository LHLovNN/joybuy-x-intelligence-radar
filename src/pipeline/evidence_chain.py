from typing import Any


def build_evidence_chain(cluster: dict[str, Any]) -> dict[str, Any]:
    posts = cluster["posts"]
    sorted_by_time = sorted(posts, key=lambda item: item["created_at"])
    sorted_by_interactions = sorted(
        posts,
        key=lambda item: item["metrics"]["likes"] + item["metrics"]["reposts"] + item["metrics"]["replies"] + item["metrics"]["quotes"],
        reverse=True,
    )
    sorted_by_followers = sorted(posts, key=lambda item: item["author"]["followers"], reverse=True)
    origin = [post_card(sorted_by_time[0], "热源")] if sorted_by_time else []
    popular = [post_card(post, "热门") for post in sorted_by_interactions[:3]]
    latest = [post_card(post, "最新") for post in sorted(sorted_by_time, key=lambda item: item["created_at"], reverse=True)[:3]]
    amplifiers = [
        post_card(post, "扩散源")
        for post in sorted_by_followers
        if post["author"]["followers"] >= 20000 or post["metrics"]["quotes"] >= 10
    ][:3]
    stakeholders = [
        post_card(post, "当事人")
        for post in posts
        if any(term in post["clean_text"].lower() for term in ["my order", "my refund", "my parcel", "i never", "我"])
    ][:3]
    supporting_evidence = build_supporting_evidence(cluster)
    contradicting_evidence = build_contradicting_evidence(cluster)
    return {
        "origin": origin,
        "stakeholders": stakeholders,
        "popular": popular,
        "amplifiers": amplifiers,
        "latest": latest,
        "supporting_evidence": supporting_evidence,
        "contradicting_evidence": contradicting_evidence,
    }


def post_card(post: dict[str, Any], label: str) -> dict[str, Any]:
    return {
        "post_id": post["post_id"],
        "label": label,
        "url": post["url"],
        "author_handle": post["author"]["handle"],
        "author_followers": post["author"]["followers"],
        "author_verified": post["author"].get("verified", False),
        "created_at": post["created_at"],
        "text": post["clean_text"],
        "summary_zh": post["summary_zh"],
        "metrics": post["metrics"],
        "matched_brand_terms": post.get("matched_brand_terms", []),
        "brand_context_evidence": post.get("brand_context_evidence", []),
    }


def build_supporting_evidence(cluster: dict[str, Any]) -> list[dict[str, Any]]:
    topic = cluster["topic"]
    if topic == "refund":
        return [
            {
                "source": "Tavily placeholder",
                "title": "External verification pending for refund-related claims",
                "url": "",
                "relationship": "background",
                "summary": "MVP demo placeholder. Real Tavily search will attach supporting or contradicting sources.",
                "credibility": 50,
            }
        ]
    if topic == "delivery":
        return [
            {
                "source": "Tavily placeholder",
                "title": "External verification pending for delivery and tracking signals",
                "url": "",
                "relationship": "background",
                "summary": "MVP demo placeholder. Real Tavily search will check carrier, forum and news signals.",
                "credibility": 50,
            }
        ]
    return []


def build_contradicting_evidence(cluster: dict[str, Any]) -> list[dict[str, Any]]:
    if cluster["score"].get("credibility", 100) < 70:
        return [
            {
                "source": "System",
                "title": "Claim requires manual verification",
                "url": "",
                "relationship": "uncertain",
                "summary": "The cluster has spread potential but limited direct evidence. Treat as unverified until checked.",
                "credibility": 45,
            }
        ]
    return []


def attach_evidence_chains(clusters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for cluster in clusters:
        cluster["evidence_chain"] = build_evidence_chain(cluster)
    return clusters

