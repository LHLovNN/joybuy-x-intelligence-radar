import re
from typing import Any


def _lower_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _contains_any(text: str, terms: list[str]) -> list[str]:
    found = []
    padded = f" {text} "
    for term in terms:
        t = term.lower()
        if len(t) <= 3 and t.isascii():
            if re.search(rf"(?<![a-z0-9]){re.escape(t)}(?![a-z0-9])", padded):
                found.append(term)
        elif t in text:
            found.append(term)
    return found


def normalize_posts(posts: list[dict[str, Any]], keyword_config: dict[str, Any]) -> list[dict[str, Any]]:
    brands = keyword_config["brands"]
    normalized = []
    for post in posts:
        text = _lower_text(post["text"])
        brand_key = post.get("brand_candidate", "")
        brand_config = brands.get(brand_key, {})
        brand_terms = brand_config.get("brand_terms", [])
        risk_terms = brand_config.get("risk_terms", [])
        opportunity_terms = brand_config.get("opportunity_terms", [])
        ambiguous_terms = brand_config.get("ambiguous_terms", [])
        context_terms = brand_config.get("context_terms_for_ambiguous", [])
        relevance_context_terms = brand_config.get("relevance_context_terms", context_terms)
        context_required_terms = brand_config.get("context_required_terms", [])
        context_required_strong_terms = brand_config.get("context_required_strong_terms", relevance_context_terms)
        spam_terms = brand_config.get("spam_terms", [])
        irrelevant_terms = brand_config.get("irrelevant_terms", [])

        matched_brand_terms = _contains_any(text, brand_terms)
        matched_ambiguous_terms = _contains_any(text, ambiguous_terms)
        context_evidence = _contains_any(text, context_terms)
        relevance_context_evidence = _contains_any(text, relevance_context_terms)
        strong_context_evidence = _contains_any(text, context_required_strong_terms)
        matched_context_required_terms = _contains_any(text, context_required_terms)
        matched_spam_terms = _contains_any(text, spam_terms)
        matched_irrelevant_terms = _contains_any(text, irrelevant_terms)
        matched_risk_terms = _contains_any(text, risk_terms)
        matched_opportunity_terms = _contains_any(text, opportunity_terms)
        brand_ambiguity = bool(matched_ambiguous_terms) and not context_evidence
        context_required_missing = bool(matched_context_required_terms) and not strong_context_evidence
        required_context_missing = (
            bool(brand_config.get("requires_any_context"))
            and not relevance_context_evidence
            and not matched_risk_terms
            and not matched_opportunity_terms
        )
        is_relevant = (
            bool(matched_brand_terms)
            and not brand_ambiguity
            and not context_required_missing
            and not required_context_missing
            and not matched_spam_terms
            and not matched_irrelevant_terms
        )
        spam_score = 0.85 if matched_spam_terms or matched_irrelevant_terms else 0.05

        clean_text = re.sub(r"https?://\S+", "", post["text"]).strip()
        normalized.append(
            {
                **post,
                "clean_text": clean_text,
                "translation_zh": "",
                "translation_status": "pending",
                "translation_provider": "none",
                "summary_zh": summarize_to_zh(clean_text),
                "brand": brand_key,
                "canonical_brand_entity": brand_config.get("canonical_entity", brand_key),
                "matched_brand_terms": matched_brand_terms,
                "matched_ambiguous_terms": matched_ambiguous_terms,
                "brand_context_evidence": context_evidence,
                "relevance_context_evidence": relevance_context_evidence,
                "strong_context_evidence": strong_context_evidence,
                "matched_context_required_terms": matched_context_required_terms,
                "brand_ambiguity": brand_ambiguity,
                "context_required_missing": context_required_missing,
                "required_context_missing": required_context_missing,
                "matched_spam_terms": matched_spam_terms,
                "matched_irrelevant_terms": matched_irrelevant_terms,
                "risk_terms": matched_risk_terms,
                "opportunity_terms": matched_opportunity_terms,
                "is_relevant": is_relevant,
                "spam_score": spam_score,
                "dedupe_key": re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", text)[:120],
                "metrics": {
                    "likes": post.get("like_count", 0),
                    "reposts": post.get("repost_count", 0),
                    "replies": post.get("reply_count", 0),
                    "quotes": post.get("quote_count", 0),
                    "bookmarks": post.get("bookmark_count"),
                    "views": post.get("view_count"),
                },
                "author": {
                    "id": post.get("author_id"),
                    "handle": post.get("author_handle"),
                    "name": post.get("author_name"),
                    "avatar_url": post.get("author_avatar_url"),
                    "followers": post.get("author_followers", 0),
                    "verified": post.get("author_verified", False),
                },
            }
        )
    return normalized


def summarize_to_zh(text: str) -> str:
    lower = text.lower()
    if "refund" in lower or "退款" in text:
        return "用户讨论退款进度、支付或售后处理问题。"
    if "delivery" in lower or "shipping" in lower or "tracking" in lower or "parcel" in lower:
        return "用户讨论物流、配送或包裹追踪体验。"
    if "customer service" in lower or "客服" in text:
        return "用户讨论客服响应和售后体验。"
    if "discount" in lower or "promo" in lower or "good deal" in lower:
        return "用户讨论价格、优惠或正向购物体验。"
    return "用户在 X 上讨论与品牌相关的购物体验。"
