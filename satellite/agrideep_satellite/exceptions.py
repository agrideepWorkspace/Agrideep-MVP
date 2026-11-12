"""Typed errors exposed by the satellite processing engine."""


class EngineError(Exception):
    """An expected processing failure with a stable integration error code."""

    code = "unknown"

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        if code is not None:
            self.code = code


class GeometryValidationError(EngineError):
    """Invalid or unsupported orchard GeoJSON."""

    code = "invalid_geometry"


class ParameterValidationError(EngineError):
    """Invalid date range or processing parameter."""

    code = "invalid_parameters"


class AreaOutOfRangeError(EngineError):
    """Orchard area falls outside configured processing limits."""

    code = "area_out_of_range"


class EarthEngineAuthenticationError(EngineError):
    """Earth Engine credentials or project initialization are unavailable."""

    code = "ee_auth_failed"


class SatelliteProcessingError(EngineError):
    """Earth Engine processing failed for a reason other than authentication."""

    code = "processing_error"


class NoImageryError(EngineError):
    """No qualifying Sentinel-2 observations were found."""

    code = "no_imagery"
