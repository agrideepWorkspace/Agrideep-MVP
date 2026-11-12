"""Publication-ready time-series plots with explicit empty-data states."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")

import matplotlib.dates as mdates
import matplotlib.pyplot as plt


_INDEX_STYLES = {
    "ndvi": {"color": "#2d6a4f", "label": "NDVI"},
    "ndmi": {"color": "#247ba0", "label": "NDMI"},
}


def render_timeseries_chart(
    observations: list[dict[str, Any]],
    index_name: str,
    destination: Path,
) -> None:
    """Render a valid-observation time series or an honest empty-state chart."""
    if index_name not in _INDEX_STYLES:
        raise ValueError(f"Unsupported index name: {index_name}")

    style = _INDEX_STYLES[index_name]
    points = [
        (date.fromisoformat(item["date"]), item[index_name])
        for item in observations
        if item.get("valid") is True and item.get(index_name) is not None
    ]
    figure, axis = plt.subplots(figsize=(8.5, 3.5), constrained_layout=True)
    if points:
        dates, values = zip(*points)
        axis.plot(
            dates,
            values,
            color=style["color"],
            linewidth=2,
            marker="o",
            markersize=4,
        )
        axis.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
        figure.autofmt_xdate(rotation=25, ha="right")
    else:
        axis.text(
            0.5,
            0.5,
            "No valid observations in this period",
            ha="center",
            va="center",
            transform=axis.transAxes,
            color="#55615c",
        )

    axis.set_title(f"{style['label']} time series", loc="left", fontweight="bold")
    axis.set_xlabel("Observation date")
    axis.set_ylabel(f"{style['label']} (unitless)")
    axis.set_ylim(-1.05, 1.05)
    axis.grid(axis="y", color="#dce4df", linestyle="--", linewidth=0.7)
    axis.spines[["top", "right"]].set_visible(False)
    destination.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(destination, dpi=160, facecolor="white")
    plt.close(figure)
