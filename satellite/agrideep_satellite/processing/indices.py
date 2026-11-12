"""Numerically safe vegetation-index calculations for raster arrays."""

from __future__ import annotations

from typing import Any

import numpy as np


def _normalized_difference(
    numerator_left: Any,
    numerator_right: Any,
) -> np.ma.MaskedArray:
    left = np.ma.asarray(numerator_left, dtype=np.float64)
    right = np.ma.asarray(numerator_right, dtype=np.float64)
    left_data, right_data = np.broadcast_arrays(
        np.ma.getdata(left), np.ma.getdata(right)
    )
    left_mask, right_mask = np.broadcast_arrays(
        np.ma.getmaskarray(left), np.ma.getmaskarray(right)
    )
    denominator = left_data + right_data
    valid = (
        ~left_mask
        & ~right_mask
        & np.isfinite(left_data)
        & np.isfinite(right_data)
        & np.isfinite(denominator)
        & (denominator != 0)
    )
    result = np.full(denominator.shape, np.nan, dtype=np.float64)
    np.divide(left_data - right_data, denominator, out=result, where=valid)
    return np.ma.array(result, mask=~valid)


def calculate_ndvi(nir: Any, red: Any) -> np.ma.MaskedArray:
    """Calculate NDVI from Sentinel-2 B8 (10 m) and B4 (10 m)."""
    return _normalized_difference(nir, red)


def calculate_ndmi(nir: Any, swir: Any) -> np.ma.MaskedArray:
    """Calculate NDMI from Sentinel-2 B8 (10 m) and B11 (20 m)."""
    return _normalized_difference(nir, swir)
