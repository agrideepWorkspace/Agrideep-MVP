"""Spatial index maps rendered only from actual downloaded GeoTIFF data."""

from __future__ import annotations

from pathlib import Path
import re
from datetime import datetime

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import rasterio

_INDEX_STYLES = {
    "ndvi": {"cmap": "RdYlGn", "label": "NDVI"},
    "ndmi": {"cmap": "BrBG", "label": "NDMI"},
}


def render_latest_index_map(
    geotiff_paths: list[Path],
    index_name: str,
    destination: Path,
) -> None:
    """Render the most recent valid GeoTIFF or an explicit unavailable state."""
    if index_name not in _INDEX_STYLES:
        raise ValueError(f"Unsupported index name: {index_name}")

    style = _INDEX_STYLES[index_name]
    figure, axis = plt.subplots(figsize=(7, 5), constrained_layout=True)
    if geotiff_paths:
        latest = max(geotiff_paths, key=lambda path: path.name)
        with rasterio.open(latest) as dataset:
            values = dataset.read(1, masked=True)
            left, bottom, right, top = dataset.bounds
            image = axis.imshow(
                values,
                extent=(left, right, bottom, top),
                origin="upper",
                interpolation="nearest",
                cmap=style["cmap"],
                vmin=-1,
                vmax=1,
            )
            colorbar = figure.colorbar(image, ax=axis, shrink=0.82)
            colorbar.set_label(f"{style['label']} (unitless)")
            is_projected = bool(dataset.crs and dataset.crs.is_projected)
            coordinate_units = dataset.crs.linear_units if is_projected else None
            coordinate_label = (
                f"Projected coordinates ({coordinate_units})"
                if coordinate_units
                else "Geographic or raster coordinates"
            )
        date_match = re.search(r"_(\d{8})_", latest.stem)
        acquisition_date = (
            datetime.strptime(date_match.group(1), "%Y%m%d").date().isoformat()
            if date_match
            else "date not available"
        )
        axis.set_title(
            f"{style['label']} — latest valid acquisition ({acquisition_date})",
            loc="left",
            fontweight="bold",
        )
        axis.set_xlabel(
            f"Easting / x ({coordinate_units})"
            if coordinate_units
            else "Longitude / x (degrees)"
        )
        axis.set_ylabel(
            f"Northing / y ({coordinate_units})"
            if coordinate_units
            else "Latitude / y (degrees)"
        )
        axis.text(
            0.01,
            0.01,
            coordinate_label,
            transform=axis.transAxes,
            fontsize=7,
            color="#55615c",
        )
    else:
        axis.text(
            0.5,
            0.5,
            "No valid index GeoTIFF is available",
            ha="center",
            va="center",
            transform=axis.transAxes,
            color="#55615c",
        )
        axis.set_title(
            f"{style['label']} spatial map", loc="left", fontweight="bold"
        )
        axis.set_axis_off()

    destination.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(destination, dpi=160, facecolor="white")
    plt.close(figure)
