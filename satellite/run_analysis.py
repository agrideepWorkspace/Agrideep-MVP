"""CLI entry point compatible with the AgriDeep backend satellite contract."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Sequence

from agrideep_satellite.config import Settings
from agrideep_satellite.exceptions import EngineError
from agrideep_satellite.services.monitoring_service import run_monitoring


def _read_geometry(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise EngineError(
            f"GeoJSON file does not exist: {path}",
            code="invalid_geometry",
        ) from exc
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise EngineError(
            f"Could not read valid GeoJSON from {path}: {exc}",
            code="invalid_geometry",
        ) from exc


def _write_failure(output_path: Path, error: EngineError) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary_path.write_text(
        json.dumps(
            {
                "status": "error",
                "error": {"code": error.code, "message": str(error)},
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(output_path)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Monitor a GeoJSON orchard boundary with Sentinel-2."
    )
    parser.add_argument("--geometry", required=True, type=Path, help="Input GeoJSON.")
    parser.add_argument("--start", required=True, help="Start date (YYYY-MM-DD).")
    parser.add_argument("--end", required=True, help="End date (YYYY-MM-DD).")
    parser.add_argument(
        "--max-cloud",
        type=float,
        default=None,
        help="Maximum orchard cloud/shadow coverage percent (default: configured value).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help=(
            "Output result JSON path; exports are written to a sibling "
            "*_artifacts folder (default: SATELLITE_OUTPUT_DIR/result.json)."
        ),
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    arguments = _build_parser().parse_args(argv)
    output_path = arguments.out or Path("data/output/result.json")
    try:
        geometry = _read_geometry(arguments.geometry)
        settings = Settings.from_env()
        output_path = arguments.out or settings.output_dir / "result.json"
        result = run_monitoring(
            geometry,
            arguments.start,
            arguments.end,
            max_cloud_pct=arguments.max_cloud,
            output_json=output_path,
            settings=settings,
        )
        if result["status"] != "ok":
            return 1
        return 0
    except EngineError as exc:
        logging.getLogger(__name__).error("%s: %s", exc.code, exc)
        try:
            _write_failure(output_path, exc)
        except OSError:
            logging.getLogger(__name__).exception(
                "Could not write failure result to %s", output_path
            )
        return 1
    except OSError as exc:
        logging.getLogger(__name__).exception("Could not write monitoring output")
        try:
            _write_failure(
                output_path,
                EngineError(f"Could not write processing output: {exc}"),
            )
        except OSError:
            logging.getLogger(__name__).exception(
                "Could not write failure result to %s", output_path
            )
        return 1
    except Exception as exc:
        logging.getLogger(__name__).exception("Unexpected satellite processing error")
        try:
            _write_failure(
                output_path,
                EngineError(
                    "Unexpected satellite processing error; see service logs."
                ),
            )
        except OSError:
            logging.getLogger(__name__).exception(
                "Could not write failure result to %s", output_path
            )
        return 1


if __name__ == "__main__":
    sys.exit(main())
