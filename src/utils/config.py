from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from src.utils.io import read_json


ROOT = Path(__file__).resolve().parents[2]


def load_project_json(name: str) -> Any:
    """Load a repo sample config, allowing a local private override."""
    override_dir = Path(os.getenv("BRAND_RADAR_CONFIG_DIR") or ROOT / "config" / "private")
    override_path = override_dir / name
    if override_path.exists():
        return read_json(str(override_path))
    public_name = name.replace(".local.", ".")
    config = read_json(str(ROOT / "config" / public_name))
    if public_name == "keywords.json":
        return normalize_keyword_config(config)
    return config


def normalize_keyword_config(config: Any) -> Any:
    """Accept public generic keys while preserving the current runtime contract."""
    if not isinstance(config, dict):
        return config
    brands = config.get("brands")
    if not isinstance(brands, dict):
        return config
    normalized = dict(brands)
    if "joybuy" not in normalized and "primary" in normalized:
        normalized["joybuy"] = normalized["primary"]
    if "temu" not in normalized and "competitor" in normalized:
        normalized["temu"] = normalized["competitor"]
    return {**config, "brands": normalized}
