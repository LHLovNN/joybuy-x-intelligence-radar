from __future__ import annotations

from typing import Any


class XSourceBase:
    provider_name = "base"

    def search_posts(
        self,
        query: str,
        start_time: str,
        end_time: str,
        limit: int,
        query_type: str = "Latest",
    ) -> list[dict[str, Any]]:
        raise NotImplementedError

    def hydrate_posts(self, post_ids: list[str]) -> list[dict[str, Any]]:
        raise NotImplementedError


class ProviderNotConfigured(RuntimeError):
    pass


class ProviderBudgetExceeded(RuntimeError):
    pass
