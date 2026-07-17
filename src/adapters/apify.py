from __future__ import annotations

from src.adapters.x_source_base import ProviderNotConfigured, XSourceBase


class ApifyXAdapter(XSourceBase):
    provider_name = "apify"

    def __init__(self, token: str | None = None, actor_id: str | None = None) -> None:
        if not token:
            raise ProviderNotConfigured("APIFY_TOKEN is required.")
        if not actor_id:
            raise ProviderNotConfigured("APIFY_ACTOR_ID is required for the selected X actor.")
        self.token = token
        self.actor_id = actor_id

    def search_posts(self, query: str, start_time: str, end_time: str, limit: int):
        raise NotImplementedError("Map Apify Actor output to RawPost before enabling.")

    def hydrate_posts(self, post_ids: list[str]):
        raise NotImplementedError("Apify hydration support depends on the selected Actor.")

