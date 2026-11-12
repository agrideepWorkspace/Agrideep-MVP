from __future__ import annotations

from datetime import date

import numpy as np
import pytest

from agrideep_satellite.processing.indices import calculate_ndmi, calculate_ndvi
from agrideep_satellite.processing.statistics import (
    calculate_index_statistics,
    summarize_observations,
)
from agrideep_satellite.processing.temporal_analysis import (
    analyze_temporal_evolution,
    compare_observation_periods,
)


def test_ndvi_and_ndmi_mask_zero_and_invalid_denominators() -> None:
    nir = np.array([0.7, 0.0, np.nan, 0.4])
    red = np.array([0.3, 0.0, 0.2, 0.1])
    ndvi = calculate_ndvi(nir, red)
    ndmi = calculate_ndmi(nir, np.array([0.2, 0.0, 0.2, 0.1]))

    assert ndvi[0] == pytest.approx(0.4)
    assert ndmi[0] == pytest.approx(0.5555555555555555)
    assert np.ma.getmaskarray(ndvi).tolist() == [False, True, True, False]
    assert np.ma.getmaskarray(ndmi).tolist() == [False, True, True, False]


def test_masked_input_pixels_remain_masked() -> None:
    nir = np.ma.array([0.7, 0.8], mask=[False, True])
    red = np.array([0.3, 0.2])

    result = calculate_ndvi(nir, red)

    assert np.ma.getmaskarray(result).tolist() == [False, True]


def test_statistics_use_paired_valid_pixels_and_never_fill_missing_with_zero() -> None:
    result = calculate_index_statistics(
        np.ma.array([0.2, 0.4, np.nan], mask=[False, False, False]),
        np.ma.array([0.1, 0.3, 0.5], mask=[False, True, False]),
    )

    assert result["valid_pixel_count"] == 1
    assert result["ndvi"]["mean"] == 0.2
    assert result["ndmi"]["mean"] == 0.1
    assert calculate_index_statistics([], []) == {
        "ndvi": None,
        "ndmi": None,
        "valid_pixel_count": 0,
    }


def observation(
    observed_date: str,
    ndvi: float | None,
    ndmi: float | None,
    *,
    valid: bool = True,
) -> dict:
    return {
        "date": observed_date,
        "valid": valid,
        "ndvi": ndvi,
        "ndmi": ndmi,
        "cloud_pct": 5.0,
        "valid_pixel_pct": 90.0,
        "statistics": {
            "ndvi": {"mean": ndvi} if valid else None,
            "ndmi": {"mean": ndmi} if valid else None,
            "valid_pixel_count": 20,
        },
    }


def test_observation_summary_ignores_invalid_dates_and_reports_gaps() -> None:
    observations = [
        observation("2020-01-01", 0.2, 0.1),
        observation("2020-01-10", None, None, valid=False),
        observation("2020-01-20", 0.4, 0.3),
    ]

    summary = summarize_observations(observations)

    assert summary["n_observations"] == 3
    assert summary["n_valid"] == 2
    assert summary["ndvi_mean"] == pytest.approx(0.3)
    assert summary["max_gap_days"] == 19
    assert summary["mean_cloud_pct"] == 5


def test_quality_summary_keeps_metrics_for_invalid_observations() -> None:
    observations = [
        observation("2020-01-01", None, None, valid=False),
    ]
    observations[0]["cloud_pct"] = 70
    observations[0]["valid_pixel_pct"] = 10

    summary = summarize_observations(observations)

    assert summary["n_valid"] == 0
    assert summary["ndvi_mean"] is None
    assert summary["mean_cloud_pct"] == 70
    assert summary["mean_valid_pixel_pct"] == 10


def test_temporal_baseline_comparison_and_robust_anomaly_screening() -> None:
    values = [0.2, 0.21, 0.19, 0.2, 0.8]
    observations = [
        observation(
            observed_date,
            ndvi_value,
            ndvi_value / 2,
        )
        for observed_date, ndvi_value in zip(
            ["2020-01-01", "2020-03-01", "2020-06-01", "2020-08-01", "2020-11-01"],
            values,
        )
    ]

    analysis = analyze_temporal_evolution(observations)

    assert analysis["baseline_date"] == "2020-01-01"
    assert analysis["observations"][-1]["ndvi_change_from_baseline"]["absolute_change"] == pytest.approx(0.6)
    assert analysis["anomalies"][0]["type"] == "statistical_change"
    assert "cause is undetermined" in analysis["anomalies"][0]["interpretation"]


def test_anomaly_screening_handles_zero_median_absolute_deviation() -> None:
    observations = [
        observation(observed_date, ndvi_value, 0.1)
        for observed_date, ndvi_value in zip(
            ["2020-01-01", "2020-03-01", "2020-06-01", "2020-08-01", "2020-11-01"],
            [0.2, 0.2, 0.2, 0.2, 0.8],
        )
    ]

    analysis = analyze_temporal_evolution(observations)

    assert any(item["date"] == "2020-11-01" for item in analysis["anomalies"])


def test_period_comparison_requires_sufficient_observations() -> None:
    observations = [
        observation("2020-01-01", 0.2, 0.1),
        observation("2020-03-01", 0.3, 0.15),
        observation("2020-08-01", 0.4, 0.2),
        observation("2020-10-01", 0.5, 0.25),
    ]

    comparison = compare_observation_periods(observations)

    assert comparison is not None
    assert comparison["ndvi"]["baseline_mean"] == pytest.approx(0.25)
    assert comparison["ndvi"]["comparison_mean"] == pytest.approx(0.45)
    assert compare_observation_periods(observations[:3]) is None
