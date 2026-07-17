#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.adapters.twitterapi_io import ProviderBudgetExceeded, TwitterApiIoAdapter


def main() -> None:
    adapter = TwitterApiIoAdapter(api_key="test-key")
    sample = {
        "id": "1900000000000000001",
        "text": "Joybuy UK refund is still pending after a cancelled order.",
        "createdAt": "Fri Jul 17 01:15:00 +0000 2026",
        "lang": "en",
        "likeCount": 12,
        "retweetCount": 3,
        "replyCount": 4,
        "quoteCount": 1,
        "viewCount": 1200,
        "user": {
            "id": "user-1",
            "userName": "shopper_watch",
            "name": "Shopper Watch",
            "followers": 5000,
            "isVerified": True,
        },
        "entities": {
            "urls": [
                {
                    "url": "https://t.co/example",
                    "expanded_url": "https://example.com/case",
                }
            ]
        },
    }

    mapped = adapter._map_tweet(sample, '"joybuy uk" refund -filter:retweets')
    assert mapped["post_id"] == sample["id"]
    assert mapped["author_handle"] == "shopper_watch"
    assert mapped["created_at"] == "2026-07-17T01:15:00Z"
    assert mapped["like_count"] == 12
    assert mapped["repost_count"] == 3
    assert mapped["reply_count"] == 4
    assert mapped["quote_count"] == 1
    assert mapped["view_count"] == 1200
    assert mapped["links"] == ["https://example.com/case"]
    capped = TwitterApiIoAdapter(api_key="test-key", max_requests_per_run=0)
    try:
        capped.search_posts("joybuy", "2026-07-16T00:00:00Z", "2026-07-17T00:00:00Z", 1)
    except ProviderBudgetExceeded:
        pass
    else:
        raise AssertionError("expected ProviderBudgetExceeded when request cap is zero")
    assert capped.requests_used == 0
    assert capped.request_budget_exhausted is True
    print("TwitterAPI.io mapping test passed.")


if __name__ == "__main__":
    main()
