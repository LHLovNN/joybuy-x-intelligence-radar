#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.pipeline.translation import JoyBuilderTranslationService, apply_translations


def main() -> None:
    api_key = os.getenv("JDCLOUD_GPT_API_KEY")
    if not api_key:
        raise SystemExit("JDCLOUD_GPT_API_KEY is missing. Set it in the current local shell or another company-trusted secret store.")

    service = JoyBuilderTranslationService(api_key=api_key, batch_size=1, timeout_seconds=45)
    posts = [
        {
            "post_id": "translation-smoke-test-1",
            "language": "fr",
            "clean_text": "Le remboursement Joybuy est toujours en attente après douze jours.",
        }
    ]
    report = apply_translations(posts, service)
    result = {
        "provider": report.get("provider"),
        "missing_count": report.get("missing_count"),
        "counts": report.get("counts"),
        "translation_status": posts[0].get("translation_status"),
        "translation_zh": posts[0].get("translation_zh"),
        "error": report.get("error"),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if report.get("missing_count"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
