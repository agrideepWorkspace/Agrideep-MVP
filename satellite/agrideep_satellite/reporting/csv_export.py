"""CSV serialization of observations and per-date quality statistics."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


CSV_COLUMNS = (
    "date",
    "valid",
    "invalid_reason",
    "ndvi",
    "ndvi_median",
    "ndvi_min",
    "ndvi_max",
    "ndvi_std_dev",
    "ndmi",
    "ndmi_median",
    "ndmi_min",
    "ndmi_max",
    "ndmi_std_dev",
    "cloud_pct",
    "scene_cloud_pct",
    "valid_pixel_pct",
    "valid_pixel_count",
    "image_id",
    "spacecraft",
)


def export_observations_csv(
    observations: list[dict[str, Any]],
    destination: Path,
) -> None:
    """Write all valid and invalid acquisition rows with blanks for missing data."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        for observation in observations:
            statistics = observation.get("statistics") or {}
            row = {column: observation.get(column) for column in CSV_COLUMNS}
            row["valid_pixel_count"] = statistics.get("valid_pixel_count")
            for index_name in ("ndvi", "ndmi"):
                index_statistics = statistics.get(index_name) or {}
                for statistic in ("median", "min", "max", "std_dev"):
                    row[f"{index_name}_{statistic}"] = index_statistics.get(statistic)
            writer.writerow(row)
