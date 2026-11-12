"""Lazy Earth Engine client initialization."""

from __future__ import annotations

import logging
from typing import Any

from ..authentication import create_earth_engine_credentials
from ..config import Settings
from ..exceptions import EarthEngineAuthenticationError

logger = logging.getLogger(__name__)


def initialize_earth_engine(
    settings: Settings,
    *,
    ee_module: Any | None = None,
) -> Any:
    """Initialize Earth Engine once, using ADC or a configured service account."""
    if ee_module is None:
        try:
            import ee as ee_module
        except ImportError as exc:
            raise EarthEngineAuthenticationError(
                "The Earth Engine Python API is not installed. Install the project "
                "requirements before running satellite monitoring."
            ) from exc

    if not settings.ee_project:
        raise EarthEngineAuthenticationError(
            "EE_PROJECT is required. Set it to the Google Cloud project enabled "
            "for Earth Engine."
        )

    exception_types: tuple[type[Exception], ...] = (OSError, ValueError, RuntimeError)
    ee_exception = getattr(
        getattr(ee_module, "ee_exception", None), "EEException", None
    )
    if isinstance(ee_exception, type):
        exception_types += (ee_exception,)
    try:
        credentials = create_earth_engine_credentials(settings, ee_module)
        ee_module.Initialize(
            credentials=credentials or "persistent",
            project=settings.ee_project,
        )
        data_api = getattr(ee_module, "data", None)
        set_deadline = getattr(data_api, "setDeadline", None)
        if callable(set_deadline):
            set_deadline(settings.request_timeout_seconds * 1000)
    except EarthEngineAuthenticationError:
        raise
    except exception_types as exc:
        logger.error(
            "Earth Engine initialization failed (%s)", type(exc).__name__
        )
        raise EarthEngineAuthenticationError(
            "Earth Engine authentication failed. Configure valid credentials and "
            "verify the Cloud project and account permissions."
        ) from exc

    logger.info("Earth Engine initialized for project %s", settings.ee_project)
    return ee_module
