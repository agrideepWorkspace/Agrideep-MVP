from pathlib import Path
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pika

from agrideep_satellite.exceptions import EngineError
from worker import _handle_delivery, process_analysis_message


def _payload() -> dict[str, Any]:
    return {
        "job_id": str(uuid4()),
        "geometry": {"type": "Polygon", "coordinates": []},
        "start_date": "2026-03-01",
        "end_date": "2026-09-01",
        "max_cloud_pct": 20,
    }


def test_worker_publishes_successful_engine_result(tmp_path: Path) -> None:
    payload = _payload()
    events: list[dict[str, Any]] = []
    result = {"status": "ok", "summary": {"ndvi_mean": 0.5}}

    def runner(*args: Any, **kwargs: Any) -> dict[str, Any]:
        assert args[0] == payload["geometry"]
        assert kwargs["output_json"] == tmp_path / payload["job_id"] / "result.json"
        assert kwargs["max_cloud_pct"] == 20
        return result

    process_analysis_message(
        payload,
        publish_event=events.append,
        output_dir=tmp_path,
        runner=runner,
    )

    assert events == [
        {"job_id": payload["job_id"], "status": "RUNNING"},
        {"job_id": payload["job_id"], "status": "COMPLETED", "result": result},
    ]


def test_worker_publishes_no_imagery_as_failure_without_fake_data(tmp_path: Path) -> None:
    payload = _payload()
    events: list[dict[str, Any]] = []
    result = {
        "status": "error",
        "observations": [],
        "error": {"code": "no_imagery", "message": "No scenes available."},
    }

    process_analysis_message(
        payload,
        publish_event=events.append,
        output_dir=tmp_path,
        runner=lambda *args, **kwargs: result,
    )

    assert events[-1]["status"] == "FAILED"
    assert events[-1]["error_code"] == "no_imagery"
    assert events[-1]["result"]["observations"] == []


def test_worker_publishes_engine_errors(tmp_path: Path) -> None:
    payload = _payload()
    events: list[dict[str, Any]] = []

    def runner(*args: Any, **kwargs: Any) -> dict[str, Any]:
        raise EngineError("Earth Engine credentials are not configured.", code="ee_auth_failed")

    process_analysis_message(
        payload,
        publish_event=events.append,
        output_dir=tmp_path,
        runner=runner,
    )

    assert events[-1]["status"] == "FAILED"
    assert events[-1]["error_code"] == "ee_auth_failed"
    assert "credentials" in events[-1]["error_message"]


def test_worker_rejects_invalid_job_id(tmp_path: Path) -> None:
    payload = _payload()
    payload["job_id"] = "..\\outside"

    try:
        process_analysis_message(payload, publish_event=lambda event: None, output_dir=tmp_path)
    except ValueError:
        pass
    else:
        raise AssertionError("Invalid job IDs must not be used for output paths.")


def test_delivery_callback_accepts_pika_callback_arguments() -> None:
    rejected: list[tuple[int, bool]] = []
    channel = SimpleNamespace(
        basic_reject=lambda *, delivery_tag, requeue: rejected.append(
            (delivery_tag, requeue)
        )
    )
    method = SimpleNamespace(delivery_tag=42)

    _handle_delivery(channel, method, pika.BasicProperties(), b"not-json")

    assert rejected == [(42, False)]
