"""Boundary-only geographic map rendering without fabricated basemap imagery."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as PolygonPatch
from pyproj import CRS, Transformer
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform


def render_orchard_map(geometry: BaseGeometry, destination: Path) -> None:
    """Draw the supplied orchard boundary in its WGS84 coordinate reference."""
    longitude, latitude = geometry.centroid.x, geometry.centroid.y
    local_crs = CRS.from_proj4(
        f"+proj=laea +lat_0={latitude} +lon_0={longitude} "
        "+datum=WGS84 +units=m +no_defs"
    )
    projector = Transformer.from_crs("EPSG:4326", local_crs, always_xy=True)
    projected_geometry = transform(projector.transform, geometry)
    polygons = (
        [projected_geometry]
        if isinstance(projected_geometry, Polygon)
        else list(projected_geometry.geoms)
    )
    figure, axis = plt.subplots(figsize=(7, 5), constrained_layout=True)
    for polygon in polygons:
        exterior = list(polygon.exterior.coords)
        axis.add_patch(
            PolygonPatch(
                exterior,
                closed=True,
                facecolor="#74a889",
                edgecolor="#174d35",
                linewidth=1.8,
                alpha=0.55,
            )
        )
        for interior in polygon.interiors:
            axis.add_patch(
                PolygonPatch(
                    list(interior.coords),
                    closed=True,
                    facecolor="white",
                    edgecolor="#174d35",
                    linewidth=1.2,
                )
            )

    min_x, min_y, max_x, max_y = projected_geometry.bounds
    width = max(max_x - min_x, 1e-5)
    height = max(max_y - min_y, 1e-5)
    x_padding, y_padding = width * 0.12, height * 0.12
    axis.set_xlim(min_x - x_padding, max_x + x_padding)
    axis.set_ylim(min_y - y_padding, max_y + y_padding)
    axis.set_aspect("equal", adjustable="box")
    axis.set_xlabel("Local projected easting (m)")
    axis.set_ylabel("Local projected northing (m)")
    axis.set_title("Supplied orchard boundary (local equal-area view)", loc="left", fontweight="bold")
    axis.grid(color="#dce4df", linestyle="--", linewidth=0.7)
    axis.spines[["top", "right"]].set_visible(False)
    destination.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(destination, dpi=160, facecolor="white")
    plt.close(figure)
