#!/usr/bin/env python3
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.adapters.twitterapi_io import TwitterApiIoAdapter
from src.pipeline.normalizer import normalize_posts
from src.pipeline.query_builder import build_x_search_queries
from src.utils.config import load_project_json
from src.utils.io import read_json, write_json
from src.utils.time import beijing_daily_window, now_utc, to_iso


def limit() -> int:
    raw = os.getenv("X_BAKEOFF_POST_LIMIT", "40")
    try:
        return max(1, int(raw))
    except ValueError:
        return 40


def main() -> None:
    keyword_config = load_project_json("keywords.local.json")
    adapter = TwitterApiIoAdapter(api_key=os.getenv("TWITTERAPI_IO_KEY"))
    start, end = beijing_daily_window(now_utc())
    per_brand_limit = limit()
    output = {
        "provider": "twitterapi_io",
        "window_start": to_iso(start),
        "window_end": to_iso(end),
        "limit_per_brand": per_brand_limit,
        "brands": {},
    }

    for brand_key in ("joybuy", "temu"):
        queries = build_x_search_queries(keyword_config, brand_key)
        posts = []
        per_query_limit = max(1, per_brand_limit // len(queries))
        for query in queries:
            print(f"Querying {brand_key}: {query[:120]}")
            rows = adapter.search_posts(query, to_iso(start), to_iso(end), per_query_limit)
            for row in rows:
                rowsafe = {**row, "brand_candidate": brand_key}
                posts.append(rowsafe)
        normalized = normalize_posts(posts, keyword_config)
        effective = [post for post in normalized if post.get("is_relevant")]
        spam_filtered = [post for post in normalized if post.get("matched_spam_terms")]
        context_filtered = [
            post
            for post in normalized
            if post.get("context_required_missing") or post.get("required_context_missing")
        ]
        filtered = [post for post in normalized if not post.get("is_relevant")]
        output["brands"][brand_key] = {
            "query_count": len(queries),
            "returned_posts": len(posts),
            "effective_posts_after_filters": len(effective),
            "spam_filtered_posts": len(spam_filtered),
            "context_filtered_posts": len(context_filtered),
            "posts": posts,
            "sample_posts": posts[:5],
            "sample_effective_posts": effective[:5],
            "sample_filtered_posts": [
                {
                    "post_id": post["post_id"],
                    "url": post["url"],
                    "text": post["clean_text"],
                    "author_handle": post["author"]["handle"],
                    "created_at": post["created_at"],
                    "language": post["language"],
                    "filter_reasons": filter_reasons(post),
                }
                for post in filtered[:8]
            ],
        }
        print(
            f"{brand_key}: {len(posts)} posts from {len(queries)} queries; "
            f"{len(effective)} effective after filters"
        )

    target = ROOT / "data" / "logs" / "twitterapi-io-bakeoff-latest.json"
    write_json(str(target), output)
    print(f"Saved bake-off sample to {target.relative_to(ROOT)}")


def filter_reasons(post: dict) -> list[str]:
    reasons = []
    if post.get("matched_spam_terms"):
        reasons.append("spam_terms:" + ",".join(post["matched_spam_terms"][:3]))
    if post.get("matched_irrelevant_terms"):
        reasons.append("irrelevant_terms:" + ",".join(post["matched_irrelevant_terms"][:3]))
    if post.get("brand_ambiguity"):
        reasons.append("brand_ambiguity")
    if post.get("context_required_missing") or post.get("required_context_missing"):
        reasons.append("context_missing")
    if not reasons:
        reasons.append("low_relevance")
    return reasons


if __name__ == "__main__":
    main()
