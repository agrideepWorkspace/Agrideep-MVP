"""Centralized environment-backed engine configuration."""

from __future__ import annotations

import math
import os
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

from .exceptions import ParameterValidationError


@dataclass(frozen=True)
class Settings:
    """Runtime configuration; secrets are read from files or environment only."""

    ee_project: str | None = None
    ee_service_account: str | None = None
    ee_private_key_path: Path | None = None
    output_dir: Path = Path("data/output")
    default_max_cloud_pct: float = 20.0
    min_area_ha: float = 0.1
    max_area_ha: float = 500.0
    max_period_months: int = 12
    earliest_date: date = date(2017, 3, 28)
    processing_scale_m: int = 20
    tile_scale: int = 4
    request_timeout_seconds: int = 120

    def __post_init__(self) -> None:
        if (
            not math.isfinite(self.default_max_cloud_pct)
            or not 0 <= self.default_max_cloud_pct <= 100
        ):
            raise ParameterValidationError(
                "SATELLITE_MAX_CLOUD_PCT must be between 0 and 100."
            )
        if (
            not math.isfinite(self.min_area_ha)
            or not math.isfinite(self.max_area_ha)
            or self.min_area_ha < 0
            or self.max_area_ha <= self.min_area_ha
        ):
            raise ParameterValidationError(
                "Configured orchard area limits must be positive and increasing."
            )
        if self.max_period_months < 1:
            raise ParameterValidationError(
                "SATELLITE_MAX_PERIOD_MONTHS must be a positive integer."
            )
        if (
            self.processing_scale_m < 1
            or self.tile_scale < 1
            or self.request_timeout_seconds < 1
        ):
            raise ParameterValidationError(
                "Processing scale, tile scale, and timeout must be positive integers."
            )

    @classmethod
    def from_env(cls, *, env_file: Path | None = None) -> Settings:
        """Load settings from environment variables and an optional .env file."""
        if env_file is not None:
            load_dotenv(env_file, override=False)
        else:
            load_dotenv(override=False)

        private_key = os.getenv("EE_PRIVATE_KEY_PATH")
        try:
            default_cloud = float(os.getenv("SATELLITE_MAX_CLOUD_PCT", "20"))
            min_area = float(os.getenv("SATELLITE_MIN_AREA_HA", "0.1"))
            max_area = float(os.getenv("SATELLITE_MAX_AREA_HA", "500"))
            max_months = int(os.getenv("SATELLITE_MAX_PERIOD_MONTHS", "12"))
            scale = int(os.getenv("SATELLITE_PROCESSING_SCALE_M", "20"))
            timeout = int(os.getenv("SATELLITE_REQUEST_TIMEOUT_SECONDS", "120"))
        except ValueError as exc:
            raise ParameterValidationError(
                "Satellite numeric environment settings must contain valid numbers."
            ) from exc

        earliest_text = os.getenv("SATELLITE_EARLIEST_DATE", "2017-03-28")
        try:
            earliest = date.fromisoformat(earliest_text)
        except ValueError as exc:
            raise ParameterValidationError(
                "SATELLITE_EARLIEST_DATE must use YYYY-MM-DD."
            ) from exc
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", earliest_text):
            raise ParameterValidationError(
                "SATELLITE_EARLIEST_DATE must use YYYY-MM-DD."
            )

        return cls(
            ee_project=os.getenv("EE_PROJECT") or None,
            ee_service_account=os.getenv("EE_SERVICE_ACCOUNT") or None,
            ee_private_key_path=Path(private_key).expanduser() if private_key else None,
            output_dir=Path(os.getenv("SATELLITE_OUTPUT_DIR", "data/output")),
            default_max_cloud_pct=default_cloud,
            min_area_ha=min_area,
            max_area_ha=max_area,
            max_period_months=max_months,
            earliest_date=earliest,
            processing_scale_m=scale,
            request_timeout_seconds=timeout,
        )
