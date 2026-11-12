"""Earth Engine credential construction without embedding credentials."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .config import Settings
from .exceptions import EarthEngineAuthenticationError


def create_earth_engine_credentials(
    settings: Settings,
    ee_module: Any,
) -> Any | None:
    """Create service-account credentials or defer to Application Default."""
    email = settings.ee_service_account
    key_path: Path | None = settings.ee_private_key_path
    if bool(email) != bool(key_path):
        raise EarthEngineAuthenticationError(
            "Set both EE_SERVICE_ACCOUNT and EE_PRIVATE_KEY_PATH, or neither."
        )
    if email and key_path:
        if not key_path.is_file():
            raise EarthEngineAuthenticationError(
                f"Earth Engine private key file does not exist: {key_path}"
            )
        try:
            return ee_module.ServiceAccountCredentials(email, key_file=str(key_path))
        except (OSError, TypeError, ValueError) as exc:
            raise EarthEngineAuthenticationError(
                f"Could not load Earth Engine service-account key: {exc}"
            ) from exc
    return None
