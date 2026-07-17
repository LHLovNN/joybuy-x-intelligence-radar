from __future__ import annotations

from src.adapters.x_source_base import ProviderNotConfigured, XSourceBase


class XpozAdapter(XSourceBase):
    provider_name = "xpoz"

    def __init__(self, api_key: str | None = None) -> None:
        if not api_key:
            raise ProviderNotConfigured("XPOZ_API_KEY is required.")
        self.api_key = api_key

    def search_posts(self, query: str, start_time: str, end_time: str, limit: int):
        raise NotImplementedError("Map Xpoz search response to RawPost before enabling.")

    def hydrate_posts(self, post_ids: list[str]):
        raise NotImplementedError("Map Xpoz hydration response to RawPost before enabling.")

