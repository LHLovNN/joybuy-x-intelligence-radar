#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.pipeline.normalizer import normalize_posts
from src.utils.io import read_json


def post(post_id: str, text: str, brand_candidate: str = "joybuy") -> dict:
    return {
        "post_id": post_id,
        "url": f"https://x.com/test/status/{post_id}",
        "text": text,
        "author_id": "author-test",
        "author_name": "Test",
        "author_handle": "test",
        "author_followers": 10,
        "author_verified": False,
        "created_at": "2026-07-17T00:00:00Z",
        "collected_at": "2026-07-17T00:00:00Z",
        "language": "en",
        "like_count": 0,
        "repost_count": 0,
        "reply_count": 0,
        "quote_count": 0,
        "bookmark_count": None,
        "view_count": 1,
        "media": [],
        "links": [],
        "quoted_post_id": None,
        "reply_to_post_id": None,
        "source_provider": "test",
        "query": "test",
        "brand_candidate": brand_candidate,
    }


def main() -> None:
    config = read_json(str(ROOT / "config" / "keywords.json"))
    rows = normalize_posts(
        [
            post("1", "JD Vance knows nothing about history and politics."),
            post("2", "JD.com order tracking for my Joybuy Germany parcel is delayed."),
            post("3", "提供京东E卡低价充值和代充服务"),
            post("4", "god forbid bts did something sto lat temu fake problematic things", "temu"),
            post("5", "Class action alleges Temu used deceptive spam emails to install tracking technology", "temu"),
            post("6", "Temu journalist is spreading fake news again", "temu"),
            post("7", "Cada vez que veo algo de Temu cierro la app por los premios gratis", "temu"),
        ],
        config,
    )

    by_id = {row["post_id"]: row for row in rows}
    assert not by_id["1"]["is_relevant"], "JD Vance political posts must be excluded"
    assert by_id["1"]["matched_irrelevant_terms"], "JD Vance post should record irrelevant terms"
    assert by_id["2"]["is_relevant"], "JD.com/Joybuy ecommerce context should remain relevant"
    assert not by_id["3"]["is_relevant"], "JD card recharge spam must be excluded"
    assert by_id["3"]["matched_spam_terms"], "JD card recharge spam should record spam terms"
    assert not by_id["4"]["is_relevant"], "Polish 'temu' false positive must be excluded"
    assert by_id["5"]["is_relevant"], "Temu tracking/privacy controversy should remain relevant"
    assert not by_id["6"]["is_relevant"], "Temu-as-insult false positive must be excluded"
    assert by_id["7"]["is_relevant"], "Temu app complaint should remain relevant"
    print("Quality filter tests passed.")


if __name__ == "__main__":
    main()
