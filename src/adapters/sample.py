from __future__ import annotations

from typing import Any

from src.adapters.x_source_base import XSourceBase
from src.pipeline.sample_data import build_sample_posts


class SampleXSource(XSourceBase):
    provider_name = "sample"

    def all_posts(self) -> list[dict[str, Any]]:
        joybuy_posts, temu_posts = build_sample_posts()
        return joybuy_posts + temu_posts

    def search_posts(
        self,
        query: str,
        start_time: str,
        end_time: str,
        limit: int,
        query_type: str = "Latest",
    ) -> list[dict[str, Any]]:
        query_lower = query.lower()
        matches = [post for post in self.all_posts() if any(part in post["text"].lower() for part in query_lower.split())]
        return matches[:limit]

    def hydrate_posts(self, post_ids: list[str]) -> list[dict[str, Any]]:
        wanted = set(post_ids)
        return [post for post in self.all_posts() if post["post_id"] in wanted]
