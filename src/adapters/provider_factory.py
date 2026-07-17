from __future__ import annotations

import os

from src.adapters.sample import SampleXSource
from src.adapters.twitterapi_io import TwitterApiIoAdapter
from src.adapters.x_source_base import ProviderNotConfigured, XSourceBase


def get_x_source(provider: str | None) -> XSourceBase:
    selected = (provider or "sample").strip().lower()
    if selected == "sample":
        return SampleXSource()
    if selected == "twitterapi_io":
        return TwitterApiIoAdapter(api_key=os.getenv("TWITTERAPI_IO_KEY"))
    if selected in {"xpoz", "apify", "aisa_x"}:
        raise ProviderNotConfigured(
            f"{selected} adapter is reserved but not active in the sample MVP. "
            "Add the API key and implement the provider request mapping before enabling it."
        )
    raise ProviderNotConfigured(f"Unknown X source provider: {selected}")
