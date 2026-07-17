#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.adapters.twitterapi_io import TwitterApiIoAdapter


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
    print("TwitterAPI.io mapping test passed.")


if __name__ == "__main__":
    main()
