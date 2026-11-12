"""Observed period changes and conservative statistical anomaly screening."""

from __future__ import annotations

from datetime import date
from typing import Any

import numpy as np


def _valid_observations(observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        (item for item in observations if item.get("valid") is True),
        key=lambda item: item["date"],
    )


def _index_value(observation: dict[str, Any], index_name: str) -> float | None:
    statistics = observation.get("statistics") or {}
    metric = statistics.get(index_name) or {}
    value = metric.get("mean")
    if value is None:
        return None
    numeric = float(value)
    return numeric if np.isfinite(numeric) else None


def _change(current: float, baseline: float) -> dict[str, float | None]:
    return {
        "absolute_change": current - baseline,
        "percent_change": (
            (current - baseline) / abs(baseline) * 100
            if baseline != 0
            else None
        ),
    }


def analyze_temporal_evolution(
    observations: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compare valid dates with the first baseline and screen robust outliers.

    The modified-z threshold is 3.5; a 0.001 MAD floor matches the report's
    three-decimal index precision when a series has zero measured dispersion.
    """
    valid = _valid_observations(observations)
    if not valid:
        return {"baseline_date": None, "observations": [], "anomalies": []}

    baseline = valid[0]
    baseline_values = {
        metric: _index_value(baseline, metric) for metric in ("ndvi", "ndmi")
    }
    evolution: list[dict[str, Any]] = []
    for observation in valid:
        entry: dict[str, Any] = {"date": observation["date"]}
        for metric in ("ndvi", "ndmi"):
            value = _index_value(observation, metric)
            base_value = baseline_values[metric]
            entry[metric] = value
            entry[f"{metric}_change_from_baseline"] = (
                _change(value, base_value)
                if value is not None and base_value is not None
                else None
            )
        evolution.append(entry)

    anomalies: list[dict[str, Any]] = []
    for metric in ("ndvi", "ndmi"):
        metric_values = [
            (_index_value(item, metric), item["date"]) for item in valid
        ]
        populated = [(value, observed_date) for value, observed_date in metric_values
                     if value is not None]
        if len(populated) < 5:
            continue
        values = np.asarray([value for value, _ in populated], dtype=np.float64)
        median = float(np.median(values))
        mad = float(np.median(np.abs(values - median)))
        robust_scale = max(mad, 0.001)
        robust_scores = 0.6745 * (values - median) / robust_scale
        for (value, observed_date), score in zip(populated, robust_scores):
            if abs(float(score)) >= 3.5:
                anomalies.append(
                    {
                        "date": observed_date,
                        "metric": metric,
                        "value": value,
                        "robust_z_score": float(score),
                        "type": "statistical_change",
                        "interpretation": (
                            "Observed index value differs from this period's "
                            "historical distribution (modified z-score threshold "
                            "3.5); the cause is undetermined."
                        ),
                    }
                )

    return {
        "baseline_date": baseline["date"],
        "observations": evolution,
        "anomalies": anomalies,
    }


def compare_observation_periods(
    observations: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Compare the first and second halves when each has two valid dates."""
    valid = _valid_observations(observations)
    if len(valid) < 4:
        return None

    first_date = date.fromisoformat(valid[0]["date"])
    last_date = date.fromisoformat(valid[-1]["date"])
    midpoint = first_date + (last_date - first_date) / 2
    earlier = [
        item for item in valid
        if date.fromisoformat(item["date"]) <= midpoint
    ]
    later = [
        item for item in valid
        if date.fromisoformat(item["date"]) > midpoint
    ]
    if len(earlier) < 2 or len(later) < 2:
        return None

    comparison: dict[str, Any] = {
        "baseline_period": {
            "start_date": earlier[0]["date"],
            "end_date": earlier[-1]["date"],
            "n_valid": len(earlier),
        },
        "comparison_period": {
            "start_date": later[0]["date"],
            "end_date": later[-1]["date"],
            "n_valid": len(later),
        },
    }
    for metric in ("ndvi", "ndmi"):
        baseline_values = [_index_value(item, metric) for item in earlier]
        comparison_values = [_index_value(item, metric) for item in later]
        baseline_values = [value for value in baseline_values if value is not None]
        comparison_values = [value for value in comparison_values if value is not None]
        if not baseline_values or not comparison_values:
            comparison[metric] = None
            continue
        baseline_mean = float(np.mean(baseline_values))
        comparison_mean = float(np.mean(comparison_values))
        comparison[metric] = {
            "baseline_mean": baseline_mean,
            "comparison_mean": comparison_mean,
            **_change(comparison_mean, baseline_mean),
        }
    return comparison
