"""Statistics over paired, valid orchard pixels and observations."""

from __future__ import annotations

from datetime import date
from typing import Any

import numpy as np


def _valid_values(values: Any) -> tuple[np.ndarray, np.ndarray]:
    array = np.ma.asarray(values, dtype=np.float64)
    data = np.asarray(np.ma.getdata(array), dtype=np.float64).ravel()
    valid = ~np.ma.getmaskarray(array).ravel() & np.isfinite(data)
    return data, valid


def calculate_index_statistics(
    ndvi: Any,
    ndmi: Any,
    *,
    valid_mask: Any | None = None,
) -> dict[str, Any]:
    """Summarize paired NDVI/NDMI pixels; missing values are never zero-filled."""
    ndvi_values, ndvi_valid = _valid_values(ndvi)
    ndmi_values, ndmi_valid = _valid_values(ndmi)
    if ndvi_values.shape != ndmi_values.shape:
        raise ValueError("NDVI and NDMI arrays must have matching shapes.")

    paired_valid = ndvi_valid & ndmi_valid
    if valid_mask is not None:
        mask_values, mask_valid = _valid_values(valid_mask)
        if mask_values.shape != paired_valid.shape:
            raise ValueError("valid_mask must match the index array shapes.")
        paired_valid &= mask_valid & (mask_values != 0)

    count = int(np.count_nonzero(paired_valid))
    if count == 0:
        return {"ndvi": None, "ndmi": None, "valid_pixel_count": 0}

    def summarize(values: np.ndarray) -> dict[str, float]:
        selected = values[paired_valid]
        return {
            "mean": float(np.mean(selected)),
            "median": float(np.median(selected)),
            "min": float(np.min(selected)),
            "max": float(np.max(selected)),
            "std_dev": float(np.std(selected, ddof=0)),
        }

    return {
        "ndvi": summarize(ndvi_values),
        "ndmi": summarize(ndmi_values),
        "valid_pixel_count": count,
    }


def summarize_observations(observations: list[dict[str, Any]]) -> dict[str, Any]:
    """Summarize valid observations without treating invalid values as zero."""
    valid = [item for item in observations if item.get("valid") is True]
    invalid_count = len(observations) - len(valid)
    result: dict[str, Any] = {
        "n_observations": len(observations),
        "n_valid": len(valid),
        "n_invalid": invalid_count,
        "valid_pct": (
            round(100 * len(valid) / len(observations), 2) if observations else None
        ),
        "first_valid_date": valid[0]["date"] if valid else None,
        "last_valid_date": valid[-1]["date"] if valid else None,
        "max_gap_days": None,
        "ndvi_mean": None,
        "ndvi_median": None,
        "ndvi_min": None,
        "ndvi_max": None,
        "ndvi_std_dev": None,
        "ndmi_mean": None,
        "ndmi_median": None,
        "ndmi_min": None,
        "ndmi_max": None,
        "ndmi_std_dev": None,
        "max_observation_valid_pixel_count": None,
        "mean_valid_pixel_pct": None,
        "mean_cloud_pct": None,
    }
    if observations:
        result["max_observation_valid_pixel_count"] = max(
            int((item.get("statistics") or {}).get("valid_pixel_count") or 0)
            for item in observations
        )
        result["mean_valid_pixel_pct"] = float(
            np.mean([item["valid_pixel_pct"] for item in observations])
        )
        result["mean_cloud_pct"] = float(
            np.mean([item["cloud_pct"] for item in observations])
        )
    if not valid:
        return result

    dates = [item["date"] for item in valid]
    if len(dates) > 1:
        parsed_dates = [date.fromisoformat(value) for value in dates]
        result["max_gap_days"] = max(
            (right - left).days
            for left, right in zip(parsed_dates, parsed_dates[1:])
        )

    for index_name in ("ndvi", "ndmi"):
        statistics = [item["statistics"][index_name] for item in valid]
        values = np.asarray([item["mean"] for item in statistics], dtype=np.float64)
        result[f"{index_name}_mean"] = float(np.mean(values))
        result[f"{index_name}_median"] = float(np.median(values))
        result[f"{index_name}_min"] = float(np.min(values))
        result[f"{index_name}_max"] = float(np.max(values))
        result[f"{index_name}_std_dev"] = float(np.std(values, ddof=0))

    return result
