#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.pipeline.dashboard_builder import cluster_summary
from src.pipeline.fermentation import update_fermentation
from src.utils.io import read_json, write_json
from src.utils.time import now_utc, to_iso


def main() -> None:
    clusters_path = ROOT / "data" / "clusters" / "joybuy-clusters.json"
    normalized_path = ROOT / "public" / "dashboard-data" / "latest.json"
    if not clusters_path.exists() or not normalized_path.exists():
        print("No prior daily data found. Run scripts/run_daily.py first.")
        return

    clusters = read_json(str(clusters_path))
    clusters = update_fermentation(clusters)
    write_json(str(clusters_path), clusters)
    tracked = [cluster for cluster in clusters if cluster.get("tracking_eligible")]
    write_json(
        str(ROOT / "public" / "dashboard-data" / "fermentation.json"),
        {
            "generated_at": to_iso(now_utc()),
            "items": [cluster_summary(cluster, include_posts=False) for cluster in tracked],
        },
    )

    # The lightweight refresh currently updates cluster-level fermentation data.
    # A real source adapter will hydrate latest post metrics before this step.
    log = {
        "status": "ok",
        "generated_at": to_iso(now_utc()),
        "tracked_clusters": len(tracked),
        "note": "Sample refresh updated fermentation state from stored clusters.",
    }
    write_json(str(ROOT / "data" / "logs" / "fermentation-refresh-latest.json"), log)
    print(f"Updated fermentation state for {log['tracked_clusters']} tracked clusters.")


if __name__ == "__main__":
    main()
