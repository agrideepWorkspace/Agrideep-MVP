"""Sentinel-2 Scene Classification Layer cloud and shadow masking."""

from __future__ import annotations

from typing import Any


MASKED_SCL_CLASSES = (0, 1, 3, 7, 8, 9, 10, 11)


def mask_sentinel2_clouds(image: Any, *, ee_module: Any) -> Any:
    """Mask SCL no-data, saturated, shadow, unclassified, cloud, cirrus, snow.

    SCL classes 2, 4, 5, and 6 remain available (dark area, vegetation,
    bare/non-vegetated, and water). Class 3, cloud-shadow; 8/9, medium/high
    probability cloud; and 10, cirrus are cloud obstruction. Class 11 (snow or
    ice) is excluded from vegetation-index calculations but is not counted as
    cloud in orchard cloud-percentage statistics.
    """
    scl = image.select("SCL")
    valid = scl.neq(0)
    for class_value in MASKED_SCL_CLASSES[1:]:
        valid = valid.And(scl.neq(class_value))
    return image.updateMask(valid)
