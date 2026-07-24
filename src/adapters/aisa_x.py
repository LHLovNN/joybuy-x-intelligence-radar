from __future__ import annotations

from src.adapters.x_source_base import ProviderNotConfigured, XSourceBase


class AisaXAdapter(XSourceBase):
    provider_name = "aisa_x"

    def __init__(self, api_key: str | None = None) -> None:
        if not api_key:
            raise ProviderNotConfigured("AISA_API_KEY is required.")
        self.api_key = api_key

    def search_posts(self, query: str, start_time: str, end_time: str, limit: int, query_type: str = "Latest"):
        raise NotImplementedError("Map AIsa X skill response to RawPost before enabling.")

    def hydrate_posts(self, post_ids: list[str]):
        raise NotImplementedError("AIsa X hydration support depends on the selected skill.")
